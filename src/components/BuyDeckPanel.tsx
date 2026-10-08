"use client";

import { useState } from "react";
import { decklistText, type Deck } from "@/lib/deckTypes";

export default function BuyDeckPanel({ deck }: { deck: Deck }) {
  const [copied, setCopied] = useState(false);

  async function copyDecklist() {
    await navigator.clipboard.writeText(decklistText(deck));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="card-frame mt-4 p-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
        Buy This Deck
      </h3>
      <button
        onClick={copyDecklist}
        className="w-full rounded-md border border-border px-3 py-2 text-xs text-foreground hover:border-gold"
      >
        {copied ? "Copied ✓" : "Copy Decklist"}
      </button>
      <a
        href="https://www.tcgplayer.com/massentry"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 block w-full rounded-md border border-border px-3 py-2 text-center text-xs text-foreground hover:border-gold"
      >
        Open TCGPlayer Mass Entry ↗
      </a>
      <a
        href="https://www.cardkingdom.com/builder"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 block w-full rounded-md border border-border px-3 py-2 text-center text-xs text-foreground hover:border-gold"
      >
        Open Card Kingdom Buildatron ↗
      </a>
      <p className="mt-2 text-[10px] text-muted">
        Copy your list, then paste it into either site to price out and buy.
      </p>
    </div>
  );
}
