import type { DeckCard } from "@/lib/deckTypes";

// "Rising / falling" cards for a commander, from Mana Forge's own public decks only: how often
// each card shows up in decks built in the last `days` days versus decks built before that.
// Needs a few decks on both sides, otherwise there's nothing honest to say and it returns null.

export interface TrendCard {
  name: string;
  imageUrl?: string;
  recentPct: number; // share of recent decks that run it (0-1)
  olderPct: number;
  delta: number; // recentPct - olderPct
}

const BASICS = new Set(["plains", "island", "swamp", "mountain", "forest", "wastes", "snow-covered plains", "snow-covered island", "snow-covered swamp", "snow-covered mountain", "snow-covered forest"]);

export function cardTrends(
  decks: { cards: string; createdAt: Date }[],
  opts: { days?: number; minEach?: number; limit?: number; now?: number } = {}
): { rising: TrendCard[]; falling: TrendCard[]; recentDecks: number; olderDecks: number; days: number } | null {
  const days = opts.days ?? 30;
  const minEach = opts.minEach ?? 3;
  const limit = opts.limit ?? 5;
  const cutoff = (opts.now ?? Date.now()) - days * 86400000;

  const recent = new Map<string, number>();
  const older = new Map<string, number>();
  const images = new Map<string, string>();
  let nRecent = 0;
  let nOlder = 0;
  for (const d of decks) {
    let cards: DeckCard[];
    try {
      cards = JSON.parse(d.cards) as DeckCard[];
    } catch {
      continue;
    }
    const isRecent = d.createdAt.getTime() >= cutoff;
    if (isRecent) nRecent++;
    else nOlder++;
    const bucket = isRecent ? recent : older;
    const seen = new Set<string>();
    for (const c of cards) {
      if (!c?.name || c.category === "Tokens") continue;
      const key = c.name;
      if (BASICS.has(key.toLowerCase()) || seen.has(key)) continue;
      seen.add(key);
      bucket.set(key, (bucket.get(key) ?? 0) + 1);
      if (c.imageUrl && (isRecent || !images.has(key))) images.set(key, c.imageUrl);
    }
  }
  if (nRecent < minEach || nOlder < minEach) return null;

  const names = new Set([...recent.keys(), ...older.keys()]);
  const rows: TrendCard[] = [];
  for (const name of names) {
    const r = recent.get(name) ?? 0;
    const o = older.get(name) ?? 0;
    if (r + o < 2) continue; // one deck isn't a trend
    const recentPct = r / nRecent;
    const olderPct = o / nOlder;
    rows.push({ name, imageUrl: images.get(name), recentPct, olderPct, delta: recentPct - olderPct });
  }
  const MIN_DELTA = 0.15; // at least 15 percentage points, so small wobbles don't show
  return {
    rising: rows.filter((t) => t.delta >= MIN_DELTA).sort((a, b) => b.delta - a.delta).slice(0, limit),
    falling: rows.filter((t) => t.delta <= -MIN_DELTA).sort((a, b) => a.delta - b.delta).slice(0, limit),
    recentDecks: nRecent,
    olderDecks: nOlder,
    days,
  };
}
