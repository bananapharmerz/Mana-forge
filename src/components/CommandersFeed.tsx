"use client";

import Ember from "@/components/Ember";
import Link from "next/link";
import { Fragment, useState } from "react";
import type { SearchRecovery } from "@/lib/searchRecovery";
import type { ScryfallCard } from "@/lib/scryfall";
import type { DeckCard } from "@/lib/deckTypes";
import { searchCommandersPage } from "@/app/actions/commanders";
import { AD_EVERY_N } from "@/lib/commandersFeedConfig";
import { badgeSetCodes, isNewCommander } from "@/lib/newBadge";
import CommanderCard from "./CommanderCard";
import AdSlot from "./AdSlot";

export default function CommandersFeed({
  query,
  initialCards,
  initialHasMore,
  initialNextPage,
  initialPartnerCards,
  tier,
  order,
  newestSetCodes,
  recovery,
}: {
  query: string;
  initialCards: ScryfallCard[];
  initialHasMore: boolean;
  initialNextPage: number;
  initialPartnerCards?: Record<string, DeckCard>;
  tier?: string | null;
  order?: string;
  newestSetCodes?: string[]; // newest released sets, newest first, for the 'New' badge
  recovery?: SearchRecovery; // suggestions for a search that found nothing (src/lib/searchRecovery.ts)
}) {
  const [cards, setCards] = useState(initialCards);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(initialNextPage);
  const [loading, setLoading] = useState(false);
  const [partnerCards, setPartnerCards] = useState(initialPartnerCards ?? {});

  async function loadMore() {
    setLoading(true);
    const result = await searchCommandersPage(query, page, order);
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
    const chip =
      "rounded-full border border-border px-3 py-1.5 text-sm text-foreground hover:border-gold hover:text-gold-bright";
    // Popular picks only when there's no closer guess, and never repeating one already shown.
    const popular = (recovery?.popular ?? []).filter((n) => !recovery?.didYouMean.includes(n)).slice(0, 6);
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <Ember mood="thinking" size={130} title="Ember, the Mana Forge mascot, thinking" />
        <p className="text-sm text-muted">No commanders found. Try a different search or category.</p>
        {recovery && recovery.didYouMean.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold text-foreground">Did you mean…</p>
            <ul className="flex flex-wrap justify-center gap-2">
              {recovery.didYouMean.map((name) => (
                <li key={name}>
                  <Link href={`/decks/${encodeURIComponent(name)}`} className={chip}>
                    {name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {recovery?.card && (
          <p className="mt-5 text-sm text-muted">
            {recovery.card.name} isn&apos;t a commander. Looking for the card?{" "}
            <Link href={`/prices/card/${recovery.card.id}`} className="font-medium text-gold-bright underline hover:text-gold">
              See its price
            </Link>
          </p>
        )}
        {popular.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Popular right now</p>
            <ul className="flex flex-wrap justify-center gap-2">
              {popular.map((name) => (
                <li key={name}>
                  <Link href={`/decks/${encodeURIComponent(name)}`} className={chip}>
                    {name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // Re-checked as more cards load, so the badge stays rare across the whole list on screen.
  const badgeCodes = badgeSetCodes(cards, newestSetCodes ?? []);

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
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
              isNew={isNewCommander(card, badgeCodes)}
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
