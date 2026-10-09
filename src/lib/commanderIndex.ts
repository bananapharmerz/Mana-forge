// Every legal commander's name, for the sitemap, so search engines find a page for each one
// (not only the commanders someone has already built a deck for). Scryfall returns 175 cards per
// page, so the list takes ~20 requests: it's built in the background, kept in memory for a day,
// and the sitemap simply leaves these out until the first build has finished.

const DAY = 24 * 60 * 60 * 1000;
// Kept on globalThis: the startup hook and the sitemap route can load separate copies of this module.
const g = globalThis as unknown as { __mfCommanders?: { names: string[]; builtAt: number; building: Promise<void> | null } };
const state = (g.__mfCommanders ??= { names: [], builtAt: 0, building: null });

async function build() {
  const out: string[] = [];
  let url: string | null =
    "https://api.scryfall.com/cards/search?q=" + encodeURIComponent("is:commander legal:commander game:paper") + "&order=edhrec&unique=cards";
  for (let page = 0; url && page < 40; page++) {
    const res: Response = await fetch(url, { headers: { "User-Agent": "mtg-hub/1.0", Accept: "application/json" }, cache: "no-store" });
    if (!res.ok) break;
    const body = (await res.json()) as { data?: { name?: string }[]; has_more?: boolean; next_page?: string };
    for (const c of body.data ?? []) if (typeof c.name === "string") out.push(c.name);
    url = body.has_more && body.next_page ? body.next_page : null;
    await new Promise((r) => setTimeout(r, 150)); // Scryfall asks for 50-100ms between requests
  }
  if (out.length > 100) {
    state.names = out;
    state.builtAt = Date.now();
  }
}

/** Names known so far (most played first). Starts or refreshes the background build when needed. */
export function commanderNames(): string[] {
  if (!state.building && Date.now() - state.builtAt > DAY) {
    state.building = build()
      .catch((e) => console.warn("[commanderIndex] build failed:", e instanceof Error ? e.message : e))
      .finally(() => {
        state.building = null;
      });
  }
  return state.names;
}
