"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Deck } from "@/lib/deckTypes";
import { loadGuestDeck } from "@/lib/guestDeck";
import DeckEditor from "./DeckEditor";

export default function GuestDeckEditor() {
  const router = useRouter();
  const [deck, setDeck] = useState<Deck | null | undefined>(undefined);

  useEffect(() => {
    const d = loadGuestDeck();
    // Reading browser storage has to wait until we're in the browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDeck(d);
    if (!d) router.replace("/deck-builder");
  }, [router]);

  if (!deck) return <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted">Loading your draft…</div>;
  return <DeckEditor initialDeck={deck} guest />;
}
