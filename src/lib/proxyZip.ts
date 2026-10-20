// "Download card images": one full-size image per card in the proxy project, zipped, for people who
// print at a copy shop, upload to a print-on-demand site or use a virtual tabletop. Built in the
// browser like the PDF (see proxyPdf.ts). Images are passed through untouched.

import type { ProxyCard } from "@/lib/proxyTypes";
import { printQualityUrl } from "@/lib/proxyPdf";

export interface ProxyZipResult {
  blob: Blob;
  files: number;
  failed: string[];
}

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

function safeName(s: string): string {
  return s.replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, " ").trim().slice(0, 80) || "card";
}

export async function buildProxyZip(
  cards: ProxyCard[],
  opts: {
    includeBacks?: boolean;
    cardBack?: { url: string } | null;
    onProgress?: (done: number, total: number) => void;
  }
): Promise<ProxyZipResult> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();

  // One file per printing; the quantity goes in the file name ("3x Sol Ring.jpg").
  const jobs = cards
    .filter((c) => c.quantity > 0)
    .flatMap((c, i) => {
      const n = String(i + 1).padStart(3, "0");
      const base = `${n} ${c.quantity}x ${safeName(c.name)}${c.setName ? ` (${safeName(c.setName)})` : ""}`;
      const list = [{ name: base, label: c.name, url: c.imageUrl }];
      if (opts.includeBacks && c.backImageUrl && !c.isCustomArt) list.push({ name: `${base} - back`, label: `${c.name} (back)`, url: c.backImageUrl });
      return list;
    });
  if (opts.cardBack) jobs.unshift({ name: "000 card back", label: "Card back", url: opts.cardBack.url });

  const failed: string[] = [];
  let done = 0;
  let next = 0;
  opts.onProgress?.(0, jobs.length);
  async function worker() {
    while (next < jobs.length) {
      const job = jobs[next++];
      try {
        if (!job.url) throw new Error("No image");
        const res = await fetch(printQualityUrl(job.url), { mode: "cors" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        zip.file(`${job.name}.${EXT[blob.type] ?? "jpg"}`, await blob.arrayBuffer());
      } catch {
        failed.push(job.label);
      }
      opts.onProgress?.(++done, jobs.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(6, jobs.length) }, worker));

  zip.file(
    "README.txt",
    "Card images from Mana Forge (manaforgehub.com) for playtesting - not for sale.\r\n" +
      "Each file name starts with how many copies to print. Card size: 63 x 88 mm.\r\n" +
      "Card images via Scryfall. Magic: The Gathering is (c) Wizards of the Coast.\r\n"
  );
  // Images are already compressed, so storing them is as small as zipping and much faster.
  const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
  return { blob, files: jobs.length - failed.length, failed };
}
