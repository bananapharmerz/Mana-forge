"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Ember from "./Ember";
import FoilTilt from "./fx/FoilTilt";
import { useLocalStorageState } from "@/lib/useLocalStorageState";

type Rarity = "common" | "uncommon" | "rare" | "mythic";

interface BoosterSet {
  code: string;
  name: string;
  released_at?: string;
  card_count: number;
  icon_svg_uri: string;
  set_type: string;
}

interface PackCard {
  id: string;
  name: string;
  image?: string;
  backImage?: string;
  rarity: Rarity;
  foil: boolean;
  setName: string;
  collectorNumber?: string;
  priceUsd: number | null;
  scryfallUri: string;
}

interface OpenedPack {
  setCode: string;
  setName: string;
  cards: PackCard[];
}

interface PackStats {
  packs: number;
  value: number;
  best: { name: string; image?: string; price: number; foil: boolean } | null;
}
const DEFAULT_STATS: PackStats = { packs: 0, value: 0, best: null };

const RARITY_GLOW: Record<Rarity, string> = {
  common: "rgba(150,156,162,0.55)",
  uncommon: "rgba(150,186,214,0.6)",
  rare: "rgba(181,135,42,0.75)",
  mythic: "rgba(226,89,43,0.8)",
};
const RARITY_LABEL: Record<Rarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  mythic: "Mythic",
};
const RARITY_CHIP: Record<Rarity, string> = {
  common: "bg-[#6b7076] text-white",
  uncommon: "bg-[#5b7f9e] text-white",
  rare: "bg-gold text-black",
  mythic: "bg-[#d1491f] text-white",
};

function money(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  return `$${n.toFixed(2)}`;
}

type Phase = "idle" | "opening" | "reveal" | "done";

export default function PackOpener() {
  const [sets, setSets] = useState<BoosterSet[]>([]);
  const [setsError, setSetsError] = useState(false);
  const [selected, setSelected] = useState<string>("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");

  const [phase, setPhase] = useState<Phase>("idle");
  const [pack, setPack] = useState<OpenedPack | null>(null);
  const [revealIdx, setRevealIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tearing, setTearing] = useState(false);

  const [stats, setStats] = useLocalStorageState<PackStats>("mf-pack-stats", DEFAULT_STATS);
  const recordedRef = useRef<string | null>(null);

  useEffect(() => {
    fetch("/api/packs/sets")
      .then((r) => r.json())
      .then((d) => {
        const list: BoosterSet[] = d.sets ?? [];
        setSets(list);
        if (list.length) setSelected((s) => s || list[0].code);
        if (!list.length) setSetsError(true);
      })
      .catch(() => setSetsError(true));
  }, []);

  const selectedSet = useMemo(() => sets.find((s) => s.code === selected), [sets, selected]);
  const filteredSets = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sets;
    return sets.filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
  }, [sets, query]);

  async function rip() {
    if (!selected || phase === "opening") return;
    setError(null);
    setPhase("opening");
    setTearing(true);
    try {
      const [res] = await Promise.all([
        fetch("/api/packs/open", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ set: selected }),
        }),
        new Promise((r) => setTimeout(r, 520)), // let the wrapper tear
      ]);
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Couldn't open that pack — try again.");
        setPhase("idle");
        setTearing(false);
        return;
      }
      const opened = data as OpenedPack;
      recordedRef.current = null;
      setPack(opened);
      setRevealIdx(0);
      setFlipped(false);
      setPhase("reveal");
      setTearing(false);
      // flip the first card after it mounts
      requestAnimationFrame(() => setTimeout(() => setFlipped(true), 180));
    } catch {
      setError("Network hiccup — try again.");
      setPhase("idle");
      setTearing(false);
    }
  }

  function recordPack(p: OpenedPack) {
    if (recordedRef.current === p.setCode + p.cards.map((c) => c.id).join()) return;
    recordedRef.current = p.setCode + p.cards.map((c) => c.id).join();
    const value = p.cards.reduce((s, c) => s + (c.priceUsd ?? 0), 0);
    let best = p.cards[0];
    for (const c of p.cards) if ((c.priceUsd ?? 0) > (best.priceUsd ?? 0)) best = c;
    setStats((prev) => {
      const prevBest = prev.best;
      const newBest =
        !prevBest || (best.priceUsd ?? 0) > prevBest.price
          ? { name: best.name, image: best.image, price: best.priceUsd ?? 0, foil: best.foil }
          : prevBest;
      return { packs: prev.packs + 1, value: prev.value + value, best: newBest };
    });
  }

  function nextCard() {
    if (!pack) return;
    if (revealIdx >= pack.cards.length - 1) {
      recordPack(pack);
      setPhase("done");
      return;
    }
    setFlipped(false);
    setRevealIdx((i) => i + 1);
    requestAnimationFrame(() => setTimeout(() => setFlipped(true), 120));
  }

  function revealAll() {
    if (!pack) return;
    recordPack(pack);
    setPhase("done");
  }

  function ripAgain() {
    setPack(null);
    setPhase("idle");
    setError(null);
  }

  const packValue = pack ? pack.cards.reduce((s, c) => s + (c.priceUsd ?? 0), 0) : 0;
  const bestCard = useMemo(() => {
    if (!pack) return null;
    let b = pack.cards[0];
    for (const c of pack.cards) if ((c.priceUsd ?? 0) > (b.priceUsd ?? 0)) b = c;
    return b;
  }, [pack]);

  // ---------------------------------------------------------------- set picker
  const picker = (
    <div className="relative">
      <button
        type="button"
        onClick={() => setPickerOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-left hover:border-gold"
      >
        <span className="flex items-center gap-3 min-w-0">
          {selectedSet?.icon_svg_uri && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selectedSet.icon_svg_uri} alt="" className="h-6 w-6 shrink-0" />
          )}
          <span className="min-w-0">
            <span className="block truncate font-semibold text-foreground">
              {selectedSet?.name ?? (setsError ? "Couldn't load sets" : "Loading sets…")}
            </span>
            {selectedSet?.released_at && (
              <span className="block text-xs text-muted">
                {selectedSet.code.toUpperCase()} · {selectedSet.released_at.slice(0, 4)} · {selectedSet.card_count} cards
              </span>
            )}
          </span>
        </span>
        <span className="shrink-0 text-muted">▾</span>
      </button>

      {pickerOpen && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-xl">
          <div className="border-b border-border p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sets…"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-gold focus:outline-none"
            />
          </div>
          <ul className="max-h-72 overflow-y-auto">
            {filteredSets.map((s) => (
              <li key={s.code}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(s.code);
                    setPickerOpen(false);
                    setQuery("");
                  }}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-surface-raised ${
                    s.code === selected ? "bg-surface-raised" : ""
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.icon_svg_uri} alt="" className="h-5 w-5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate font-medium text-foreground">{s.name}</span>
                  <span className="shrink-0 text-xs text-muted">{s.released_at?.slice(0, 4)}</span>
                </button>
              </li>
            ))}
            {filteredSets.length === 0 && (
              <li className="px-3 py-4 text-center text-sm text-muted">No sets match “{query}”.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );

  // ---------------------------------------------------------------- idle screen
  if (phase === "idle" || phase === "opening") {
    return (
      <div className="mx-auto grid max-w-4xl gap-10 px-4 py-10 sm:px-6 md:grid-cols-[minmax(0,360px)_1fr]">
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Choose a set</p>
            {picker}
          </div>

          {error && (
            <p className="rounded-md border border-[#d1491f]/40 bg-[#d1491f]/10 px-3 py-2 text-sm text-[#d1491f]">{error}</p>
          )}

          <StatsStrip stats={stats} onReset={() => setStats(DEFAULT_STATS)} />
        </div>

        {/* The pack wrapper */}
        <div className="flex flex-col items-center justify-center">
          <button
            type="button"
            onClick={rip}
            disabled={!selected || phase === "opening"}
            aria-label="Rip this pack open"
            className="group relative aspect-[5/7] w-56 cursor-pointer rounded-xl disabled:cursor-wait sm:w-64"
          >
            <div
              className={`pack-wrap flex h-full w-full flex-col items-center justify-between rounded-xl border border-gold/50 p-5 text-center shadow-lg transition-transform group-hover:-translate-y-1 ${
                tearing ? "pack-tearing" : ""
              }`}
              style={{
                background:
                  "linear-gradient(160deg, #241a0c 0%, #3a2a12 38%, #120d06 100%)",
              }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gold-bright/90">
                Mana Forge
              </span>
              <div className="flex flex-col items-center gap-3">
                <Ember size={72} mood="hyped" title="Mana Forge" />
                {selectedSet?.icon_svg_uri && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedSet.icon_svg_uri}
                    alt=""
                    className="h-8 w-8 opacity-90 [filter:invert(85%)_sepia(40%)_saturate(600%)_hue-rotate(5deg)]"
                  />
                )}
                <span className="text-sm font-bold text-[#f3e6c6]">{selectedSet?.name ?? "Booster"}</span>
              </div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#caa968]">Booster Pack</span>
            </div>
          </button>

          <button
            type="button"
            onClick={rip}
            disabled={!selected || phase === "opening"}
            className="mt-6 rounded-lg bg-gold px-8 py-3 text-base font-bold text-black shadow hover:bg-gold-bright disabled:opacity-50"
          >
            {phase === "opening" ? "Ripping…" : "Rip Pack"}
          </button>
          <p className="mt-3 text-center text-xs text-muted">
            Free to rip, as many as you like. Pulls are virtual — no cards required.
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- reveal screen
  if (phase === "reveal" && pack) {
    const card = pack.cards[revealIdx];
    const isLast = revealIdx === pack.cards.length - 1;
    const big = card.rarity === "rare" || card.rarity === "mythic" || card.foil;
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-8 sm:px-6">
        <div className="mb-4 flex items-center gap-3 text-sm text-muted">
          <span className="font-semibold text-foreground">{pack.setName}</span>
          <span>·</span>
          <span>
            {revealIdx + 1} / {pack.cards.length}
          </span>
        </div>

        <div
          onClick={nextCard}
          className="relative flex w-full cursor-pointer flex-col items-center"
          role="button"
          aria-label="Reveal next card"
        >
          <div className={`relative ${card.foil ? "pack-foilring" : ""}`}>
            <div className={`pack-card3d ${flipped ? "flipped" : ""} aspect-[5/7] w-60 sm:w-72`}>
              <div className="pack-card3d-inner">
                {/* back */}
                <div className="pack-face flex items-center justify-center" style={{ background: "linear-gradient(160deg,#241a0c,#3a2a12 40%,#120d06)" }}>
                  <Ember size={88} mood="happy" title="" />
                </div>
                {/* front */}
                <div className={`pack-face pack-face-front ${flipped && big ? "pack-glowing" : ""}`} style={{ "--pg": RARITY_GLOW[card.rarity] } as CSSProperties}>
                  {card.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={card.image} alt={card.name} className="h-full w-full object-cover" draggable={false} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-surface-raised p-4 text-center text-sm text-foreground">{card.name}</div>
                  )}
                </div>
              </div>
            </div>
            {flipped && isLast && big && <BurstSparks />}
          </div>

          {flipped && (
            <div className="pack-rise mt-4 flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${RARITY_CHIP[card.rarity]}`}>
                  {RARITY_LABEL[card.rarity]}
                </span>
                {card.foil && (
                  <span className="rounded-full bg-gradient-to-r from-[#ff6fd8] via-[#7afcff] to-[#feff9c] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-black">
                    ✦ Foil
                  </span>
                )}
              </div>
              <p className="text-center font-display text-xl font-semibold text-foreground">{card.name}</p>
              <p className="text-sm text-muted">{money(card.priceUsd)}</p>
            </div>
          )}
        </div>

        {/* filmstrip of revealed-so-far */}
        <div className="mt-6 flex w-full flex-wrap justify-center gap-1.5">
          {pack.cards.map((c, i) => (
            <div
              key={c.id}
              className={`h-10 w-7 overflow-hidden rounded-sm border transition-opacity ${
                i <= revealIdx ? "border-border opacity-100" : "border-transparent opacity-20"
              }`}
              style={i <= revealIdx ? undefined : { background: "linear-gradient(160deg,#241a0c,#120d06)" }}
            >
              {i <= revealIdx && c.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.image} alt="" className="h-full w-full object-cover" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button onClick={nextCard} className="rounded-lg bg-gold px-6 py-2.5 text-sm font-bold text-black hover:bg-gold-bright">
            {isLast ? "See your pack →" : "Next card"}
          </button>
          <button onClick={revealAll} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted hover:border-gold hover:text-foreground">
            Reveal all
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">Tap the card to flip the next one.</p>
      </div>
    );
  }

  // ---------------------------------------------------------------- done / summary
  if (phase === "done" && pack) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col items-center text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{pack.setName} · your pull</p>
          <p className="mt-1 font-display text-4xl font-bold text-gold-bright">{money(packValue)}</p>
          {bestCard && (
            <p className="mt-1 text-sm text-muted">
              Best: <span className="font-semibold text-foreground">{bestCard.name}</span> {money(bestCard.priceUsd)}
              {bestCard.foil ? " ✦" : ""}
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
          {[...pack.cards]
            .sort((a, b) => (b.priceUsd ?? 0) - (a.priceUsd ?? 0))
            .map((c) => {
              const inner = c.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.image} alt={c.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-surface-raised p-2 text-center text-[11px] text-foreground">{c.name}</div>
              );
              return (
                <a
                  key={c.id}
                  href={c.scryfallUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block"
                  title={`${c.name} — ${money(c.priceUsd)}`}
                >
                  <div className={`aspect-[5/7] overflow-hidden rounded-md ${c.foil ? "pack-foilring" : ""}`}>
                    {c.foil ? <FoilTilt className="h-full w-full">{inner}</FoilTilt> : inner}
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-1">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full`} style={{ background: RARITY_GLOW[c.rarity] }} />
                    <span className="truncate text-[10px] text-muted">{money(c.priceUsd)}</span>
                  </div>
                </a>
              );
            })}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button onClick={rip} className="rounded-lg bg-gold px-8 py-3 text-base font-bold text-black hover:bg-gold-bright">
            Rip another
          </button>
          <button onClick={ripAgain} className="rounded-lg border border-border px-5 py-3 text-sm font-medium text-foreground hover:border-gold">
            Change set
          </button>
        </div>

        <div className="mt-8">
          <StatsStrip stats={stats} onReset={() => setStats(DEFAULT_STATS)} />
        </div>

        <p className="mx-auto mt-6 max-w-md text-center text-xs text-muted">
          Coming soon: your pulls stack into a Mana Forge collection you can build decks from — and
          Premium will rip whole boxes at once.
        </p>
      </div>
    );
  }

  return null;
}

function StatsStrip({ stats, onReset }: { stats: PackStats; onReset: () => void }) {
  if (stats.packs === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">This session</p>
        <button onClick={onReset} className="text-[11px] text-muted underline hover:text-foreground">
          reset
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <div>
          <p className="font-display text-2xl font-bold text-foreground">{stats.packs}</p>
          <p className="text-xs text-muted">packs ripped</p>
        </div>
        <div>
          <p className="font-display text-2xl font-bold text-gold-bright">${stats.value.toFixed(2)}</p>
          <p className="text-xs text-muted">total pulled</p>
        </div>
      </div>
      {stats.best && (
        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
          {stats.best.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={stats.best.image} alt="" className="h-12 w-9 shrink-0 rounded-sm object-cover" />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {stats.best.name}
              {stats.best.foil ? " ✦" : ""}
            </p>
            <p className="text-xs text-muted">best pull · ${stats.best.price.toFixed(2)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function BurstSparks() {
  // Computed once on mount (lazy initializer) so Math.random isn't called during render.
  const [sparks] = useState(() =>
    Array.from({ length: 14 }, (_, i) => {
      const ang = (i / 14) * Math.PI * 2;
      const dist = 90 + Math.random() * 70;
      return { sx: Math.cos(ang) * dist, sy: Math.sin(ang) * dist, delay: Math.random() * 0.12 };
    })
  );
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      {sparks.map((s, i) => (
        <span
          key={i}
          className="spark"
          style={{ "--sx": `${s.sx}px`, "--sy": `${s.sy}px`, animationDelay: `${s.delay}s` } as CSSProperties}
        />
      ))}
    </div>
  );
}
