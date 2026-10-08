// Cleans everything the browser sends before it's stored or shown to other people. Card data
// comes from Scryfall, so card fields are trimmed to sane lengths, images must be Scryfall
// images (or a small uploaded picture for custom art), and lists are capped. Anything that
// doesn't fit is dropped rather than trusted.

import type { DeckCard } from "@/lib/deckTypes";

export const MAX_DECK_CARDS = 300; // distinct entries in one deck
export const MAX_COPIES = 99;
export const MAX_UPLOAD_CHARS = 3_000_000; // ~2.2 MB image as a data URL

export const text = (v: unknown, max: number): string =>
  String(v ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const int = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/** A Scryfall image URL, or undefined. */
export function scryfallImage(v: unknown): string | undefined {
  if (typeof v !== "string" || v.length > 500) return undefined;
  try {
    const u = new URL(v);
    if (u.protocol !== "https:") return undefined;
    return /(^|\.)scryfall\.(io|com)$/.test(u.hostname) ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** An uploaded picture as a data URL (PNG, JPEG, WebP or GIF only, no SVG), or undefined. */
export function uploadedImage(v: unknown, maxChars = MAX_UPLOAD_CHARS): string | undefined {
  if (typeof v !== "string" || v.length > maxChars) return undefined;
  return /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(v) ? v : undefined;
}

const SCRYFALL_ID = /^[0-9a-f-]{8,40}$/i;
const COLORS = new Set(["W", "U", "B", "R", "G", "C"]);

export function cleanDeckCard(v: unknown): DeckCard | null {
  if (!v || typeof v !== "object") return null;
  const c = v as Record<string, unknown>;
  const name = text(c.name, 150);
  const scryfallId = text(c.scryfallId, 40);
  if (!name || !SCRYFALL_ID.test(scryfallId)) return null;
  const price = Number(c.priceUsd);
  return {
    name,
    scryfallId,
    imageUrl: scryfallImage(c.imageUrl),
    backImageUrl: scryfallImage(c.backImageUrl),
    typeLine: text(c.typeLine, 120),
    manaCost: c.manaCost === undefined ? undefined : text(c.manaCost, 60),
    cmc: Math.min(99, Math.max(0, Number(c.cmc) || 0)),
    colorIdentity: Array.isArray(c.colorIdentity) ? c.colorIdentity.map(String).filter((x) => COLORS.has(x)).slice(0, 6) : [],
    quantity: int(c.quantity, 1, MAX_COPIES, 1),
    category: text(c.category, 40) || "Other",
    priceUsd: Number.isFinite(price) && price >= 0 && price < 1_000_000 ? price : null,
  };
}

export function cleanDeckCards(v: unknown, max = MAX_DECK_CARDS): DeckCard[] | null {
  if (!Array.isArray(v) || v.length > max) return null;
  const out: DeckCard[] = [];
  for (const x of v) {
    const c = cleanDeckCard(x);
    if (c) out.push(c);
  }
  return out;
}

/** A card back: one of the built-in styles, a Scryfall image, or a small uploaded picture. */
export function cleanCardBack(v: unknown, presets: readonly string[]): string | null {
  if (typeof v !== "string") return null;
  if (presets.includes(v)) return v;
  return scryfallImage(v) ?? uploadedImage(v) ?? null;
}

/** A card for a game room (library, commander, tokens). */
export function cleanPlayCard(v: unknown): { scryfallId: string; name: string; imageUrl?: string; backImageUrl?: string } | null {
  if (!v || typeof v !== "object") return null;
  const c = v as Record<string, unknown>;
  const name = text(c.name, 150);
  const scryfallId = text(c.scryfallId, 60);
  if (!name || !scryfallId) return null;
  return { scryfallId, name, imageUrl: scryfallImage(c.imageUrl) ?? uploadedImage(c.imageUrl), backImageUrl: scryfallImage(c.backImageUrl) };
}

export function cleanPlayCards(v: unknown, max: number) {
  if (!Array.isArray(v)) return [];
  return v
    .slice(0, max)
    .map(cleanPlayCard)
    .filter((x): x is NonNullable<ReturnType<typeof cleanPlayCard>> => !!x);
}
