"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { importOwned, setOwned, clearOwned, type ImportSummary } from "@/app/actions/collection";

interface Row {
  name: string;
  nameKey: string;
  quantity: number;
  imageUrl?: string | null;
  uri?: string | null;
}

// Manage the real-world owned-card list: paste/import a list (replace or add), see what changed,
// and remove single cards or clear everything. All writes go through server actions.
export default function OwnedCardsManager({
  initial,
  distinct,
  copies,
}: {
  initial: Row[];
  distinct: number;
  copies: number;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [armClear, setArmClear] = useState(false);
  const [filter, setFilter] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");

  async function doImport() {
    if (!text.trim()) {
      setErr("Paste a list of cards first.");
      return;
    }
    setBusy(true);
    setErr(null);
    setSummary(null);
    const r = await importOwned({ text, mode: "add" });
    setBusy(false);
    if (!r.ok) {
      setErr(r.error);
      return;
    }
    setSummary(r.summary);
    setText("");
    router.refresh();
  }

  // The ✕ removes a single copy; a card with several copies drops by one until the last is gone.
  async function removeOne(name: string, quantity: number) {
    await setOwned({ name, quantity: quantity > 1 ? quantity - 1 : 0 });
    router.refresh();
  }

  async function doClear() {
    if (!armClear) {
      setArmClear(true);
      setTimeout(() => setArmClear(false), 4000);
      return;
    }
    setArmClear(false);
    await clearOwned();
    setSummary(null);
    router.refresh();
  }

  const q = filter.trim().toLowerCase();
  const shown = q ? initial.filter((r) => r.name.toLowerCase().includes(q)) : initial;

  return (
    <div className="flex flex-col gap-8">
      {/* Import */}
      <section className="card-frame p-5">
        <h2 className="font-display text-lg font-semibold text-foreground">Add cards</h2>
        <p className="mt-1 text-xs text-muted">
          One card per line — e.g. <code className="rounded bg-surface-raised px-1">1 Sol Ring</code>,{" "}
          <code className="rounded bg-surface-raised px-1">2x Lightning Bolt</code>, or just{" "}
          <code className="rounded bg-surface-raised px-1">Rhystic Study</code>. Paste straight from
          Moxfield, Archidekt or a deck list — set codes and collector numbers are ignored.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder={"1 Sol Ring\n1 Arcane Signet\n2 Lightning Bolt\nRhystic Study"}
          className="mt-3 w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted focus:border-gold focus:outline-none"
        />
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <button
            onClick={doImport}
            disabled={busy}
            className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold-bright disabled:opacity-50"
          >
            {busy ? "Saving…" : "Add cards"}
          </button>
          {err && <span className="text-sm text-down">{err}</span>}
        </div>
        <p className="mt-2 text-[11px] text-muted">
          Adds these cards to your list. If you already own a card, its quantity goes up — nothing is ever removed. Use
          the ✕ on a card to delete it.
        </p>

        {summary && (
          <div className="mt-4 rounded-md border border-border bg-surface p-3 text-sm">
            <p className="font-semibold text-foreground">
              Saved: {summary.added} added
              {summary.updated > 0 && `, ${summary.updated} updated`}
              {summary.removed > 0 && `, ${summary.removed} removed`}.
            </p>
            {summary.rejected.length > 0 && (
              <details className="mt-1">
                <summary className="cursor-pointer text-xs text-muted">
                  {summary.rejected.length} line{summary.rejected.length === 1 ? "" : "s"} couldn&apos;t be read
                </summary>
                <ul className="mt-1 list-inside list-disc text-xs text-muted">
                  {summary.rejected.map((l, i) => (
                    <li key={i} className="truncate">{l}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </section>

      {/* Current list */}
      <section>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-foreground">
            Your cards{" "}
            <span className="text-sm font-normal text-muted">
              ({distinct.toLocaleString()} card{distinct === 1 ? "" : "s"}, {copies.toLocaleString()} cop
              {copies === 1 ? "y" : "ies"})
            </span>
          </h2>
          {distinct > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex overflow-hidden rounded-md border border-border text-xs">
                <button
                  onClick={() => setView("grid")}
                  className={`px-2.5 py-1.5 font-semibold ${view === "grid" ? "bg-gold text-black" : "text-muted hover:text-foreground"}`}
                  aria-pressed={view === "grid"}
                >
                  Pictures
                </button>
                <button
                  onClick={() => setView("list")}
                  className={`px-2.5 py-1.5 font-semibold ${view === "list" ? "bg-gold text-black" : "text-muted hover:text-foreground"}`}
                  aria-pressed={view === "list"}
                >
                  List
                </button>
              </div>
              <button
                onClick={doClear}
                className={`rounded-md border px-3 py-1.5 text-xs ${
                  armClear ? "border-red-600 bg-red-600 text-white" : "border-border text-muted hover:border-red-600 hover:text-down"
                }`}
              >
                {armClear ? "Tap again to clear all" : "Clear all"}
              </button>
            </div>
          )}
        </div>

        {initial.length < distinct && (
          <p className="mb-3 text-xs text-muted">
            Showing the first {initial.length.toLocaleString()} of {distinct.toLocaleString()} cards. Owned-vs-needed in
            the deck builder still uses your whole list.
          </p>
        )}
        {distinct === 0 ? (
          <p className="text-sm text-muted">No cards yet. Paste a list above to get started.</p>
        ) : (
          <>
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter…"
              className="mb-3 w-full max-w-xs rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:border-gold focus:outline-none"
            />
            {view === "grid" ? (
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {shown.map((r) => (
                  <div key={r.nameKey} className="group">
                    <div className="relative aspect-[5/7] overflow-hidden rounded-md border border-border">
                      {r.imageUrl ? (
                        <a href={r.uri ?? "#"} target="_blank" rel="noopener noreferrer" title={r.name}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={r.imageUrl} alt={r.name} className="h-full w-full object-cover" loading="lazy" />
                        </a>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-surface-raised p-2 text-center text-[10px] text-foreground">
                          {r.name}
                        </div>
                      )}
                      {r.quantity > 1 && (
                        <span className="absolute right-1 top-1 rounded-full bg-black/80 px-1.5 text-[11px] font-bold text-gold-bright">
                          ×{r.quantity}
                        </span>
                      )}
                      <button
                        onClick={() => removeOne(r.name, r.quantity)}
                        className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/80 text-[11px] text-white transition-colors hover:bg-red-600"
                        aria-label={r.quantity > 1 ? `Remove one ${r.name}` : `Delete ${r.name}`}
                        title={r.quantity > 1 ? `Remove one copy` : `Delete ${r.name}`}
                      >
                        ✕
                      </button>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-muted" title={r.name}>{r.name}</p>
                  </div>
                ))}
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
                {shown.map((r) => (
                  <li key={r.nameKey} className="flex items-center justify-between gap-2 border-b border-border/60 py-1.5 text-sm">
                    <span className="truncate text-foreground">
                      {r.quantity > 1 && <span className="text-muted">{r.quantity}× </span>}
                      {r.uri ? (
                        <a href={r.uri} target="_blank" rel="noopener noreferrer" className="hover:text-gold-bright">
                          {r.name}
                        </a>
                      ) : (
                        r.name
                      )}
                    </span>
                    <button
                      onClick={() => removeOne(r.name, r.quantity)}
                      className="shrink-0 text-xs text-muted hover:text-down"
                      aria-label={r.quantity > 1 ? `Remove one ${r.name}` : `Delete ${r.name}`}
                      title={r.quantity > 1 ? "Remove one copy" : "Delete"}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {shown.length === 0 && <p className="text-sm text-muted">No cards match “{filter}”.</p>}
          </>
        )}
      </section>
    </div>
  );
}
