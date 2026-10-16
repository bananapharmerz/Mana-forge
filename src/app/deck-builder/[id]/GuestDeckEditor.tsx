"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Deck } from "@/lib/deckTypes";
import { GUEST_DECK_EVENT, loadGuestDeck } from "@/lib/guestDeck";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import DeckEditor from "./DeckEditor";

// Once a guest has put real work in, gently remind them the draft only lives in this browser.
// Deliberately late and dismiss-once: the sidebar already says "guest draft", so this is only a
// safety net against losing real work, not a sign-up nag.
const NUDGE_AT = 25;
const count = (d: Deck | null) => (d ? d.cards.reduce((n, c) => n + (c.quantity ?? 1), 0) + (d.commander ? 1 : 0) : 0);

export default function GuestDeckEditor() {
  const router = useRouter();
  const [deck, setDeck] = useState<Deck | null | undefined>(undefined);
  const [cards, setCards] = useState(0);
  // Remembered across navigations and visits: once they dismiss it, it stays gone.
  const [dismissed, setDismissed] = useLocalStorageState<boolean>("mf-guest-save-hidden", false);

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
      {cards >= NUDGE_AT && !dismissed && (
        <div className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-2xl flex-wrap items-center gap-3 rounded-xl border border-gold/50 bg-[#141009]/95 px-4 py-3 text-sm text-[#f3e9cf] shadow-2xl backdrop-blur">
          <p className="min-w-0 flex-1">
            <b>Nice — {cards} cards in.</b> This draft lives in this browser only. You can save it to an account whenever you want to keep it.
          </p>
          <Link
            href="/signup?callbackUrl=/deck-builder"
            className="shrink-0 rounded-md bg-gold px-3 py-1.5 font-semibold text-black hover:bg-gold-bright"
          >
            Save it
          </Link>
          <button onClick={() => setDismissed(true)} aria-label="Hide this reminder" className="shrink-0 text-[#a99c7c] hover:text-[#f3e9cf]">
            ✕
          </button>
        </div>
      )}
    </>
  );
}
