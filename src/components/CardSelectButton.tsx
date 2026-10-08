"use client";

import { useState } from "react";
import { useCardSelection } from "./CardSelectionContext";
import PartnerPicker from "./PartnerPicker";
import type { DeckCard } from "@/lib/deckTypes";
import type { PartnerKind } from "@/lib/partnerMechanics";

// `partner` is set for a named "Partner with X" pair — the button then selects (or deselects) both
// cards together, since the pair is always played as a unit. `pickKind` is set for a card whose
// pairing has no single named partner (plain Partner, Friends forever, Choose a Background,
// Doctor's companion): the first click opens a picker to choose the second commander.
export default function CardSelectButton({
  card,
  partner,
  pickKind,
  companion,
}: {
  card: DeckCard;
  partner?: DeckCard;
  pickKind?: PartnerKind | null;
  // Set on the Companion tab: the card is added as the deck's companion, not its commander.
  companion?: boolean;
}) {
  const { isSelected, toggle, togglePair } = useCardSelection();
  const [picking, setPicking] = useState(false);
  const group = partner ? [card, partner] : [card];
  const selected = group.every((c) => isSelected(c.scryfallId));
  const choosesPartner = !partner && !!pickKind;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (partner) togglePair(card, partner);
          else if (choosesPartner && !selected) setPicking(true);
          else toggle(card, { companion });
        }}
        title={
          selected
            ? partner
              ? "Remove both partners from selection"
              : "Remove from selection"
            : partner
              ? "Add both partners to selection"
              : choosesPartner
                ? "Add to selection (choose a partner)"
                : "Add to selection"
        }
        aria-label={selected ? "Remove from selection" : "Add to selection"}
        className={`absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border shadow-sm transition-colors ${
          selected
            ? "border-gold bg-gold text-black"
            : "border-border bg-surface/90 text-muted hover:border-gold hover:text-foreground"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5}>
          {selected ? (
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          )}
        </svg>
      </button>
      {picking && pickKind && (
        <PartnerPicker
          card={card}
          kind={pickKind}
          onPick={(picked) => {
            togglePair(card, picked);
            setPicking(false);
          }}
          onSkip={() => {
            toggle(card);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </>
  );
}
