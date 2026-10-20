import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { SITE } from "@/lib/site";
import { SHOP_ENABLED } from "@/lib/features";
import { commanderNames } from "@/lib/commanderIndex";
import { getSpoilerSets } from "@/lib/scryfall";
import { colorIdentityCategories, typalCategories, themeCategories } from "@/lib/categories";
import { addDays, lastWeekEnd } from "@/lib/prices";
import { MIGRATION_SLUGS } from "@/lib/migrations";
import { BUDGET_COLORS } from "@/lib/budget";
import { ARTICLES } from "@/lib/articles";

// Every public page, for search engines: the main sections, browse pages, commanders with
// public decks, the public decks themselves and the store's products. Always current.
// Built fresh on each request: the build runs against an empty database, so a cached copy would miss every deck.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const u = (path: string) => `${SITE.url}${path}`;
  const main: MetadataRoute.Sitemap = [
    { url: u("/"), changeFrequency: "daily", priority: 1, lastModified: now },
    { url: u("/commanders"), changeFrequency: "daily", priority: 0.9 },
    { url: u("/spoilers"), changeFrequency: "daily", priority: 0.8 },
    { url: u("/decks"), changeFrequency: "hourly", priority: 0.9 },
    { url: u("/import"), changeFrequency: "monthly", priority: 0.7 },
    ...MIGRATION_SLUGS.map((s) => ({ url: u(`/import/from/${s}`), changeFrequency: "monthly" as const, priority: 0.6 })),
    { url: u("/edhrec-alternative"), changeFrequency: "monthly", priority: 0.7 },
    { url: u("/commander-deck-building-guide"), changeFrequency: "monthly", priority: 0.7 },
    { url: u("/articles"), changeFrequency: "weekly", priority: 0.7 },
    ...ARTICLES.map((a) => ({ url: u(`/articles/${a.slug}`), lastModified: new Date(`${a.updated ?? a.date}T00:00:00Z`), changeFrequency: "monthly" as const, priority: 0.6 })),
    ...(SHOP_ENABLED ? [{ url: u("/store"), changeFrequency: "weekly" as const, priority: 0.8 }] : []),
    { url: u("/prices"), changeFrequency: "daily", priority: 0.7 },
    { url: u("/prices/movers"), changeFrequency: "daily", priority: 0.7 },
    { url: u("/prices/budget-staples"), changeFrequency: "weekly", priority: 0.7 },
    { url: u("/commanders/budget"), changeFrequency: "weekly", priority: 0.7 },
    ...BUDGET_COLORS.map((c) => ({ url: u(`/commanders/budget/${c.slug}`), changeFrequency: "weekly" as const, priority: 0.6 })),
    { url: u("/commanders/popular"), changeFrequency: "daily", priority: 0.7 },
    ...Array.from({ length: 12 }, (_, i) => addDays(lastWeekEnd(), -7 * i)).map((d) => ({ url: u(`/prices/movers/${d}`), changeFrequency: "yearly" as const, priority: 0.4 })),
    { url: u("/challenge"), changeFrequency: "weekly", priority: 0.6 },
    { url: u("/halloween"), changeFrequency: "weekly", priority: 0.6 },
    { url: u("/community"), changeFrequency: "hourly", priority: 0.6 },
    { url: u("/vote"), changeFrequency: "weekly", priority: 0.5 },
    { url: u("/proxies"), changeFrequency: "monthly" as const, priority: 0.7 },
    { url: u("/play"), changeFrequency: "monthly", priority: 0.6 },
    { url: u("/premium"), changeFrequency: "monthly", priority: 0.5 },
    { url: u("/links"), changeFrequency: "monthly", priority: 0.3 },
    { url: u("/contact"), changeFrequency: "yearly", priority: 0.3 },
    ...["terms", "privacy", "copyright", "impressum"].map((p) => ({ url: u(`/legal/${p}`), changeFrequency: "yearly" as const, priority: 0.2 })),
    ...["colors", "typal", "themes", "multi-commander", "sets"].map((d) => ({ url: u(`/commanders/browse/${d}`), changeFrequency: "weekly" as const, priority: 0.6 })),
    // "Best <X> commanders" landing pages, one per colour / tribe / theme.
    ...[...colorIdentityCategories, ...typalCategories, ...themeCategories].map((c) => ({ url: u(`/commanders/best/${c.slug}`), changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
  const categories = [...colorIdentityCategories, ...typalCategories, ...themeCategories]
    .map((c) => (c as { slug?: string }).slug)
    .filter((s): s is string => !!s)
    .map((slug) => ({ url: u(`/decks?category=${encodeURIComponent(slug)}`), changeFrequency: "daily" as const, priority: 0.5 }));

  // Upcoming & recently-released sets each get a /spoilers/<code> gallery (from Scryfall; [] if busy).
  const spoilerSets = await getSpoilerSets().catch(() => []);
  const [polls, challenges] = await Promise.all([
    db.poll.findMany({ where: { opensAt: { lte: now } }, select: { slug: true, closesAt: true } }).catch(() => []),
    db.challenge.findMany({ select: { slug: true, voteUntil: true } }).catch(() => []),
  ]);
  // Per-card price pages and individual deck views are deliberately left out of the sitemap and
  // noindexed: they're thin, auto-generated pages. The commander and hub pages carry the real content.
  const [commanders, products] = await Promise.all([
    db.deck.groupBy({ by: ["commanderName"], where: { isPublic: true }, _max: { updatedAt: true } }).catch(() => []),
    SHOP_ENABLED ? db.product.findMany({ select: { id: true, createdAt: true } }).catch(() => []) : Promise.resolve([]),
  ]);
  // Every legal commander has a page (play data, top cards, decklists), not just those with decks here.
  const withDecks = new Set(commanders.map((c) => c.commanderName));
  const otherCommanders = commanderNames().filter((n) => !withDecks.has(n));
  return [
    ...main,
    ...categories,
    ...spoilerSets.map((s) => ({ url: u(`/spoilers/${s.code.toLowerCase()}`), changeFrequency: "daily" as const, priority: 0.7 })),
    ...polls.map((p) => ({ url: u(`/vote/${p.slug}`), changeFrequency: p.closesAt > now ? ("daily" as const) : ("yearly" as const), priority: 0.4 })),
    ...challenges.map((c) => ({ url: u(`/challenge/${c.slug}`), changeFrequency: c.voteUntil > now ? ("daily" as const) : ("yearly" as const), priority: 0.5 })),
    ...commanders
      .filter((c) => c.commanderName)
      .map((c) => ({ url: u(`/decks/${encodeURIComponent(c.commanderName)}`), lastModified: c._max.updatedAt ?? undefined, changeFrequency: "daily" as const, priority: 0.7 })),
    ...otherCommanders.map((n) => ({ url: u(`/decks/${encodeURIComponent(n)}`), changeFrequency: "weekly" as const, priority: 0.6 })),
    ...products.map((p) => ({ url: u(`/store/${p.id}`), lastModified: p.createdAt, changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
