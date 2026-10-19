import { db } from "./db";
import { SITE } from "./site";
import { pingIndexNow, indexNowEnabled } from "./indexnow";
import { colorIdentityCategories, typalCategories, themeCategories } from "./categories";
import { BUDGET_COLORS } from "./budget";
import { getSpoilerSets } from "./scryfall";

// The evergreen SEO landing pages plus the most recently updated public decks, commander pages and
// spoiler galleries — the full set worth re-submitting to IndexNow once a day. Shared by the
// /api/admin/indexnow route and the in-process daily tracker below so the two never drift.
export async function buildSiteUrls(): Promise<string[]> {
  const u = (path: string) => `${SITE.url}${path}`;
  const evergreen = [
    "/",
    "/commanders",
    "/commanders/popular",
    "/commanders/budget",
    "/decks",
    "/prices",
    "/prices/movers",
    "/prices/budget-staples",
    "/spoilers",
    "/edhrec-alternative",
    "/commander-deck-building-guide",
    "/packs",
    "/play",
    "/premium",
    ...["colors", "typal", "themes", "multi-commander", "sets"].map((d) => `/commanders/browse/${d}`),
    ...BUDGET_COLORS.map((c) => `/commanders/budget/${c.slug}`),
    ...[...colorIdentityCategories, ...typalCategories, ...themeCategories].map((c) => `/commanders/best/${c.slug}`),
  ].map(u);

  const [decks, commanders, spoilerSets] = await Promise.all([
    db.deck.findMany({ where: { isPublic: true }, select: { id: true }, orderBy: { updatedAt: "desc" }, take: 500 }).catch(() => []),
    db.deck.groupBy({ by: ["commanderName"], where: { isPublic: true }, _max: { updatedAt: true }, orderBy: { _max: { updatedAt: "desc" } }, take: 500 }).catch(() => []),
    getSpoilerSets().catch(() => []),
  ]);

  return [
    ...evergreen,
    ...spoilerSets.map((s) => u(`/spoilers/${s.code.toLowerCase()}`)),
    ...commanders.filter((c) => c.commanderName).map((c) => u(`/decks/${encodeURIComponent(c.commanderName)}`)),
    ...decks.map((d) => u(`/decks/view/${d.id}`)),
  ];
}

// Once a day, in-process: no external cron and no admin key needed. Fresh decks are already pinged
// the moment they're published (setDeckPublic); this keeps the evergreen landing pages and the
// busiest commander/spoiler pages fresh too. Mirrors startPriceTracker()'s timer pattern in
// prices.ts, and no-ops in dev (indexNowEnabled() is false off a public https host).
const g = globalThis as unknown as { __indexNowTimer?: ReturnType<typeof setInterval> };

export function startIndexNowDaily() {
  if (g.__indexNowTimer || !indexNowEnabled()) return;
  const tick = () =>
    void buildSiteUrls()
      .then((urls) => pingIndexNow(urls))
      .then((r) =>
        console.log(
          `[indexnow] daily submit: ${r.submitted} urls${r.status ? ` (http ${r.status})` : ""}${r.error ? ` — ${r.error}` : ""}`
        )
      )
      .catch((e) => console.error("[indexnow] daily submit failed:", e));
  g.__indexNowTimer = setInterval(tick, 24 * 3600000);
  setTimeout(tick, 60000); // once, a minute after boot (lets the server settle first)
}
