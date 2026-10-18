"use client";

import { useState } from "react";
import { useCardSelection } from "./CardSelectionContext";
import CardDetailModal from "./CardDetailModal";
import type { CardDetail, CardStats } from "@/lib/cardDetail";
import type { DeckCard } from "@/lib/deckTypes";

// The card image as a button: clicking it opens the EDHREC-style detail popup. On commander pages
// adding a card toggles it in the deck selection, so the add handler comes from the selection
// context here. The quick-add "+" lives separately in the tile corner.
export default function CardDetailButton({
  detail,
  deckCard,
  stats,
  img,
  alt,
}: {
  detail: CardDetail;
  deckCard: DeckCard;
  stats?: CardStats;
  img?: string;
  alt: string;
}) {
  const [open, setOpen] = useState(false);
  const { isSelected, toggle } = useCardSelection();
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block h-full w-full"
        aria-label={`Details for ${alt}`}
      >
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={alt} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center p-2 text-center text-[10px] text-muted">
            {alt}
          </div>
        )}
      </button>
      {open && (
        <CardDetailModal
          name={deckCard.name}
          detail={detail}
          stats={stats}
          onAdd={() => toggle(deckCard)}
          added={isSelected(deckCard.scryfallId)}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
