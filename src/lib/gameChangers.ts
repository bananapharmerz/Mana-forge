import { sfetch, type ScryfallSearchResponse } from "@/lib/scryfall";

// Wizards' Game Changers list: the cards the Commander Brackets judge a deck by. Wizards updates
// it now and then, and Scryfall tags those cards with is:gamechanger, so we read it from there
// instead of keeping our own copy that would go stale.

const SCRYFALL_API = process.env.SCRYFALL_API_URL || "https://api.scryfall.com";

export interface GameChangerList {
  names: string[];
  // When we last got a good answer from Scryfall (ISO), or null if we never have.
  updatedAt: string | null;
}

// The last good list, kept so a busy or down Scryfall never empties the panel.
const g = globalThis as unknown as { __mfGameChangers?: GameChangerList };

async function fetchList(): Promise<string[] | null> {
  const names: string[] = [];
  let url: string | undefined = `${SCRYFALL_API}/cards/search?${new URLSearchParams({ q: "is:gamechanger", order: "name", unique: "cards" })}`;
  // The list is around 50 cards (one page), but follow next_page in case it ever grows.
  for (let page = 0; url && page < 5; page++) {
    const res = await sfetch(url, {
      headers: { "User-Agent": "mtg-hub/1.0", Accept: "application/json" },
      // Once a day is plenty: Wizards changes the list a few times a year.
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as ScryfallSearchResponse;
    names.push(...(json.data ?? []).map((c) => c.name));
    url = json.has_more ? json.next_page : undefined;
  }
  return names.length > 0 ? names : null;
}

// Never makes a page wait long: if Scryfall hasn't answered within a couple of seconds we hand
// back the last good list (or an empty one) and let the fetch finish in the background.
export async function getGameChangers(): Promise<GameChangerList> {
  const fresh = fetchList()
    .then((names) => {
      if (names) g.__mfGameChangers = { names, updatedAt: new Date().toISOString() };
      return g.__mfGameChangers ?? null;
    })
    .catch(() => g.__mfGameChangers ?? null);
  const timeout = new Promise<null>((r) => setTimeout(() => r(null), 2500));
  return (await Promise.race([fresh, timeout])) ?? g.__mfGameChangers ?? { names: [], updatedAt: null };
}
