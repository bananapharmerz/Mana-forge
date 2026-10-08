"use client";

import { useEffect, useState } from "react";
import { toggleFavoriteSiteDeck, toggleFavoriteEdhrecDeck } from "@/app/actions/favorites";
import { FAVORITE_TOGGLED_EVENT, type FavoriteToggledDetail } from "@/lib/favoriteEvents";
import type { EdhrecDeckSource, EdhrecPublicDeck } from "@/lib/edhrec";

type Props = {
  initialFavorited: boolean;
  signedIn: boolean;
} & (
  | { kind: "site"; deckId: string }
  | { kind: "edhrec"; deck: EdhrecPublicDeck; commanderName: string; source: EdhrecDeckSource | null }
);

function keyFor(props: Props): string {
  return props.kind === "site" ? `site-${props.deckId}` : `edhrec-${props.deck.urlhash}`;
}

export default function FavoriteButton(props: Props) {
  const [favorited, setFavorited] = useState(props.initialFavorited);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = keyFor(props);

  useEffect(() => {
    function onToggle(e: Event) {
      const detail = (e as CustomEvent<FavoriteToggledDetail>).detail;
      if (detail.key === key) setFavorited(detail.favorited);
    }
    window.addEventListener(FAVORITE_TOGGLED_EVENT, onToggle);
    return () => window.removeEventListener(FAVORITE_TOGGLED_EVENT, onToggle);
  }, [key]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(timer);
  }, [error]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
    if (!props.signedIn) {
      setError("Sign in to favorite decks.");
      return;
    }

    setPending(true);
    setError(null);
    const next = !favorited;
    setFavorited(next);

    try {
      const result =
        props.kind === "site"
          ? await toggleFavoriteSiteDeck(props.deckId)
          : await toggleFavoriteEdhrecDeck(props.deck, props.commanderName, props.source);

      if (result.ok) {
        setFavorited(result.favorited);
        window.dispatchEvent(
          new CustomEvent<FavoriteToggledDetail>(FAVORITE_TOGGLED_EVENT, {
            detail: { key, favorited: result.favorited },
          })
        );
      } else {
        setFavorited(!next);
        setError(result.error);
      }
    } catch {
      setFavorited(!next);
      setError("Something went wrong. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        title={props.signedIn ? (favorited ? "Remove from favorites" : "Add to favorites") : "Sign in to favorite decks"}
        aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors disabled:opacity-50 ${
          favorited
            ? "border-gold bg-gold text-black"
            : "border-border bg-surface text-muted hover:border-gold hover:text-foreground"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill={favorited ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
          <path
            d="M12 21s-7-4.35-9.5-8.5C.5 8.5 2 5 5.5 5c2 0 3.5 1.2 4.5 2.7C11 6.2 12.5 5 14.5 5 18 5 19.5 8.5 17.5 12.5 15 16.65 12 21 12 21z"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {error && (
        <p className="absolute right-0 top-full z-50 mt-1 w-40 rounded-md border border-red-600/40 bg-surface p-1.5 text-right text-[10px] text-red-600 shadow-lg">
          {error}
        </p>
      )}
    </div>
  );
}
