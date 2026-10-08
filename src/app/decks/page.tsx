import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getMixedDecksPage } from "@/app/actions/decks";
import { getFavoritedKeys } from "@/app/actions/favorites";
import DecksFeed from "@/components/DecksFeed";
import FavoritesSection from "@/components/FavoritesSection";
import CategoryFilterGroup from "@/components/CategoryFilterGroup";
import {
  colorIdentityCategories,
  typalCategories,
  themeCategories,
  multiCommanderCategories,
  productCategories,
  findCategory,
} from "@/lib/categories";
import { SITE } from "@/lib/site";
import type { Metadata } from "next";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ category?: string; q?: string }> }): Promise<Metadata> {
  const { category: slug } = await searchParams;
  const category = slug ? findCategory(slug) : undefined;
  const title = category ? `${category.label} Commander decks` : "Commander decks";
  const description = `${category ? `${category.label} decks` : "Public Commander (EDH) decks"} built by ${SITE.name} players and the community. Copy one, tweak it, make it yours.`;
  return {
    title,
    description,
    openGraph: { title: `${title} · ${SITE.name}`, description },
    alternates: { canonical: slug ? `/decks?category=${encodeURIComponent(slug)}` : "/decks" },
  };
}

export const dynamic = "force-dynamic";

export default async function DecksIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const params = await searchParams;
  const categorySlug = params.category;
  const q = params.q?.trim();
  const category = categorySlug ? findCategory(categorySlug) : undefined;

  const [firstPage, session, favoritedKeys] = await Promise.all([
    getMixedDecksPage(null, false, { category: categorySlug, q }),
    auth(),
    getFavoritedKeys(),
  ]);

  const user = session?.user?.id
    ? await db.user.findUnique({ where: { id: session.user.id } })
    : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Public Decks</h1>
        <p className="mt-1 text-muted">
          {category ? `${category.label} decks` : "Every public deck"}, real {SITE.name} decks
          mixed with real decks from EDHREC — publish a deck and it lands right at the top.
        </p>
      </div>

      <FavoritesSection currentUserId={session?.user?.id} />

      <form action="/decks" method="GET" className="mb-6 flex gap-2">
        {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search decks by commander name..."
          className="w-full max-w-md rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-gold focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold-bright"
        >
          Search
        </button>
        {(q || categorySlug) && (
          <Link
            href="/decks"
            className="flex items-center rounded-md border border-border px-4 py-2 text-sm text-muted hover:border-gold hover:text-foreground"
          >
            Clear
          </Link>
        )}
      </form>

      <div className="mb-8 flex flex-col gap-4">
        <CategoryFilterGroup
          title="Color Identity"
          basePath="/decks"
          browseDimension="colors"
          items={colorIdentityCategories}
          activeSlug={categorySlug}
          q={q}
        />
        <CategoryFilterGroup
          title="Typal"
          basePath="/decks"
          browseDimension="typal"
          items={typalCategories}
          activeSlug={categorySlug}
          q={q}
        />
        <CategoryFilterGroup
          title="Themes"
          basePath="/decks"
          browseDimension="themes"
          items={themeCategories}
          activeSlug={categorySlug}
          q={q}
        />
        <CategoryFilterGroup
          title="Multiple Commanders"
          basePath="/decks"
          browseDimension="multi-commander"
          items={multiCommanderCategories}
          activeSlug={categorySlug}
          q={q}
        />
        <CategoryFilterGroup
          title="Product"
          basePath="/decks"
          items={productCategories}
          activeSlug={categorySlug}
          q={q}
        />
      </div>

      <DecksFeed
        key={`${categorySlug ?? ""}|${q ?? ""}`}
        initialItems={firstPage.items}
        initialCommanderImages={firstPage.commanderImages}
        initialHasMore={firstPage.hasMore}
        initialNextSiteCursor={firstPage.nextSiteCursor}
        initialSiteExhausted={firstPage.siteExhausted}
        category={categorySlug}
        q={q}
        tier={user?.tier}
        currentUserId={session?.user?.id}
        favoritedKeys={favoritedKeys}
      />
    </div>
  );
}
