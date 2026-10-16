import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adminAllowed } from "@/lib/adminKey";
import { hit, ipFrom } from "@/lib/rateLimit";
import { SITE } from "@/lib/site";
import { pingIndexNow, indexNowEnabled } from "@/lib/indexnow";
import { colorIdentityCategories, typalCategories, themeCategories } from "@/lib/categories";
import { BUDGET_COLORS } from "@/lib/budget";
import { getSpoilerSets } from "@/lib/scryfall";

// Daily IndexNow submit: tell Bing/Yandex/etc. about the evergreen SEO landing pages plus whatever
// decks, commanders and spoiler galleries changed most recently. Needs the admin key (same header
// as the other /api/admin routes), otherwise 404. Point a once-a-day scheduler at it:
//
//   curl -fsS -H "x-admin-key: $ADMIN_API_KEY" https://manaforgehub.com/api/admin/indexnow
//
export const dynamic = "force-dynamic";

const notFound = () => new NextResponse("Not found", { status: 404 });

async function buildUrls(): Promise<string[]> {
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

async function run(req: Request) {
  if (!hit(`admin-indexnow:${ipFrom(req.headers)}`, 10, 60 * 1000) || !adminAllowed(req)) return notFound();
  if (!indexNowEnabled()) {
    return NextResponse.json({ ok: false, skipped: true, reason: "IndexNow disabled (needs a public https site URL)." });
  }
  const urls = await buildUrls();
  const result = await pingIndexNow(urls);
  return NextResponse.json({ ...result, collected: urls.length });
}

// GET for easy scheduling/curl, POST for well-behaved cron runners — both do the same thing.
export const GET = run;
export const POST = run;
