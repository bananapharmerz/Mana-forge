"use client";

import { useState } from "react";
import { useCardSelection } from "./CardSelectionContext";
import { ManaCost, ManaText } from "./ManaText";
import type { DeckCard } from "@/lib/deckTypes";

// One face of a card, for the text panel (double-faced cards, adventures and split cards list both).
export interface CardFaceDetail {
  name: string;
  typeLine?: string;
  oracle?: string;
}

// Everything the detail popup shows, built server-side from a Scryfall card so the whole raw card
// doesn't have to cross to the browser for every tile.
export interface CardDetail {
  name: string;
  typeLine: string;
  manaCost?: string;
  frontImg?: string;
  backImg?: string; // only set for true double-faced cards (transform / MDFC / battle) — enables flip
  oracle?: string;
  faces?: CardFaceDetail[];
  priceUsd?: string | null;
  priceEur?: string | null;
  scryfallUri?: string;
}

export interface CardStats {
  pctDecks?: number; // 0–100, "% of decks"
  synergy?: number; // Scryfall/EDHREC synergy as a fraction, e.g. 0.17
  numDecks?: number;
}

const money = (v: string | null | undefined, sym: string) => {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? `${sym}${n.toFixed(2)}` : null;
};

export default function CardDetailModal({
  detail,
  deckCard,
  stats,
  onClose,
}: {
  detail: CardDetail;
  deckCard: DeckCard;
  stats?: CardStats;
  onClose: () => void;
}) {
  const { isSelected, toggle } = useCardSelection();
  const selected = isSelected(deckCard.scryfallId);
  const [showBack, setShowBack] = useState(false);
  const img = showBack && detail.backImg ? detail.backImg : detail.frontImg;

  const usd = money(detail.priceUsd, "$");
  const eur = money(detail.priceEur, "€");
  const faces = detail.faces && detail.faces.length > 1 ? detail.faces : null;

  const Stat = ({ label, value }: { label: string; value: string }) => (
    <div className="flex flex-col items-center rounded-md bg-surface px-3 py-2">
      <span className="text-sm font-semibold text-foreground">{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-muted">{label}</span>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={detail.name}
    >
      <div
        className="card-frame flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden sm:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Card image, with a flip button for double-faced cards */}
        <div className="relative shrink-0 bg-surface-raised p-4 sm:w-64">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt={detail.name} className="mx-auto w-48 rounded-[4.5%] shadow-lg sm:w-full" />
          ) : (
            <div className="mx-auto flex aspect-[5/7] w-48 items-center justify-center rounded-[4.5%] bg-surface text-xs text-muted sm:w-full">
              No image
            </div>
          )}
          {detail.backImg && (
            <button
              type="button"
              onClick={() => setShowBack((s) => !s)}
              className="mx-auto mt-3 flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-gold"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {showBack ? "Show front" : "Flip card"}
            </button>
          )}
        </div>

        {/* Details */}
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-display text-lg font-semibold text-foreground">{detail.name}</h3>
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                {detail.typeLine}
                {detail.manaCost && <ManaCost cost={detail.manaCost} className="text-sm" />}
              </p>
            </div>
            <button onClick={onClose} aria-label="Close" className="shrink-0 text-muted hover:text-foreground">
              ✕
            </button>
          </div>

          {(stats?.pctDecks != null || stats?.synergy != null || stats?.numDecks != null) && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {stats?.pctDecks != null && <Stat label="of decks" value={`${stats.pctDecks.toFixed(0)}%`} />}
              {stats?.synergy != null && <Stat label="synergy" value={`${stats.synergy >= 0 ? "+" : ""}${(stats.synergy * 100).toFixed(0)}%`} />}
              {stats?.numDecks != null && <Stat label="decks" value={stats.numDecks.toLocaleString()} />}
            </div>
          )}

          {(usd || eur) && (
            <div className="mt-3 flex gap-4 text-sm">
              {usd && <span className="text-foreground">{usd}</span>}
              {eur && <span className="text-muted">{eur}</span>}
            </div>
          )}

          <div className="mt-4 space-y-3 text-sm leading-relaxed text-foreground/90">
            {faces ? (
              faces.map((f, i) => (
                <div key={i} className={i > 0 ? "border-t border-border pt-3" : ""}>
                  <p className="text-xs font-semibold text-gold-bright">
                    {f.name}
                    {f.typeLine ? ` — ${f.typeLine}` : ""}
                  </p>
                  {f.oracle && <p className="mt-1 whitespace-pre-line"><ManaText text={f.oracle} /></p>}
                </div>
              ))
            ) : (
              detail.oracle && <p className="whitespace-pre-line"><ManaText text={detail.oracle} /></p>
            )}
          </div>

          <div className="mt-auto flex items-center gap-3 pt-5">
            <button
              type="button"
              onClick={() => toggle(deckCard)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                selected ? "border border-gold bg-gold/15 text-gold-bright" : "bg-gold text-black hover:bg-gold-bright"
              }`}
            >
              {selected ? "✓ Added — tap to remove" : "Add to deck"}
            </button>
            {detail.scryfallUri && (
              <a
                href={detail.scryfallUri}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted underline hover:text-foreground"
              >
                View on Scryfall
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
