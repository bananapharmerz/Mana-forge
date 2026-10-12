// Budget lists for the "budget commanders" and "budget staples" pages: the most-played cards
// (Scryfall's EDHREC ranking) under a price cap, straight from Scryfall's search so the
// prices are the same TCGplayer market prices the rest of the site shows. Searches are
// cached for an hour by searchCards, so crawlers and visitors don't add Scryfall traffic.

import { cardImage, cardPriceUsd, searchCards, type ScryfallCard } from "@/lib/scryfall";

export interface BudgetCard {
  name: string;
  usd: number;
  image?: string;
  typeLine: string;
  colors: string; // color identity letters, "" for colorless
  rank?: number; // EDHREC popularity rank (lower = more played)
}

export interface BudgetTier {
  label: string;
  blurb: string;
  cards: BudgetCard[];
}

function toBudget(c: ScryfallCard): BudgetCard | null {
  const usd = cardPriceUsd(c);
  if (usd === null) return null;
  const any = c as unknown as { type_line?: string; color_identity?: string[]; edhrec_rank?: number };
  return {
    name: c.name,
    usd,
    image: cardImage(c),
    typeLine: any.type_line ?? "",
    colors: (any.color_identity ?? []).join(""),
    rank: any.edhrec_rank,
  };
}

// Scryfall's usd filter matches any printing, and prefer:usd-low then shows the cheapest printing
// that matched. So one search for "some printing at or under the top price" returns each card at
// its true cheapest price, and the cards are split into tiers here: every card lands in exactly
// one tier. Two result pages (350 cards, most-played first) are plenty to fill both tiers.
async function tiers(query: string, bounds: { min: number; max: number; take: number }[]): Promise<BudgetCard[][]> {
  const top = Math.max(...bounds.map((b) => b.max));
  const out = bounds.map(() => [] as BudgetCard[]);
  try {
    for (let page = 1; page <= 2; page++) {
      const res = await searchCards(`${query} usd<=${top} prefer:usd-low`, { order: "edhrec", page });
      for (const raw of res.data) {
        const c = toBudget(raw);
        if (!c) continue;
        const i = bounds.findIndex((b) => c.usd >= b.min && c.usd <= b.max);
        if (i >= 0 && out[i].length < bounds[i].take) out[i].push(c);
      }
      if (!res.has_more || out.every((o, i) => o.length >= bounds[i].take)) break;
    }
  } catch {
    // Scryfall busy or down: show what was gathered, or the page's "couldn't load" note
  }
  return out;
}

const COMMANDERS = "is:commander legal:commander game:paper -is:digital";
// Cards that see play in Commander, other than commanders themselves. Basics can't be "staples".
const STAPLES = "legal:commander game:paper -is:digital -t:basic -is:commander";

export async function budgetCommanders(): Promise<BudgetTier[]> {
  const [under1, under5] = await tiers(COMMANDERS, [
    { min: 0.01, max: 1, take: 30 },
    { min: 1.01, max: 5, take: 30 },
  ]);
  return [
    { label: "Under $1", blurb: "The most-played commanders you can pick up for pocket change.", cards: under1 },
    { label: "$1 to $5", blurb: "Popular commanders that still cost less than a booster pack.", cards: under5 },
  ];
}

export async function budgetStaples(): Promise<BudgetTier[]> {
  const [under25c, under1] = await tiers(STAPLES, [
    { min: 0.01, max: 0.25, take: 40 },
    { min: 0.26, max: 1, take: 40 },
  ]);
  return [
    { label: "Under 25¢", blurb: "Bulk-bin cards that show up in a huge share of Commander decks.", cards: under25c },
    { label: "25¢ to $1", blurb: "Still cheap, and among the most-played cards in the format.", cards: under1 },
  ];
}
