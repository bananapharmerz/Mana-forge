// The most-built commanders over the past month, from EDHREC's public "Top Commanders (Past Month)"
// list, with card images and type lines from Scryfall. EDHREC refreshes that list daily, so it's
// cached for six hours. Used by /commanders/popular.

import { cardImage, getCardsByNames } from "@/lib/scryfall";

const front = (name: string) => name.split(" // ")[0];

export interface TopCommander {
  rank: number;
  name: string; // as EDHREC shows it, both names for a partner pair
  page: string; // the commander page to link: the first card of a pair
  decks: number; // decks built with it on EDHREC in the past month
  image?: string;
  typeLine: string;
}

export async function topCommandersThisMonth(take = 50): Promise<TopCommander[]> {
  let list: { name: string; num_decks: number }[] = [];
  try {
    const res = await fetch("https://json.edhrec.com/pages/commanders/month.json", {
      headers: { "User-Agent": "mtg-hub/1.0", Accept: "application/json" },
      next: { revalidate: 21600 },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const views = data?.container?.json_dict?.cardlists?.[0]?.cardviews;
    if (Array.isArray(views))
      list = views
        .filter((v: { name?: unknown; num_decks?: unknown }) => typeof v?.name === "string" && typeof v?.num_decks === "number")
        .slice(0, take);
  } catch {
    return []; // EDHREC down: the page says so
  }
  // EDHREC lists partner pairs as one entry ("Frodo, Adventurous Hobbit // Sam, Loyal Attendant"),
  // so look up (and link) the first card; Scryfall also finds double-faced cards by their front name.
  const cards = await getCardsByNames(list.map((c) => front(c.name)));
  // Double-faced cards come back as "Front // Back"; EDHREC may use either form, so index both.
  const byName = new Map<string, (typeof cards)[number]>();
  for (const c of cards) {
    byName.set(c.name.toLowerCase(), c);
    byName.set(c.name.split(" // ")[0].toLowerCase(), c);
  }
  return list.map((c, i) => {
    const card = byName.get(front(c.name).toLowerCase());
    const extra = card as unknown as { type_line?: string } | undefined;
    return {
      rank: i + 1,
      name: c.name,
      page: front(c.name),
      decks: c.num_decks,
      image: card ? cardImage(card) : undefined,
      typeLine: extra?.type_line ?? "",
    };
  });
}
