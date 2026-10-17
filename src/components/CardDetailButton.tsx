"use client";

import { useState } from "react";
import CardDetailModal, { type CardDetail, type CardStats } from "./CardDetailModal";
import type { DeckCard } from "@/lib/deckTypes";

// The card image as a button: clicking it opens the EDHREC-style detail popup (big image with a
// flip for double-faced cards, oracle text, play stats, prices and an add button). The quick-add
// "+" lives separately in the tile corner.
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
      {open && <CardDetailModal detail={detail} deckCard={deckCard} stats={stats} onClose={() => setOpen(false)} />}
    </>
  );
}
