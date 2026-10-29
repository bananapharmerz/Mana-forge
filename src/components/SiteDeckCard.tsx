"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SaveDeckButton from "./SaveDeckButton";
import TypeBreakdownBar from "./TypeBreakdownBar";
import CardFan from "./fx/CardFan";
import FavoriteButton from "./FavoriteButton";
import { typeBreakdown, deckPrice, type DeckCard } from "@/lib/deckTypes";
import { formatCents } from "@/lib/money";
import type { SiteDeckRow } from "@/app/actions/decks";
import { SITE } from "@/lib/site";
import { authorName } from "@/lib/author";
import Avatar from "@/components/Avatar";
import BracketBadge from "@/components/BracketBadge";
import { bracketBadge, loadGameChangerSet } from "@/lib/bracket";

export default function SiteDeckCard({
  deck,
  commanderImageUrl,
  isOwnDeck,
  isFavorited,
  signedIn,
  showBracket,
}: {
  deck: SiteDeckRow;
  commanderImageUrl?: string;
  isOwnDeck?: boolean;
  isFavorited?: boolean;
  signedIn?: boolean;
  // The estimated-bracket badge: on in the public decks feed, off in Favorites (your own picks).
  showBracket?: boolean;
}) {
  const cards: DeckCard[] = JSON.parse(deck.cards);
  const commander: DeckCard = JSON.parse(deck.commanderData);
  const size = cards.reduce((s, c) => s + c.quantity, 0) + 1;
  const author = authorName(deck.owner.name);
  const counts = typeBreakdown({ commander, cards });
  // The Game Changers list is fetched once per page view and shared by every card on it.
  const [gameChangers, setGameChangers] = useState<Set<string> | null>(null);
  useEffect(() => {
    if (!showBracket) return;
    let live = true;
    loadGameChangerSet().then((l) => live && setGameChangers(l));
    return () => {
      live = false;
    };
  }, [showBracket]);
  const bracket = gameChangers ? bracketBadge([commander.name, ...cards.map((c) => c.name)], gameChangers) : null;
  const price = deckPrice({ commander, cards });
  // The deck's priciest non-land cards peek out from behind the commander.
  const showcase = cards
    .filter((c) => c.imageUrl && !/\bLand\b/.test(c.typeLine))
    .sort((a, b) => (b.priceUsd ?? 0) - (a.priceUsd ?? 0))
    .slice(0, 3)
    .map((c) => c.imageUrl as string);

  return (
    <div className="card-frame flex flex-col gap-2 p-3">
      <Link
        href={`/decks/view/${deck.id}`}
        className="group flex gap-3 rounded-md transition-colors hover:bg-surface-raised"
      >
        {commanderImageUrl && <CardFan commander={commanderImageUrl} cards={showcase} alt={deck.commanderName} />}
        <div className="flex flex-1 flex-col gap-1.5 overflow-hidden">
          <span className="line-clamp-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gold-bright">
            <Avatar avatar={deck.owner.avatar} seed={deck.owner.name} size={16} />
            {SITE.name} — by {author}
          </span>
          <h3 className="line-clamp-1 font-semibold text-foreground">{deck.name}</h3>
          <TypeBreakdownBar counts={counts} />
          <div className="mt-auto flex items-end justify-between gap-2">
            <span className="text-xs text-muted">
              {size}/100 cards
              <BracketBadge badge={bracket} />
            </span>
            <span className="shrink-0 text-sm font-semibold text-foreground">
              {formatCents(price.totalUsd * 100)}
            </span>
          </div>
        </div>
      </Link>
      <div className="flex items-center gap-2">
        {isOwnDeck ? (
          <Link
            href={`/deck-builder/${deck.id}`}
            className="flex-1 rounded-md border border-border px-2 py-1 text-center text-xs text-muted hover:border-gold hover:text-foreground"
          >
            This is your deck — Edit
          </Link>
        ) : (
          <div className="flex-1">
            <SaveDeckButton deckId={deck.id} signedIn={signedIn ?? false} />
          </div>
        )}
        <FavoriteButton kind="site" deckId={deck.id} initialFavorited={isFavorited ?? false} signedIn={signedIn ?? false} />
      </div>
    </div>
  );
}
