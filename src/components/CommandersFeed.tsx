"use client";

import Ember from "@/components/Ember";
import Link from "next/link";
import { Fragment, useState } from "react";
import type { ScryfallCard } from "@/lib/scryfall";
import type { DeckCard } from "@/lib/deckTypes";
import { searchCommandersPage } from "@/app/actions/commanders";
import { AD_EVERY_N } from "@/lib/commandersFeedConfig";
import { badgeSetCodes, isNewCommander } from "@/lib/newBadge";
import CommanderCard from "./CommanderCard";
import AdSlot from "./AdSlot";

// Side-by-side compare holds three at most; more columns stop being readable on a laptop.
const COMPARE_MAX = 3;

export default function CommandersFeed({
  query,
  initialCards,
  initialHasMore,
  initialNextPage,
  initialPartnerCards,
  tier,
  order,
  newestSetCodes,
}: {
  query: string;
  initialCards: ScryfallCard[];
  initialHasMore: boolean;
  initialNextPage: number;
  initialPartnerCards?: Record<string, DeckCard>;
  tier?: string | null;
  order?: string;
  newestSetCodes?: string[]; // newest released sets, newest first, for the 'New' badge
}) {
  const [cards, setCards] = useState(initialCards);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(initialNextPage);
  const [loading, setLoading] = useState(false);
  const [partnerCards, setPartnerCards] = useState(initialPartnerCards ?? {});
  // Picked for comparing. Kept in memory only; the compare page itself carries them in its URL.
  const [compare, setCompare] = useState<string[]>([]);

  function toggleCompare(name: string) {
    setCompare((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : prev.length < COMPARE_MAX ? [...prev, name] : prev));
  }

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
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <Ember mood="thinking" size={130} title="Ember, the Mana Forge mascot, thinking" />
        <p className="text-sm text-muted">No commanders found. Try a different search or category.</p>
      </div>
    );
  }

  // Re-checked as more cards load, so the badge stays rare across the whole list on screen.
  const badgeCodes = badgeSetCodes(cards, newestSetCodes ?? []);
  const compareHref = `/commanders/compare?${compare.map((n) => `c=${encodeURIComponent(n)}`).join("&")}`;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
        {cards.map((card, i) => {
          const picked = compare.includes(card.name);
          const full = !picked && compare.length >= COMPARE_MAX;
          return (
            <Fragment key={card.id}>
              {i > 0 && i % AD_EVERY_N === 0 && (
                <div className="empty:hidden col-span-full">
                  <AdSlot tier={tier} />
                </div>
              )}
              <div className="flex flex-col gap-1">
                <CommanderCard
                  card={card}
                  partnerCards={partnerCards}
                  asCompanion={query.startsWith("is:companion")}
                  isNew={isNewCommander(card, badgeCodes)}
                />
                {/* Outside the card link, so ticking it never opens the commander page. */}
                <label className={`flex items-center gap-1.5 px-1 text-xs ${full ? "cursor-not-allowed text-muted/60" : "cursor-pointer text-muted hover:text-foreground"}`}>
                  <input type="checkbox" checked={picked} disabled={full} onChange={() => toggleCompare(card.name)} className="accent-[var(--gold)]" />
                  Compare
                </label>
              </div>
            </Fragment>
          );
        })}
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

      {compare.length > 0 && (
        <div className="sticky bottom-3 z-30 mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-gold/60 bg-surface/95 px-4 py-3 shadow-lg backdrop-blur">
          <span className="min-w-0 flex-1 truncate text-sm text-foreground">{compare.join(" · ")}</span>
          <button type="button" onClick={() => setCompare([])} className="text-xs text-muted hover:text-foreground">
            Clear
          </button>
          {compare.length >= 2 ? (
            <Link href={compareHref} className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold-bright">
              Compare {compare.length} commanders
            </Link>
          ) : (
            <span className="text-xs text-muted">Pick one more to compare</span>
          )}
        </div>
      )}
    </>
  );
}
