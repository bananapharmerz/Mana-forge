"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { searchPartnerCandidates } from "@/app/actions/commanders";
import { PARTNER_PICK_PROMPT, type PartnerKind } from "@/lib/partnerMechanics";
import type { DeckCard } from "@/lib/deckTypes";

// "Pick a partner" step for the "+" button on a card whose pairing has no single named partner
// (plain Partner, Friends forever, Choose a Background, Doctor's companion): lists only cards that
// can legally pair with it. Rendered through a portal because the "+" lives inside a tile link —
// clicks in here must never navigate.
export default function PartnerPicker({
  card,
  kind,
  onPick,
  onSkip,
  onClose,
}: {
  card: DeckCard;
  kind: PartnerKind;
  onPick: (partner: DeckCard) => void;
  onSkip: () => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  // Results are tagged with the search they answer, so a stale list is "loading" for a new query
  // without having to reset state inside the effect.
  const searchKey = `${kind}|${card.name}|${query}`;
  const [loaded, setLoaded] = useState<{ key: string; cards: DeckCard[] } | null>(null);
  const results = loaded?.key === searchKey ? loaded.cards : null;

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(
      async () => {
        const found = await searchPartnerCandidates(kind, card.name, query);
        if (!cancelled) setLoaded({ key: searchKey, cards: found });
      },
      query ? 300 : 0
    );
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [kind, card.name, query, searchKey]);

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="card-frame flex max-h-[85vh] w-full max-w-2xl flex-col bg-surface p-5"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">{card.name}</h2>
            <p className="text-xs text-muted">{PARTNER_PICK_PROMPT[kind]}</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted hover:text-foreground" aria-label="Close">
            ✕
          </button>
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name..."
          className="mb-3 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-gold focus:outline-none"
          autoFocus
        />

        <div className="flex-1 overflow-y-auto">
          {results === null ? (
            <p className="py-6 text-center text-sm text-muted">Loading...</p>
          ) : results.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No matching cards.</p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {results.map((c) => (
                <button
                  key={c.scryfallId}
                  type="button"
                  onClick={() => onPick(c)}
                  title={`Pair with ${c.name}`}
                  className="group overflow-hidden rounded-md border border-border text-left transition-colors hover:border-gold"
                >
                  {c.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.imageUrl} alt={c.name} className="aspect-[5/7] w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[5/7] items-center justify-center bg-surface-raised text-[10px] text-muted">
                      {c.name}
                    </div>
                  )}
                  <p className="truncate px-1.5 py-1 text-[11px] text-foreground group-hover:text-gold-bright">
                    {c.name}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onSkip}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-muted hover:border-gold hover:text-foreground"
          >
            Add without a partner
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
