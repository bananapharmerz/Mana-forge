"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

// A specific "Partner with X" pairing shown as one tile: the front card sits large and
// top-left, the back card peeks out at 75% scale from behind, bottom-right — the whole stack
// stays inside the same aspect-[5/7] box a normal single-card tile uses. Hovering the back card
// brings it to the front; the swap button (top left) does the same for touch screens and keeps
// working when the pointer is already over the card.
const HOVER_SWAP_DELAY_MS = 1500;

export default function PartnerCardStack({
  cardName,
  cardImg,
  partnerName,
  partnerImg,
  sizes = "(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 16vw",
}: {
  cardName: string;
  cardImg?: string;
  partnerName: string;
  partnerImg?: string;
  sizes?: string;
}) {
  const [swapped, setSwapped] = useState(false);
  // The pointer has to rest on the back card for a moment before it comes forward, so sweeping
  // across a tile doesn't shuffle it. The two slots are fixed elements (only their images trade
  // places), so the pointer stays inside the same back slot after a swap — no second mouseenter
  // fires, and it takes leaving and re-entering to swap again.
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const front = swapped ? { name: partnerName, img: partnerImg } : { name: cardName, img: cardImg };
  const back = swapped ? { name: cardName, img: cardImg } : { name: partnerName, img: partnerImg };

  function swap() {
    setSwapped((s) => !s);
  }

  function cancelHoverSwap() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
  }

  useEffect(() => cancelHoverSwap, []);

  return (
    <div className="relative h-full w-full">
      {back.img && (
        <div
          onMouseEnter={() => {
            cancelHoverSwap();
            hoverTimer.current = setTimeout(swap, HOVER_SWAP_DELAY_MS);
          }}
          onMouseLeave={cancelHoverSwap}
          className="absolute bottom-0 right-0 z-10 w-[75%] overflow-hidden rounded-md shadow-md"
        >
          <Image
            src={back.img}
            alt={back.name}
            width={480}
            height={670}
            sizes={sizes}
            className="w-full object-cover"
          />
        </div>
      )}
      <div className="absolute left-0 top-0 z-20 w-[85%] overflow-hidden rounded-md shadow-lg">
        {front.img ? (
          <Image
            src={front.img}
            alt={front.name}
            width={480}
            height={670}
            sizes={sizes}
            className="w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[5/7] items-center justify-center bg-surface-raised text-[10px] text-muted">
            No image
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          swap();
        }}
        title={`Swap to show ${back.name} on top`}
        className="absolute left-1 top-1 z-30 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface/90 text-foreground shadow hover:border-gold hover:text-gold-bright"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M7 7h10l-3-3M17 17H7l3 3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
