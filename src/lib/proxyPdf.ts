// Print-at-home proxy sheets: builds a print-ready PDF in the browser from the proxy project.
//
// Everything runs client-side. Scryfall's CDN refuses Node's server-side fetch but serves browsers
// (see next.config.ts), and building in the browser also keeps a 100-card PDF off our server.
//
// Cards are placed at real size (63 × 88 mm) in a 3 × 3 grid with crop marks, so a page printed at
// "Actual size" / 100 % gives cards that fit standard sleeves. Images are never cropped, recoloured
// or watermarked (Scryfall's image guidelines); custom art the user uploaded is fitted to the card
// shape.

import { PDFDocument, StandardFonts, degrees, rgb, type PDFImage, type PDFPage } from "pdf-lib";
import type { ProxyCard } from "@/lib/proxyTypes";

export type PaperSize = "a4" | "letter";
export type CardSpacing = "none" | "gap";

const MM = 72 / 25.4; // points per millimetre
const PAPER: Record<PaperSize, [number, number]> = {
  a4: [210 * MM, 297 * MM],
  letter: [8.5 * 72, 11 * 72],
};
const CARD_W = 63 * MM;
const CARD_H = 88 * MM;
const COLS = 3;
const ROWS = 3;
// 2 mm is the most that still fits 3 rows on US Letter with room for the crop marks.
const GAP = { none: 0, gap: 2 * MM } as const;
const MARK_LEN = 4 * MM;
const MARK_OFFSET = 1.5 * MM;
const FETCH_CONCURRENCY = 6;

export interface ProxyPdfOptions {
  paper: PaperSize;
  spacing: CardSpacing;
  /** Premium: also print each double-faced card's back face (flip art). */
  includeBacks?: boolean;
  /**
   * Card back for double-sided printing. When set, every front page is followed by a page of backs
   * in the same positions as the fronts. A double-faced card gets
   * its own flip art on the reverse instead (when includeBacks is on), making a true two-sided card.
   */
  cardBack?: { url: string; custom: boolean } | null;
  onProgress?: (done: number, total: number) => void;
}

export interface ProxyPdfResult {
  bytes: Uint8Array;
  pages: number;
  cards: number;
  /** Names of cards whose image couldn't be loaded (printed as a labelled blank instead). */
  failed: string[];
}

/** Scryfall's sharpest full-card JPG ("large", 672 × 936) for a stored image URL. */
export function printQualityUrl(url: string): string {
  if (!url.startsWith("https://cards.scryfall.io/")) return url;
  return url.replace(/\/(border_crop|normal|small)\//, "/large/");
}

async function blobToJpegCover(blob: Blob): Promise<Uint8Array> {
  // Fits any image to the card shape (centre crop) and re-encodes it as JPEG, for uploads in
  // formats the PDF can't embed directly (webp, gif…) or with a non-card aspect ratio.
  const bitmap = await createImageBitmap(blob);
  const targetW = 744;
  const targetH = 1039; // 63 × 88 mm at ~300 dpi
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  const scale = Math.max(targetW / bitmap.width, targetH / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(bitmap, (targetW - w) / 2, (targetH - h) / 2, w, h);
  bitmap.close();
  const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  if (!out) throw new Error("Couldn't encode image");
  return new Uint8Array(await out.arrayBuffer());
}

// One printed card slot: a front, or (Premium) the back face of a double-faced card.
interface Slot {
  key: string;
  name: string;
  url?: string;
  custom: boolean;
}

async function loadImage(doc: PDFDocument, slot: Slot): Promise<PDFImage> {
  if (!slot.url) throw new Error("No image");
  const res = await fetch(printQualityUrl(slot.url), { mode: "cors" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  if (!slot.custom && blob.type === "image/jpeg") return doc.embedJpg(new Uint8Array(await blob.arrayBuffer()));
  if (!slot.custom && blob.type === "image/png") return doc.embedPng(new Uint8Array(await blob.arrayBuffer()));
  return doc.embedJpg(await blobToJpegCover(blob));
}

function drawCropMarks(page: PDFPage, xs: number[], ys: number[], grid: { left: number; right: number; bottom: number; top: number }) {
  const line = { thickness: 0.4, color: rgb(0.45, 0.45, 0.45) };
  for (const x of xs) {
    page.drawLine({ start: { x, y: grid.top + MARK_OFFSET }, end: { x, y: grid.top + MARK_OFFSET + MARK_LEN }, ...line });
    page.drawLine({ start: { x, y: grid.bottom - MARK_OFFSET }, end: { x, y: grid.bottom - MARK_OFFSET - MARK_LEN }, ...line });
  }
  for (const y of ys) {
    page.drawLine({ start: { x: grid.left - MARK_OFFSET, y }, end: { x: grid.left - MARK_OFFSET - MARK_LEN, y }, ...line });
    page.drawLine({ start: { x: grid.right + MARK_OFFSET, y }, end: { x: grid.right + MARK_OFFSET + MARK_LEN, y }, ...line });
  }
}

interface PrintCard {
  front: Slot;
  /** What goes on the reverse when printing double-sided. */
  reverse?: Slot;
}

export async function buildProxyPdf(cards: ProxyCard[], opts: ProxyPdfOptions): Promise<ProxyPdfResult> {
  const front = (c: ProxyCard): Slot => ({ key: c.scryfallId, name: c.name, url: c.imageUrl, custom: !!c.isCustomArt });
  const flip = (c: ProxyCard): Slot => ({ key: `${c.scryfallId}:back`, name: `${c.name} (back)`, url: c.backImageUrl, custom: false });
  const hasFlip = (c: ProxyCard) => !!(opts.includeBacks && c.backImageUrl && !c.isCustomArt);
  const backSlot: Slot | null = opts.cardBack
    ? { key: "card-back", name: "Card back", url: opts.cardBack.url, custom: opts.cardBack.custom }
    : null;
  const duplex = !!backSlot;

  // Double-sided: one card per copy, flip art (or the card back) on its reverse.
  // Single-sided: flip art prints as its own card right after the front.
  const flat: PrintCard[] = cards.flatMap((c) =>
    Array.from({ length: c.quantity }, (): PrintCard[] =>
      duplex
        ? [{ front: front(c), reverse: hasFlip(c) ? flip(c) : backSlot! }]
        : hasFlip(c)
          ? [{ front: front(c) }, { front: flip(c) }]
          : [{ front: front(c) }]
    ).flat()
  );

  const doc = await PDFDocument.create();
  doc.setTitle("Mana Forge proxy sheets");
  doc.setCreator("Mana Forge (manaforgehub.com)");
  doc.setProducer("Mana Forge");
  const font = await doc.embedFont(StandardFonts.Helvetica);

  // Load each distinct image once, a few at a time.
  const uniqueMap = new Map<string, Slot>();
  for (const pc of flat) {
    uniqueMap.set(pc.front.key, pc.front);
    if (pc.reverse) uniqueMap.set(pc.reverse.key, pc.reverse);
  }
  const unique = [...uniqueMap.values()];
  const images = new Map<string, PDFImage | null>();
  const failed: string[] = [];
  let done = 0;
  opts.onProgress?.(0, unique.length);
  let next = 0;
  async function worker() {
    while (next < unique.length) {
      const slot = unique[next++];
      try {
        images.set(slot.key, await loadImage(doc, slot));
      } catch {
        images.set(slot.key, null);
        failed.push(slot.name);
      }
      opts.onProgress?.(++done, unique.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(FETCH_CONCURRENCY, unique.length) }, worker));

  const [pageW, pageH] = PAPER[opts.paper];
  const gap = GAP[opts.spacing];
  const gridW = COLS * CARD_W + (COLS - 1) * gap;
  const gridH = ROWS * CARD_H + (ROWS - 1) * gap;
  const left = (pageW - gridW) / 2;
  const bottom = (pageH - gridH) / 2;
  const grid = { left, right: left + gridW, bottom, top: bottom + gridH };

  // Crop-mark positions: every card edge (shared edges collapse when there's no gap).
  const xs = [...new Set(Array.from({ length: COLS }, (_, c) => [left + c * (CARD_W + gap), left + c * (CARD_W + gap) + CARD_W]).flat().map((v) => v.toFixed(2)))].map(Number);
  const ys = [...new Set(Array.from({ length: ROWS }, (_, r) => [bottom + r * (CARD_H + gap), bottom + r * (CARD_H + gap) + CARD_H]).flat().map((v) => v.toFixed(2)))].map(Number);

  function drawSlot(page: PDFPage, slot: Slot, col: number, row: number) {
    const x = left + col * (CARD_W + gap);
    const y = grid.top - (row + 1) * CARD_H - row * gap; // fill from the top row down
    const img = images.get(slot.key);
    if (img) {
      page.drawImage(img, { x, y, width: CARD_W, height: CARD_H });
    } else {
      page.drawRectangle({ x, y, width: CARD_W, height: CARD_H, borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 0.6 });
      const label = slot.name.length > 34 ? `${slot.name.slice(0, 33)}...` : slot.name;
      page.drawText(label, { x: x + 4 * MM, y: y + CARD_H / 2, size: 9, font, color: rgb(0.3, 0.3, 0.3) });
    }
  }

  const perPage = COLS * ROWS;
  const sheetCount = Math.max(1, Math.ceil(flat.length / perPage));
  for (let p = 0; p < sheetCount; p++) {
    const slice = flat.slice(p * perPage, (p + 1) * perPage);
    const page = doc.addPage([pageW, pageH]);
    slice.forEach((pc, i) => drawSlot(page, pc.front, i % COLS, Math.floor(i / COLS)));
    drawCropMarks(page, xs, ys, grid);
    const sides = duplex ? " Print double-sided." : "";
    const note = `Mana Forge playtest proxies - not for sale. Print at 100% / actual size.${sides} Card images via Scryfall; Magic: The Gathering is (c) Wizards of the Coast.   Sheet ${p + 1} of ${sheetCount}`;
    // Runs up the left margin, clear of the crop marks, so it fits on both paper sizes.
    const noteSize = 6;
    const noteX = left - MARK_OFFSET - MARK_LEN - 1.5 * MM;
    const noteWidth = font.widthOfTextAtSize(note, noteSize);
    page.drawText(note, { x: noteX, y: bottom + Math.max(0, (gridH - noteWidth) / 2), size: noteSize, font, color: rgb(0.45, 0.45, 0.45), rotate: degrees(90), maxWidth: gridH });

    if (duplex) {
      // The reverse page: each back in the same grid position as its front.
      const backPage = doc.addPage([pageW, pageH]);
      slice.forEach((pc, i) => {
        if (pc.reverse) drawSlot(backPage, pc.reverse, i % COLS, Math.floor(i / COLS));
      });
    }
  }

  return { bytes: await doc.save(), pages: doc.getPageCount(), cards: flat.length, failed };
}
