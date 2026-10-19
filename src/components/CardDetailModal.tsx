"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ManaCost, ManaText } from "./ManaText";
import type { CardDetail, CardStats } from "@/lib/cardDetail";

const money = (v: string | null | undefined, sym: string) => {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? `${sym}${n.toFixed(2)}` : null;
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center rounded-md bg-surface px-3 py-2">
      <span className="text-sm font-semibold text-foreground">{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-muted">{label}</span>
    </div>
  );
}

// The EDHREC-style card detail popup. Either given a `detail` (commander page tiles already have
// it) or just a `name` — in which case it fetches the detail from /api/card. The add button is
// generic: pass `onAdd` (+ `added`) and the parent decides what adding means (a deck-selection
// toggle on commander pages, the deck-builder's add handler in the builder). Give it a `key` of the
// card name at the call site so it starts fresh when a different card is opened.
export default function CardDetailModal({
  name,
  detail,
  stats,
  onAdd,
  added,
  onClose,
}: {
  name: string;
  detail?: CardDetail;
  stats?: CardStats;
  onAdd?: () => void;
  added?: boolean;
  onClose: () => void;
}) {
  const [fetched, setFetched] = useState<CardDetail | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [showBack, setShowBack] = useState(false);

  useEffect(() => {
    if (detail) return; // already have what we need
    let cancelled = false;
    fetch(`/api/card?name=${encodeURIComponent(name)}`)
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (cancelled) return;
        if (!r.ok || !data) setLoadErr(data?.error ?? "Couldn't load this card.");
        else setFetched(data as CardDetail);
      })
      .catch(() => {
        if (!cancelled) setLoadErr("Couldn't load this card.");
      });
    return () => {
      cancelled = true;
    };
  }, [name, detail]);

  const d = detail ?? fetched;
  const img = d ? (showBack && d.backImg ? d.backImg : d.frontImg) : undefined;
  const usd = money(d?.priceUsd, "$");
  const eur = money(d?.priceEur, "€");
  const faces = d?.faces && d.faces.length > 1 ? d.faces : null;

  const modal = (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={name}
    >
      <div
        className="card-frame flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden sm:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Card image, with a flip button for double-faced cards */}
        <div className="relative shrink-0 bg-surface-raised p-4 sm:w-64">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt={name} className="mx-auto w-48 rounded-[4.5%] shadow-lg sm:w-full" />
          ) : (
            <div className="mx-auto flex aspect-[5/7] w-48 items-center justify-center rounded-[4.5%] bg-surface text-xs text-muted sm:w-full">
              {loadErr ?? "Loading…"}
            </div>
          )}
          {d?.backImg && (
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
              <h3 className="font-display text-lg font-semibold text-foreground">{d?.name ?? name}</h3>
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                {d?.typeLine}
                {d?.manaCost && <ManaCost cost={d.manaCost} className="text-sm" />}
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
              d?.oracle && <p className="whitespace-pre-line"><ManaText text={d.oracle} /></p>
            )}
            {loadErr && !d && <p className="text-sm text-down">{loadErr}</p>}
          </div>

          <div className="mt-auto flex items-center gap-3 pt-5">
            {onAdd && (
              <button
                type="button"
                onClick={onAdd}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  added ? "border border-gold bg-gold/15 text-gold-bright" : "bg-gold text-black hover:bg-gold-bright"
                }`}
              >
                {added ? "✓ Added — tap to remove" : "Add to deck"}
              </button>
            )}
            {d?.scryfallUri && (
              <a
                href={d.scryfallUri}
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

  // Portal to <body> so the fixed overlay centres on the viewport, not on a transformed ancestor
  // (inside the deck editor that was dropping it at the middle of the page).
  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}
