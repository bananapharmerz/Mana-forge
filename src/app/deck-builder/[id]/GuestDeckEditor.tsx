"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Deck } from "@/lib/deckTypes";
import { GUEST_DECK_EVENT, loadGuestDeck } from "@/lib/guestDeck";
import DeckEditor from "./DeckEditor";

// Once a guest has put real work in, remind them it only lives in this browser.
const NUDGE_AT = 10;
const count = (d: Deck | null) => (d ? d.cards.reduce((n, c) => n + (c.quantity ?? 1), 0) + (d.commander ? 1 : 0) : 0);

export default function GuestDeckEditor() {
  const router = useRouter();
  const [deck, setDeck] = useState<Deck | null | undefined>(undefined);
  const [cards, setCards] = useState(0);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const d = loadGuestDeck();
    // Reading browser storage has to wait until we're in the browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDeck(d);
    setCards(count(d));
    if (!d) router.replace("/deck-builder");
    const onChange = () => setCards(count(loadGuestDeck()));
    window.addEventListener(GUEST_DECK_EVENT, onChange);
    return () => window.removeEventListener(GUEST_DECK_EVENT, onChange);
  }, [router]);

  if (!deck) return <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted">Loading your draft…</div>;
  return (
    <>
      <DeckEditor initialDeck={deck} guest />
      {cards >= NUDGE_AT && !hidden && (
        <div className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-2xl flex-wrap items-center gap-3 rounded-xl border border-gold/50 bg-[#141009]/95 px-4 py-3 text-sm text-[#f3e9cf] shadow-2xl backdrop-blur">
          <p className="min-w-0 flex-1">
            <b>{cards} cards in.</b> This deck only lives in this browser. Save it with a free account so you don&apos;t lose it.
          </p>
          <Link
            href="/signup?callbackUrl=/deck-builder"
            className="shrink-0 rounded-md bg-gold px-3 py-1.5 font-semibold text-black hover:bg-gold-bright"
          >
            Save my deck, free
          </Link>
          <button onClick={() => setHidden(true)} aria-label="Hide this reminder" className="shrink-0 text-[#a99c7c] hover:text-[#f3e9cf]">
            ✕
          </button>
        </div>
      )}
    </>
  );
}
