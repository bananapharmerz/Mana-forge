// Every legal commander's name, for the sitemap, so search engines find a page for each one
// (not only the commanders someone has already built a deck for). Scryfall returns 175 cards per
// page, so the list takes ~20 requests: it's built in the background, kept in memory for a day,
// and the sitemap simply leaves these out until the first build has finished.

import { readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { sfetch } from "@/lib/scryfall";

const DAY = 24 * 60 * 60 * 1000;
// Kept on globalThis: the startup hook and the sitemap route can load separate copies of this module.
const g = globalThis as unknown as { __mfCommanders?: { names: string[]; builtAt: number; building: Promise<void> | null } };
const state = (g.__mfCommanders ??= { names: [], builtAt: 0, building: null });
// The full card data from the same pages, by lower-case name. getCardByName (src/lib/scryfall.ts)
// answers commander pages from here, so crawling thousands of them doesn't hammer Scryfall.
const cards = globalThis as unknown as { __mfCommanderCards?: Map<string, unknown> };

// Saved to /data/commanders.json too, so a restart or deploy starts with the list instead of
// asking Scryfall for every commander page in the first minutes.
const file = () => path.join(path.dirname(process.env.DATABASE_PATH || path.join(process.cwd(), "dev.db")), "commanders.json");
if (!state.builtAt) {
  try {
    const at = statSync(file()).mtimeMs;
    if (Date.now() - at < 3 * DAY) {
      const list = JSON.parse(readFileSync(file(), "utf8")) as { name?: string }[];
      const byName = new Map<string, unknown>();
      for (const c of list) if (typeof c.name === "string") byName.set(c.name.toLowerCase(), c);
      if (byName.size > 100) {
        state.names = list.map((c) => c.name as string);
        state.builtAt = at;
        cards.__mfCommanderCards = byName;
      }
    }
  } catch {
    /* no saved list yet */
  }
}

async function build() {
  const out: string[] = [];
  const byName = new Map<string, unknown>();
  let url: string | null =
    "https://api.scryfall.com/cards/search?q=" + encodeURIComponent("is:commander legal:commander game:paper") + "&order=edhrec&unique=cards";
  for (let page = 0; url && page < 40; page++) {
    const res: Response = await sfetch(url, { headers: { "User-Agent": "mtg-hub/1.0", Accept: "application/json" }, cache: "no-store" });
    if (!res.ok) break;
    const body = (await res.json()) as { data?: { name?: string }[]; has_more?: boolean; next_page?: string };
    for (const c of body.data ?? [])
      if (typeof c.name === "string") {
        out.push(c.name);
        byName.set(c.name.toLowerCase(), c);
      }
    url = body.has_more && body.next_page ? body.next_page : null;
    await new Promise((r) => setTimeout(r, 600)); // gentle: leaves Scryfall's rate limit for real visitors
  }
  if (out.length > 100) {
    state.names = out;
    state.builtAt = Date.now();
    cards.__mfCommanderCards = byName;
    try {
      writeFileSync(file(), JSON.stringify([...byName.values()]));
    } catch {}
  }
}

/** Names known so far (most played first). Starts or refreshes the background build when needed. */
export function commanderNames(): string[] {
  if (!state.building && Date.now() - state.builtAt > DAY) {
    // Wait 2 minutes after a restart before starting, so it never competes with the first visitors.
    const bootWait = Math.max(0, 120000 - process.uptime() * 1000);
    state.building = new Promise((r) => setTimeout(r, bootWait))
      .then(build)
      .catch((e) => console.warn("[commanderIndex] build failed:", e instanceof Error ? e.message : e))
      .finally(() => {
        state.building = null;
      });
  }
  return state.names;
}
