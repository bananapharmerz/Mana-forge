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
};

export const revalidate = 3600;

export default async function CommandersPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; set?: string; setName?: string }>;
}) {
  const params = await searchParams;
  const categorySlug = params.category;
  const setCode = params.set;
  const setName = params.setName;
  const q = params.q?.trim();
  const category = categorySlug ? findCategory(categorySlug) : undefined;

  const baseQuery = category?.query ?? (setCode ? `is:commander e:${setCode}` : "is:commander");
  const query = q ? `${baseQuery} ${q}` : baseQuery;

  const activeLabel = category?.label ?? (setCode ? setName ?? setCode.toUpperCase() : undefined);

  const [firstPage, session] = await Promise.all([searchCommandersPage(query, 1), auth()]);

  const user = session?.user?.id
    ? await db.user.findUnique({ where: { id: session.user.id } })
    : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Commanders</h1>
        <p className="mt-1 text-muted">
          {activeLabel ?? "All commanders"}, from every set ever printed, sorted by all-time
          EDHREC popularity.
        </p>
      </div>

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

      <div className="mb-8 flex flex-col gap-4">
        <CategoryFilterGroup
          title="Color Identity"
          basePath="/commanders"
          browseDimension="colors"
          items={colorIdentityCategories}
          activeSlug={categorySlug}
          q={q}
        />
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
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Set</h3>
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

      <CommandersFeed
        key={query}
        query={query}
        initialCards={firstPage.cards}
        initialHasMore={firstPage.hasMore}
        initialNextPage={firstPage.nextPage}
        initialPartnerCards={firstPage.partnerCards}
        tier={user?.tier}
      />
    </div>
  );
}
