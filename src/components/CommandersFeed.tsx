"use client";

import { Fragment, useState } from "react";
import type { ScryfallCard } from "@/lib/scryfall";
import type { DeckCard } from "@/lib/deckTypes";
import { searchCommandersPage } from "@/app/actions/commanders";
import { AD_EVERY_N } from "@/lib/commandersFeedConfig";
import CommanderCard from "./CommanderCard";
import AdSlot from "./AdSlot";

export default function CommandersFeed({
  query,
  initialCards,
  initialHasMore,
  initialNextPage,
  initialPartnerCards,
  tier,
}: {
  query: string;
  initialCards: ScryfallCard[];
  initialHasMore: boolean;
  initialNextPage: number;
  initialPartnerCards?: Record<string, DeckCard>;
  tier?: string | null;
}) {
  const [cards, setCards] = useState(initialCards);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(initialNextPage);
  const [loading, setLoading] = useState(false);
  const [partnerCards, setPartnerCards] = useState(initialPartnerCards ?? {});

  async function loadMore() {
    setLoading(true);
    const result = await searchCommandersPage(query, page);
    setCards((prev) => {
      const existingIds = new Set(prev.map((c) => c.id));
      const fresh = result.cards.filter((c) => !existingIds.has(c.id));
      return [...prev, ...fresh];
    });
    setPartnerCards((prev) => ({ ...prev, ...result.partnerCards }));
    setHasMore(result.hasMore);
    setPage(result.nextPage);
    setLoading(false);
  }

  if (cards.length === 0) {
    return <p className="text-sm text-muted">No commanders found. Try a different search or category.</p>;
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {cards.map((card, i) => (
          <Fragment key={card.id}>
            {i > 0 && i % AD_EVERY_N === 0 && (
              <div className="empty:hidden col-span-full">
                <AdSlot tier={tier} />
              </div>
            )}
            <CommanderCard
              card={card}
              partnerCards={partnerCards}
              asCompanion={query.startsWith("is:companion")}
            />
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
