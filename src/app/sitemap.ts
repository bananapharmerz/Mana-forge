import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { SITE } from "@/lib/site";
import { SHOP_ENABLED } from "@/lib/features";
import { colorIdentityCategories, typalCategories, themeCategories } from "@/lib/categories";

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
    { url: u("/decks"), changeFrequency: "hourly", priority: 0.9 },
    ...(SHOP_ENABLED ? [{ url: u("/store"), changeFrequency: "weekly" as const, priority: 0.8 }] : []),
    { url: u("/prices"), changeFrequency: "daily", priority: 0.7 },
    ...(SHOP_ENABLED ? [{ url: u("/proxies"), changeFrequency: "monthly" as const, priority: 0.7 }] : []),
    { url: u("/play"), changeFrequency: "monthly", priority: 0.6 },
    { url: u("/premium"), changeFrequency: "monthly", priority: 0.5 },
    { url: u("/contact"), changeFrequency: "yearly", priority: 0.3 },
    ...["terms", "privacy", "copyright", "impressum"].map((p) => ({ url: u(`/legal/${p}`), changeFrequency: "yearly" as const, priority: 0.2 })),
    ...["colors", "typal", "themes", "multi-commander", "sets"].map((d) => ({ url: u(`/commanders/browse/${d}`), changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
  const categories = [...colorIdentityCategories, ...typalCategories, ...themeCategories]
    .map((c) => (c as { slug?: string }).slug)
    .filter((s): s is string => !!s)
    .map((slug) => ({ url: u(`/decks?category=${encodeURIComponent(slug)}`), changeFrequency: "daily" as const, priority: 0.5 }));

  const [decks, commanders, products] = await Promise.all([
    db.deck.findMany({ where: { isPublic: true }, select: { id: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 20000 }).catch(() => []),
    db.deck.groupBy({ by: ["commanderName"], where: { isPublic: true }, _max: { updatedAt: true } }).catch(() => []),
    SHOP_ENABLED ? db.product.findMany({ select: { id: true, createdAt: true } }).catch(() => []) : Promise.resolve([]),
  ]);
  return [
    ...main,
    ...categories,
    ...commanders
      .filter((c) => c.commanderName)
      .map((c) => ({ url: u(`/decks/${encodeURIComponent(c.commanderName)}`), lastModified: c._max.updatedAt ?? undefined, changeFrequency: "daily" as const, priority: 0.7 })),
    ...decks.map((d) => ({ url: u(`/decks/view/${d.id}`), lastModified: d.updatedAt, changeFrequency: "weekly" as const, priority: 0.5 })),
    ...products.map((p) => ({ url: u(`/store/${p.id}`), lastModified: p.createdAt, changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
