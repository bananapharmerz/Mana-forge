import type { CardPool, DeckCard } from "@/lib/deckTypes";

// Client-safe helpers for showing tracked prices (src/lib/prices.ts) next to cards and decks.

export interface LivePriceInfo {
  usd: number | null;
  usdFoil: number | null;
  weekAgoUsd: number | null;
  updatedAt: number;
}
export type LivePriceMap = Record<string, LivePriceInfo>;

// Today's price for a card: the tracked one when we have it, else what it cost when it was added.
export function currentPrice(c: DeckCard, live: LivePriceMap): number | null {
  const p = live[c.scryfallId];
  if (p) return p.usd ?? p.usdFoil ?? (typeof c.priceUsd === "number" ? c.priceUsd : null);
  return typeof c.priceUsd === "number" ? c.priceUsd : null;
}

export function weekChange(c: DeckCard, live: LivePriceMap): { change: number; pct: number } | null {
  const p = live[c.scryfallId];
  if (!p || p.usd === null || p.weekAgoUsd === null || p.weekAgoUsd === 0) return null;
  const change = p.usd - p.weekAgoUsd;
  return { change, pct: change / p.weekAgoUsd };
}

export interface DeckValue {
  totalUsd: number;
  weekAgoUsd: number; // same cards, last week's prices (cards without history count at today's)
  missingPriceCount: number;
  movers: { card: DeckCard; change: number; pct: number }[]; // biggest $ moves in this deck
  updatedAt: number;
}

export function deckValue(deck: CardPool, live: LivePriceMap): DeckValue {
  const all = [deck.commander, deck.partner, deck.companion].filter((c): c is DeckCard => !!c).concat(deck.cards);
  let totalUsd = 0;
  let weekAgoUsd = 0;
  let missingPriceCount = 0;
  let updatedAt = 0;
  const movers: DeckValue["movers"] = [];
  for (const c of all) {
    const now = currentPrice(c, live);
    if (now === null) {
      missingPriceCount += c.quantity;
      continue;
    }
    totalUsd += now * c.quantity;
    const wc = weekChange(c, live);
    weekAgoUsd += (wc ? now - wc.change : now) * c.quantity;
    if (wc && Math.abs(wc.change) >= 0.25) movers.push({ card: c, change: wc.change * c.quantity, pct: wc.pct });
    updatedAt = Math.max(updatedAt, live[c.scryfallId]?.updatedAt ?? 0);
  }
  movers.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  return { totalUsd, weekAgoUsd, missingPriceCount, movers: movers.slice(0, 5), updatedAt };
}

export const usd = (n: number) => `$${n.toFixed(2)}`;
export const signedUsd = (n: number) => `${n >= 0 ? "+" : "−"}$${Math.abs(n).toFixed(2)}`;
export const signedPct = (p: number) => `${p >= 0 ? "+" : "−"}${Math.abs(p * 100).toFixed(p !== 0 && Math.abs(p) < 0.1 ? 1 : 0)}%`;
