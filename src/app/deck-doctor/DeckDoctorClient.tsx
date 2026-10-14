"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Ember from "@/components/Ember";
import PageHeader from "@/components/PageHeader";
import CardSearchBox from "@/components/CardSearchBox";
import { autocompleteCommanderNames } from "@/lib/scryfall";
import { importGuestDeck } from "@/app/actions/decks";
import { trackGoal } from "@/components/SiteTracker";
import { GUEST_DECK_ID, loadGuestDeck, saveGuestDeck } from "@/lib/guestDeck";
import { CATEGORY_ORDER, type Deck, type DeckCard } from "@/lib/deckTypes";

type BuiltDeck = {
  commander: DeckCard;
  cards: DeckCard[];
  meta: { totalUsd: number; landCount: number; nonlandCount: number; budgetUsd?: number; notes: string[] };
};

const BUDGETS: { key: string; label: string }[] = [
  { key: "none", label: "No budget" },
  { key: "50", label: "$50" },
  { key: "100", label: "$100" },
  { key: "250", label: "$250" },
  { key: "custom", label: "Custom" },
];

const money = (n: number | null | undefined) => (n == null ? "—" : `$${n.toFixed(2)}`);

export default function DeckDoctorClient({
  guest = false,
  deckLimit,
  deckCount,
}: {
  guest?: boolean;
  deckLimit: number | null;
  deckCount: number;
}) {
  const router = useRouter();
  const [commander, setCommander] = useState<string | null>(null);
  const [budgetKey, setBudgetKey] = useState("none");
  const [customBudget, setCustomBudget] = useState("");
  const [brewing, setBrewing] = useState(false);
  const [result, setResult] = useState<BuiltDeck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const atLimit = !guest && deckLimit !== null && deckCount >= deckLimit;

  function resolveBudget(): number | undefined {
    if (budgetKey === "none") return undefined;
    if (budgetKey === "custom") {
      const n = Number(customBudget);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    }
    return Number(budgetKey);
  }

  async function brew() {
    if (!commander) {
      setError("Pick a commander first.");
      return;
    }
    setBrewing(true);
    setError(null);
    try {
      const res = await fetch("/api/deck-doctor/brew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commander, budget: resolveBudget() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Couldn't brew that deck — try again.");
        setResult(null);
        return;
      }
      setResult(data as BuiltDeck);
    } catch {
      setError("Couldn't reach the brewer — check your connection and try again.");
    } finally {
      setBrewing(false);
    }
  }

  async function save() {
    if (!result) return;
    setSaving(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const name = `${result.commander.name} (Deck Doctor)`;
      if (guest) {
        const existing = loadGuestDeck();
        if (existing && !window.confirm("Start this brew as a new deck? Your current guest draft will be replaced.")) {
          return;
        }
        saveGuestDeck({
          id: GUEST_DECK_ID,
          name,
          commander: result.commander,
          cards: result.cards,
          cardBackUrl: null,
          isPublic: false,
          createdAt: now,
          updatedAt: now,
        });
        router.push(`/deck-builder/${GUEST_DECK_ID}`);
        return;
      }
      const draft: Deck = {
        id: "",
        name,
        commander: result.commander,
        cards: result.cards,
        cardBackUrl: null,
        isPublic: false,
        createdAt: now,
        updatedAt: now,
      };
      const r = await importGuestDeck(draft);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      trackGoal("deck");
      router.push(`/deck-builder/${r.id}`);
    } finally {
      setSaving(false);
    }
  }

  const groups = result
    ? CATEGORY_ORDER.map((cat) => ({
        cat,
        cards: result.cards.filter((c) => c.category === cat),
      })).filter((g) => g.cards.length > 0)
    : [];

  return (
    <>
      <PageHeader
        title="Deck Doctor"
        description="Name a commander and get a complete, battle-ready deck built from the cards the community plays most — then open it in the builder to make it yours."
        width="max-w-[1600px]"
      >
        <Link href="/deck-builder" className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:border-gold">
          My decks
        </Link>
      </PageHeader>

      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
        <div className="card-frame mb-8 flex flex-col gap-4 p-5">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Commander</label>
            <CardSearchBox
              placeholder="Search for a commander..."
              fetchSuggestions={autocompleteCommanderNames}
              onSelect={(name) => setCommander(name)}
              clearOnSelect={false}
            />
            {commander && <p className="mt-2 text-sm text-gold-bright">Brewing around: {commander}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Budget</label>
            <div className="flex flex-wrap items-center gap-2">
              {BUDGETS.map((b) => {
                const on = b.key === budgetKey;
                return (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => setBudgetKey(b.key)}
                    aria-pressed={on}
                    className={
                      on
                        ? "rounded-full bg-gold px-3 py-1.5 text-xs font-bold text-black"
                        : "rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:border-gold hover:text-foreground"
                    }
                  >
                    {b.label}
                  </button>
                );
              })}
              {budgetKey === "custom" && (
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted">$</span>
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={customBudget}
                    onChange={(e) => setCustomBudget(e.target.value)}
                    placeholder="150"
                    className="w-24 rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-foreground placeholder:text-muted focus:border-gold focus:outline-none"
                  />
                </div>
              )}
            </div>
            <p className="mt-1.5 text-xs text-muted">With a budget, Deck Doctor swaps the priciest cards for cheaper high-play-rate ones and basic lands until it fits.</p>
          </div>

          {error && <p className="text-sm text-down">{error}</p>}

          <div>
            <button
              onClick={brew}
              disabled={brewing || !commander}
              className="rounded-lg bg-gold px-5 py-2.5 text-sm font-bold text-black hover:bg-gold-bright disabled:cursor-not-allowed disabled:opacity-50"
            >
              {brewing ? "Brewing…" : result ? "Re-brew" : "Brew a deck"}
            </button>
            {brewing && <span className="ml-3 text-xs text-muted">Reading EDHREC &amp; pricing cards — this takes a few seconds.</span>}
          </div>
        </div>

        {brewing && !result && (
          <div className="flex flex-col items-center py-16 text-center">
            <Ember mood="thinking" size={130} title="Ember brewing a deck" />
            <p className="mt-2 text-sm text-muted">Building your 100-card list…</p>
          </div>
        )}

        {result && (
          <>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                {result.commander.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={result.commander.imageUrl} alt={result.commander.name} className="h-28 w-auto rounded-md border border-border" loading="lazy" />
                )}
                <div>
                  <h2 className="font-display text-xl font-bold text-foreground">{result.commander.name}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {result.meta.nonlandCount} nonland · {result.meta.landCount} lands
                  </p>
                  <p className="text-sm">
                    <span className="font-bold text-gold-bright">{money(result.meta.totalUsd)}</span>
                    {result.meta.budgetUsd != null && <span className="text-muted"> · target ${result.meta.budgetUsd.toFixed(0)}</span>}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <button
                  onClick={save}
                  disabled={saving || atLimit}
                  className="rounded-lg bg-gold px-5 py-2.5 text-sm font-bold text-black hover:bg-gold-bright disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save & open in builder →"}
                </button>
                {atLimit && (
                  <p className="max-w-xs text-right text-xs text-muted">
                    You&apos;ve used all {deckLimit} free deck slots. <Link href="/premium" className="text-gold-bright underline">Go Premium</Link> for unlimited decks, or delete one first.
                  </p>
                )}
              </div>
            </div>

            {result.meta.notes.length > 0 && (
              <ul className="mb-6 space-y-1">
                {result.meta.notes.map((n, i) => (
                  <li key={i} className="text-xs text-muted">• {n}</li>
                ))}
              </ul>
            )}

            {groups.map((g) => {
              const count = g.cards.reduce((s, c) => s + c.quantity, 0);
              return (
                <section key={g.cat} className="mb-7">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
                    {g.cat} <span className="text-foreground">{count}</span>
                  </h3>
                  <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-7 2xl:grid-cols-9">
                    {g.cards.map((c) => (
                      <div key={c.scryfallId} className="group block" title={`${c.name} — ${money(c.priceUsd)}`}>
                        <div className="relative aspect-[5/7] overflow-hidden rounded-md border border-border">
                          {c.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={c.imageUrl} alt={c.name} className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-surface-raised p-2 text-center text-[10px] text-foreground">
                              {c.name}
                            </div>
                          )}
                          {c.quantity > 1 && (
                            <span className="absolute right-1 top-1 rounded-full bg-black/80 px-1.5 text-[11px] font-bold text-gold-bright">×{c.quantity}</span>
                          )}
                        </div>
                        <p className="mt-1 truncate text-[10px] text-muted">{money(c.priceUsd)}</p>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </>
        )}
      </div>
    </>
  );
}
