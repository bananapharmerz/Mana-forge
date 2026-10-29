import "server-only";

import { findAlmostCombos } from "@/lib/commanderSpellbook";
import { cardImage, cardPriceUsd, getCardsByNames } from "@/lib/scryfall";
import { topCommandersThisMonth } from "@/lib/topCommanders";

// "Combo pieces to watch" on /prices. When a popular commander turns an old card into half of a
// two-card combo, that card tends to move once players notice. So for this month's 10 most-built
// commanders (EDHREC's list, which the site already reads), ask Commander Spellbook which combos
// are one card away with just the commander, and list that missing card with today's price.
// It's a "here's what to keep an eye on" list, never a prediction or buying advice.

export interface ComboPiece {
  name: string;
  scryfallId: string;
  imageUrl?: string;
  usd: number | null;
  commander: string; // the commander page to link
  produces: string[]; // what the combo does, e.g. ["Infinite lifeloss"]
}

const DAY_MS = 24 * 60 * 60 * 1000;
const RETRY_MS = 60 * 60 * 1000; // after a failure, try again in an hour rather than every visit
const HARD_TIMEOUT_MS = 15000;
const MAX_PIECES = 8;

let cache: { at: number; ttl: number; pieces: ComboPiece[] } | null = null;
let inFlight: Promise<ComboPiece[]> | null = null;

async function build(): Promise<ComboPiece[]> {
  const top = await topCommandersThisMonth(10);
  // Partner pairs come as "A // B": both halves are commanders for Spellbook.
  const results = await Promise.all(
    top.map(async (c) => ({ c, combos: await findAlmostCombos(c.name.split(" // "), []) })),
  );
  // One card per row, from the most-built commander first; only combos missing a single card.
  const picked = new Map<string, { commander: string; produces: string[] }>();
  for (const { c, combos } of results) {
    for (const combo of combos) {
      if (combo.missing.length !== 1) continue;
      const name = combo.missing[0];
      if (!picked.has(name)) picked.set(name, { commander: c.page, produces: combo.produces.slice(0, 2) });
      break; // one piece per commander keeps the strip varied
    }
  }
  const cards = await getCardsByNames([...picked.keys()]);
  const byName = new Map(cards.map((card) => [card.name.toLowerCase(), card]));
  const out: ComboPiece[] = [];
  for (const [name, info] of picked) {
    const card = byName.get(name.toLowerCase());
    if (!card) continue;
    out.push({ name: card.name, scryfallId: card.id, imageUrl: cardImage(card), usd: cardPriceUsd(card), ...info });
    if (out.length >= MAX_PIECES) break;
  }
  return out;
}

export async function comboPiecesToWatch(): Promise<ComboPiece[]> {
  if (cache && Date.now() - cache.at < cache.ttl) return cache.pieces;
  // Several visitors at once share one lookup instead of each calling Spellbook ten times.
  inFlight ??= Promise.race([
    build(),
    new Promise<ComboPiece[]>((_, reject) => setTimeout(() => reject(new Error("timeout")), HARD_TIMEOUT_MS)),
  ])
    .then((pieces) => {
      cache = { at: Date.now(), ttl: pieces.length ? DAY_MS : RETRY_MS, pieces };
      return pieces;
    })
    .catch(() => {
      // Spellbook or EDHREC down: the strip just hides itself.
      cache = { at: Date.now(), ttl: RETRY_MS, pieces: [] };
      return [];
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}
