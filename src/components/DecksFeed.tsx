"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { getMixedDecksPage, type MixedDeckItem } from "@/app/actions/decks";
import type { FavoritedKeys } from "@/app/actions/favorites";
import { FAVORITE_TOGGLED_EVENT, type FavoriteToggledDetail } from "@/lib/favoriteEvents";
import { AD_EVERY_N } from "@/lib/decksFeedConfig";
import { deckPrice, type DeckCard } from "@/lib/deckTypes";
import SiteDeckCard from "./SiteDeckCard";
import PublicDeckCard from "./PublicDeckCard";
import AdSlot from "./AdSlot";

function itemKey(item: MixedDeckItem) {
  return item.kind === "site" ? `site-${item.deck.id}` : `edhrec-${item.deck.urlhash}`;
}

function priceOf(item: MixedDeckItem): number {
  if (item.kind === "site") {
    const commander: DeckCard = JSON.parse(item.deck.commanderData);
    const cards: DeckCard[] = JSON.parse(item.deck.cards);
    return deckPrice({ commander, cards }).totalUsd;
  }
  return item.deck.priceUsd;
}

function dateOf(item: MixedDeckItem): string {
  return item.kind === "site" ? item.deck.updatedAt : item.deck.savedate;
}

type SortOption = "" | "newest" | "oldest" | "price-high" | "price-low";

const SORT_LABELS: Record<Exclude<SortOption, "">, string> = {
  newest: "Newest First",
  oldest: "Oldest First",
  "price-high": "Highest Price",
  "price-low": "Lowest Price",
};

function sortItems(items: MixedDeckItem[], sort: SortOption): MixedDeckItem[] {
  if (!sort) return items;
  const copy = [...items];
  switch (sort) {
    case "newest":
      return copy.sort((a, b) => dateOf(b).localeCompare(dateOf(a)));
    case "oldest":
      return copy.sort((a, b) => dateOf(a).localeCompare(dateOf(b)));
    case "price-high":
      return copy.sort((a, b) => priceOf(b) - priceOf(a));
    case "price-low":
      return copy.sort((a, b) => priceOf(a) - priceOf(b));
    default:
      return items;
  }
}

export default function DecksFeed({
  initialItems,
  initialCommanderImages,
  initialHasMore,
  initialNextSiteCursor,
  initialSiteExhausted,
  category,
  q,
  tier,
  currentUserId,
  favoritedKeys,
}: {
  initialItems: MixedDeckItem[];
  initialCommanderImages: Record<string, string | undefined>;
  initialHasMore: boolean;
  initialNextSiteCursor: string | null;
  initialSiteExhausted: boolean;
  category?: string;
  q?: string;
  tier?: string | null;
  currentUserId?: string;
  favoritedKeys: FavoritedKeys;
}) {
  const [items, setItems] = useState(initialItems);
  const [commanderImages, setCommanderImages] = useState(initialCommanderImages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [siteCursor, setSiteCursor] = useState(initialNextSiteCursor);
  const [siteExhausted, setSiteExhausted] = useState(initialSiteExhausted);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState<SortOption>("");

  const [favoritedSet, setFavoritedSet] = useState<Set<string>>(
    () =>
      new Set([
        ...favoritedKeys.deckIds.map((id) => `site-${id}`),
        ...favoritedKeys.urlhashes.map((h) => `edhrec-${h}`),
      ])
  );

  // Once a deck is favorited it moves to the Favorites section, so drop it from the main grid
  // here rather than showing it twice — and bring it back if it's ever unfavorited.
  useEffect(() => {
    function onToggle(e: Event) {
      const detail = (e as CustomEvent<FavoriteToggledDetail>).detail;
      setFavoritedSet((prev) => {
        const next = new Set(prev);
        if (detail.favorited) next.add(detail.key);
        else next.delete(detail.key);
        return next;
      });
    }
    window.addEventListener(FAVORITE_TOGGLED_EVENT, onToggle);
    return () => window.removeEventListener(FAVORITE_TOGGLED_EVENT, onToggle);
  }, []);

  async function loadMore() {
    setLoading(true);
    const page = await getMixedDecksPage(siteCursor, siteExhausted, { category, q });
    setItems((prev) => {
      // Random EDHREC sampling can resurface the same deck across batches — drop repeats
      // so React keys stay unique and the same card doesn't show up twice in the feed.
      const existingKeys = new Set(prev.map(itemKey));
      const fresh = page.items.filter((item) => !existingKeys.has(itemKey(item)));
      return [...prev, ...fresh];
    });
    setCommanderImages((prev) => ({ ...prev, ...page.commanderImages }));
    setHasMore(page.hasMore);
    setSiteCursor(page.nextSiteCursor);
    setSiteExhausted(page.siteExhausted);
    setLoading(false);
  }

  const sortedItems = useMemo(() => sortItems(items, sort), [items, sort]);
  // Favorited decks live in the Favorites section above — drop them here so the same deck
  // doesn't render twice on the page.
  const displayItems = useMemo(
    () => sortedItems.filter((item) => !favoritedSet.has(itemKey(item))),
    [sortedItems, favoritedSet]
  );

  if (items.length === 0) {
    if (!category && !q) {
      return (
        <p className="text-sm text-muted">
          No decks published yet — be the first! Build a deck and hit &quot;Make Public&quot; in
          the deck builder.
        </p>
      );
    }
    return (
      <p className="text-sm text-muted">No decks match that search or category. Try a different filter.</p>
    );
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-gold focus:outline-none"
        >
          <option value="">Sort: Mixed (Default)</option>
          {(Object.entries(SORT_LABELS) as [Exclude<SortOption, "">, string][]).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {displayItems.map((item, i) => (
          <Fragment key={itemKey(item)}>
            {i > 0 && i % AD_EVERY_N === 0 && (
              <div className="empty:hidden col-span-full">
                <AdSlot tier={tier} />
              </div>
            )}
            {item.kind === "site" ? (
              <SiteDeckCard
                deck={item.deck}
                commanderImageUrl={commanderImages[item.deck.commanderName]}
                isOwnDeck={item.deck.ownerId === currentUserId}
                isFavorited={favoritedSet.has(itemKey(item))}
                signedIn={Boolean(currentUserId)}
              />
            ) : (
              <PublicDeckCard
                deck={item.deck}
                source={item.source}
                commanderName={item.commanderName}
                commanderImageUrl={commanderImages[item.commanderName]}
                isFavorited={favoritedSet.has(itemKey(item))}
                signedIn={Boolean(currentUserId)}
              />
            )}
          </Fragment>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="mt-8 w-full rounded-lg border border-border py-3 text-sm font-medium text-foreground hover:border-gold disabled:opacity-60"
        >
          {loading ? "Loading..." : "Load More"}
        </button>
      )}
    </>
  );
}
