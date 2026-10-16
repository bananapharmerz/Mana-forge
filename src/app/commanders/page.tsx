import PageHeader from "@/components/PageHeader";
import Link from "next/link";
import CommandersFeed from "@/components/CommandersFeed";
import CategoryFilterGroup from "@/components/CategoryFilterGroup";
import {
  colorIdentityCategories,
  typalCategories,
  themeCategories,
  multiCommanderCategories,
  companionCategories,
  productCategories,
  findCategory,
} from "@/lib/categories";
import { searchCommandersPage } from "@/app/actions/commanders";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Every Commander — browse by color, tribe and theme",
  description: "Browse every legal Magic: The Gathering commander. Filter by color identity, tribe, theme or set, and see what players build with each one.",
  alternates: { canonical: "/commanders" },
  openGraph: { images: ["/opengraph-image"], title: "Every Commander · Mana Forge", description: "Browse every legal Magic: The Gathering commander. Filter by color identity, tribe, theme or set, and see what players build with each one." },
};

export const revalidate = 3600;

export default async function CommandersPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; set?: string; setName?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const categorySlug = params.category;
  const setCode = params.set;
  const setName = params.setName;
  const q = params.q?.trim();
  const sort = params.sort === "color" ? "color" : undefined;
  const category = categorySlug ? findCategory(categorySlug) : undefined;

  // Preserve the active filters when switching sort order.
  const sortKeep = new URLSearchParams();
  if (categorySlug) sortKeep.set("category", categorySlug);
  if (setCode) sortKeep.set("set", setCode);
  if (setName) sortKeep.set("setName", setName);
  if (q) sortKeep.set("q", q);
  const mostHref = `/commanders${sortKeep.toString() ? `?${sortKeep}` : ""}`;
  const colorKeep = new URLSearchParams(sortKeep);
  colorKeep.set("sort", "color");
  const colorHref = `/commanders?${colorKeep}`;

  const baseQuery = category?.query ?? (setCode ? `is:commander e:${setCode}` : "is:commander");
  const query = q ? `${baseQuery} ${q}` : baseQuery;

  const moreOpen = Boolean(setCode) || [...typalCategories, ...themeCategories, ...multiCommanderCategories, ...companionCategories, ...productCategories].some((c) => c.slug === categorySlug);
  const activeLabel = category?.label ?? (setCode ? setName ?? setCode.toUpperCase() : undefined);

  const [firstPage, session] = await Promise.all([searchCommandersPage(query, 1, sort), auth()]);

  const user = session?.user?.id
    ? await db.user.findUnique({ where: { id: session.user.id } })
    : null;

  return (
    <>
      <PageHeader title={activeLabel ?? "Commanders"} description="Every legendary commander ever printed, most played first. Pick one to see its best cards and the decks built around it." width="max-w-[1600px]" />
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-10">
      <form action="/commanders" method="GET" className="mb-6 flex gap-2">
        {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
        {setCode && <input type="hidden" name="set" value={setCode} />}
        {setName && <input type="hidden" name="setName" value={setName} />}
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search commanders by name or text..."
          className="w-full max-w-md rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-gold focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold-bright"
        >
          Search
        </button>
        {(q || categorySlug || setCode) && (
          <Link
            href="/commanders"
            className="flex items-center rounded-md border border-border px-4 py-2 text-sm text-muted hover:border-gold hover:text-foreground"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Commanders first: colour filter stays up top, the rest folds away so the cards are on the first screen. */}
      <div className="mb-6 flex flex-col gap-3">
        <CategoryFilterGroup
          title="Color Identity"
          basePath="/commanders"
          browseDimension="colors"
          items={colorIdentityCategories}
          activeSlug={categorySlug}
          q={q}
        />
        <details className="group rounded-md border border-border/60 px-3 py-2" open={moreOpen}>
          <summary className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wide text-muted hover:text-foreground">
            More filters <span className="normal-case tracking-normal">(tribe, theme, partners, product, set)</span>
          </summary>
          <div className="mt-3 flex flex-col gap-4">
        <CategoryFilterGroup
          title="Typal"
          basePath="/commanders"
          browseDimension="typal"
          items={typalCategories}
          activeSlug={categorySlug}
          q={q}
        />
        <CategoryFilterGroup
          title="Themes"
          basePath="/commanders"
          browseDimension="themes"
          items={themeCategories}
          activeSlug={categorySlug}
          q={q}
        />
        <CategoryFilterGroup
          title="Partners & Companions"
          basePath="/commanders"
          browseDimension="multi-commander"
          items={[...multiCommanderCategories, ...companionCategories]}
          activeSlug={categorySlug}
          q={q}
        />
        <CategoryFilterGroup
          title="Product"
          basePath="/commanders"
          items={productCategories}
          activeSlug={categorySlug}
          q={q}
        />
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Set</h2>
          <div className="flex flex-wrap items-center gap-1.5">
            {setCode && (
              <span className="rounded-full border border-gold bg-gold px-3 py-1 text-xs font-medium text-black">
                {activeLabel}
              </span>
            )}
            <Link
              href="/commanders/browse/sets"
              className="rounded-full border border-dashed border-border px-3 py-1 text-xs font-medium text-gold-bright hover:border-gold"
            >
              Search sets →
            </Link>
          </div>
        </div>
          </div>
        </details>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs uppercase tracking-wide text-muted">Sort</span>
        <Link
          href={mostHref}
          aria-current={!sort ? "true" : undefined}
          className={!sort ? "rounded-full bg-gold px-3 py-1.5 text-xs font-bold text-black" : "rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:border-gold hover:text-foreground"}
        >
          Most played
        </Link>
        <Link
          href={colorHref}
          aria-current={sort === "color" ? "true" : undefined}
          className={sort === "color" ? "rounded-full bg-gold px-3 py-1.5 text-xs font-bold text-black" : "rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:border-gold hover:text-foreground"}
        >
          Color identity
        </Link>
        {/* A count tells people how big the list is and that their filter worked, before they scroll. */}
        {firstPage.total ? (
          <span className="ml-auto text-xs text-muted">
            {firstPage.total.toLocaleString("en-US")} {firstPage.total === 1 ? "commander" : "commanders"}
          </span>
        ) : null}
      </div>

      <CommandersFeed
        key={`${query}|${sort ?? ""}`}
        query={query}
        order={sort}
        initialCards={firstPage.cards}
        initialHasMore={firstPage.hasMore}
        initialNextPage={firstPage.nextPage}
        initialPartnerCards={firstPage.partnerCards}
        tier={user?.tier}
      />

      {/* Internal links into the "best of" landing pages: crawlable entry points for search and
          quick jump-offs for players. These rank for "best <X> commanders" and otherwise only
          live in the sitemap. */}
      <nav aria-label="Popular commander lists" className="mt-12 border-t border-border/60 pt-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Best commanders by color</h2>
            <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
              {colorIdentityCategories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/commanders/best/${c.slug}`} className="text-foreground hover:text-gold-bright">
                    {c.label.split(" (")[0]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Best commanders by tribe</h2>
            <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
              {typalCategories.slice(0, 14).map((c) => (
                <li key={c.slug}>
                  <Link href={`/commanders/best/${c.slug}`} className="text-foreground hover:text-gold-bright">{c.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">By theme</h2>
            <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
              {themeCategories.slice(0, 12).map((c) => (
                <li key={c.slug}>
                  <Link href={`/commanders/best/${c.slug}`} className="text-foreground hover:text-gold-bright">{c.label}</Link>
                </li>
              ))}
            </ul>
            <ul className="mt-5 flex flex-col gap-1.5 text-sm">
              <li><Link href="/commanders/popular" className="font-medium text-gold-bright hover:text-gold">Most popular commanders →</Link></li>
              <li><Link href="/commanders/budget" className="font-medium text-gold-bright hover:text-gold">Best budget commanders →</Link></li>
              <li><Link href="/commander-deck-building-guide" className="font-medium text-gold-bright hover:text-gold">Commander deck-building guide →</Link></li>
              <li><Link href="/edhrec-alternative" className="font-medium text-gold-bright hover:text-gold">A free EDHREC alternative →</Link></li>
            </ul>
          </div>
        </div>
      </nav>
    </div>
    </>
  );
}
