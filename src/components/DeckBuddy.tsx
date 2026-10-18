"use client";

import { useEffect, useState } from "react";
import Ember from "@/components/Ember";
import CardDetailModal from "@/components/CardDetailModal";

type ComboSuggestion = {
  add: string;
  partners: string[];
  imageUrl?: string;
  priceUsd: number | null;
  reason: string;
  gameChanger: boolean;
};
type AdvisorPick = {
  name: string;
  imageUrl?: string;
  priceUsd: number | null;
  reason: string;
  playRatePct: number;
  gameChanger: boolean;
};
type DeckAdvice = { commander: string; combos: ComboSuggestion[]; synergy: AdvisorPick[] };

const money = (n: number | null) => (n == null ? "—" : `$${n.toFixed(2)}`);

const BUDGETS: { key: string; label: string; max?: number }[] = [
  { key: "any", label: "Any" },
  { key: "5", label: "≤$5", max: 5 },
  { key: "1", label: "≤$1", max: 1 },
];

export default function DeckBuddy({
  commander,
  have,
  onAdd,
}: {
  commander?: string;
  have: string[];
  onAdd: (name: string) => void;
}) {
  const [advice, setAdvice] = useState<DeckAdvice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [budgetKey, setBudgetKey] = useState("any");
  // Clicking a pick opens the detail popup (it fetches the card by name); openPct carries the
  // play-rate for the stats row when we have it.
  const [openName, setOpenName] = useState<string | null>(null);
  const [openPct, setOpenPct] = useState<number | undefined>(undefined);

  const haveKey = have.join("|");
  // Match by front face, so a double-faced card already in the deck ("Malakir Rebirth // Malakir
  // Mire") is recognised from the recommendation's front-face name ("Malakir Rebirth").
  const haveFronts = new Set(have.map((h) => h.split(" // ")[0].trim().toLowerCase()));
  const isAdded = (n: string) => haveFronts.has(n.split(" // ")[0].trim().toLowerCase());

  useEffect(() => {
    if (!commander) return;
    let cancelled = false;
    const max = BUDGETS.find((b) => b.key === budgetKey)?.max;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/deck-doctor/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ commander, have, maxCardUsd: max }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data?.error ?? "Couldn't get recommendations.");
          setAdvice(null);
        } else {
          setAdvice(data as DeckAdvice);
        }
      } catch {
        if (!cancelled) setError("Couldn't reach Ember — try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // haveKey stands in for the (new each render) have array; commander/budget also refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commander, haveKey, budgetKey]);

  if (!commander) return null;

  const hasPicks = advice && (advice.combos.length > 0 || advice.synergy.length > 0);

  return (
    <details className="card-frame mt-4 p-4" open>
      <summary className="flex cursor-pointer select-none items-center gap-2">
        <Ember mood="hyped" size={28} title="Ember, your deck buddy" />
        <span className="text-xs font-semibold uppercase tracking-wide text-gold-bright">Ember&apos;s picks</span>
        {loading && <span className="ml-auto text-[10px] text-muted">thinking…</span>}
      </summary>

      <div className="mt-3 flex items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wide text-muted">Budget</span>
        {BUDGETS.map((b) => (
          <button
            key={b.key}
            type="button"
            onClick={() => setBudgetKey(b.key)}
            aria-pressed={b.key === budgetKey}
            className={
              b.key === budgetKey
                ? "rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-black"
                : "rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted hover:border-gold hover:text-foreground"
            }
          >
            {b.label}
          </button>
        ))}
      </div>

      {error && <p className="mt-3 text-[11px] text-down">{error}</p>}

      {advice && advice.combos.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">Combos to finish</p>
          <div className="flex flex-col gap-1.5">
            {advice.combos.map((c) => (
              <Row
                key={`combo-${c.add}`}
                name={c.add}
                imageUrl={c.imageUrl}
                reason={c.reason}
                price={c.priceUsd}
                gameChanger={c.gameChanger}
                highlight
                added={isAdded(c.add)}
                onOpen={() => {
                  setOpenName(c.add);
                  setOpenPct(undefined);
                }}
                onAdd={() => onAdd(c.add)}
              />
            ))}
          </div>
        </div>
      )}

      {advice && advice.synergy.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">Played in {commander.split(",")[0]} decks</p>
          <div className="flex flex-col gap-1.5">
            {advice.synergy.map((p) => (
              <Row
                key={`syn-${p.name}`}
                name={p.name}
                imageUrl={p.imageUrl}
                reason={p.reason}
                price={p.priceUsd}
                gameChanger={p.gameChanger}
                added={isAdded(p.name)}
                onOpen={() => {
                  setOpenName(p.name);
                  setOpenPct(p.playRatePct);
                }}
                onAdd={() => onAdd(p.name)}
              />
            ))}
          </div>
        </div>
      )}

      {advice && !hasPicks && !loading && (
        <p className="mt-3 text-[11px] text-muted">Nothing new to suggest right now — add a few cards and Ember will chime in.</p>
      )}

      {openName && (
        <CardDetailModal
          key={openName}
          name={openName}
          stats={openPct != null ? { pctDecks: openPct } : undefined}
          onAdd={() => onAdd(openName)}
          added={isAdded(openName)}
          onClose={() => setOpenName(null)}
        />
      )}
    </details>
  );
}

function Row({
  name,
  imageUrl,
  reason,
  price,
  gameChanger,
  highlight,
  added,
  onOpen,
  onAdd,
}: {
  name: string;
  imageUrl?: string;
  reason: string;
  price: number | null;
  gameChanger: boolean;
  highlight?: boolean;
  added?: boolean;
  onOpen: () => void;
  onAdd: () => void;
}) {
  return (
    <div className={`flex items-start gap-2 rounded-md border p-1.5 ${highlight ? "border-gold/50 bg-gold/5" : "border-border"}`}>
      <button type="button" onClick={onOpen} className="shrink-0" aria-label={`Details for ${name}`}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={name} className="h-12 w-[34px] rounded-sm object-cover" loading="lazy" />
        ) : (
          <div className="h-12 w-[34px] rounded-sm bg-surface-raised" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <button type="button" onClick={onOpen} className="block max-w-full text-left">
          <span className="block truncate text-[11px] font-semibold text-foreground hover:text-gold-bright" title={name}>
            {name}
            {gameChanger && <span className="ml-1 rounded bg-[#7a2bd0] px-1 text-[9px] font-bold text-white align-middle">GC</span>}
          </span>
        </button>
        <p className="mt-0.5 text-[10px] leading-tight text-muted">{reason}</p>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[10px] text-muted">{money(price)}</span>
          {added ? (
            <span className="rounded border border-gold/50 px-2 py-0.5 text-[10px] font-bold text-gold-bright">✓ In deck</span>
          ) : (
            <button
              onClick={onAdd}
              className="rounded bg-gold px-2 py-0.5 text-[10px] font-bold text-black hover:bg-gold-bright"
            >
              + Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
