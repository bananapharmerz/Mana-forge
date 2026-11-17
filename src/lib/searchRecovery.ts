// What to offer when a /commanders search finds nothing, so a typo ("Atraxia") or a card that
// isn't a commander ("Sol Ring") doesn't end on a dead end. Everything comes from data the server
// already has: the in-memory commander list, the tracked prices in CardPrice and the cached
// EDHREC popular list. No new Scryfall requests, and the query is never logged.

import { db } from "@/lib/db";
import { commanderNames } from "@/lib/commanderIndex";
import { topCommandersThisMonth } from "@/lib/topCommanders";

export interface SearchRecovery {
  didYouMean: string[]; // commander names, best guess first
  card: { name: string; id: string } | null; // a non-commander card with a price page
  popular: string[]; // commander names to link when nothing else fits
}

const MAX_SUGGESTIONS = 5;

// Plain names only: Scryfall syntax ("t:dragon", "o:draw") isn't a typo we can guess at.
const PLAIN = /^[\p{L}\p{N} ,'\-]+$/u;

function clean(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, 60);
}

// Edit distance with an early exit once every cell in a row is past the limit.
function distance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      row.push(v);
      if (v < best) best = v;
    }
    if (best > limit) return limit + 1;
    prev = row;
  }
  return prev[b.length];
}

// "Atraxa, Praetors' Voice" is usually searched as "atraxa", so the part before the comma counts too.
export function closeCommanderNames(raw: string, names: string[] = commanderNames()): string[] {
  const q = clean(raw).toLowerCase();
  if (q.length < 3 || !PLAIN.test(q)) return [];
  const limit = q.length <= 5 ? 1 : q.length <= 10 ? 2 : 3;
  const scored: { name: string; d: number; i: number }[] = [];
  names.forEach((name, i) => {
    const full = name.toLowerCase();
    const short = full.split(",")[0];
    const d = Math.min(distance(q, full, limit), distance(q, short, limit));
    if (d <= limit) scored.push({ name, d, i });
  });
  // Closest first; the list is ordered most played first, so ties go to the popular one.
  return scored
    .sort((a, b) => a.d - b.d || a.i - b.i)
    .slice(0, MAX_SUGGESTIONS)
    .map((s) => s.name);
}

async function cardWithPricePage(raw: string): Promise<SearchRecovery["card"]> {
  const q = clean(raw);
  if (q.length < 3 || !PLAIN.test(q)) return null;
  try {
    // contains is a case-insensitive LIKE in SQLite; keep only an exact name match.
    const rows = await db.cardPrice.findMany({
      where: { name: { contains: q } },
      orderBy: { usd: "desc" },
      select: { scryfallId: true, name: true },
      take: 20,
    });
    const hit = rows.find((r) => r.name.toLowerCase() === q.toLowerCase());
    return hit ? { name: hit.name, id: hit.scryfallId } : null;
  } catch {
    return null;
  }
}

async function popularNames(): Promise<string[]> {
  // The same cached list /commanders/popular shows; a slow EDHREC never holds up the page.
  const top = await Promise.race([
    topCommandersThisMonth(6).catch(() => []),
    new Promise<never[]>((r) => setTimeout(() => r([]), 2500)),
  ]);
  return top.map((c) => c.page);
}

export async function searchRecovery(raw: string): Promise<SearchRecovery> {
  const [card, popular] = await Promise.all([cardWithPricePage(raw), popularNames()]);
  return { didYouMean: closeCommanderNames(raw), card, popular };
}
