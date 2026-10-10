"use client";

import { useState } from "react";
import TrialNudge from "@/components/TrialNudge";
import { compareSnapshot, deleteSnapshot, restoreSnapshot, saveSnapshot, type SnapshotDiff, type SnapshotRow } from "@/app/actions/snapshots";

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

// Premium: save a version of the deck before trying something new, see what changed since, and go back.
export default function DeckSnapshotsPanel({ deckId, premium, initial }: { deckId: string; premium: boolean; initial: SnapshotRow[] }) {
  const [rows, setRows] = useState(initial);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<{ id: string; diff: SnapshotDiff } | null>(null);

  if (!premium) {
    return <TrialNudge>Save versions of this deck, see what changed since, and restore an older one with one click.</TrialNudge>;
  }

  async function save() {
    setBusy("save");
    setError(null);
    const r = await saveSnapshot(deckId, label);
    setBusy(null);
    if (!r.ok) return setError(r.error);
    setRows((x) => [r.snapshot, ...x]);
    setLabel("");
  }

  async function compare(id: string) {
    if (open?.id === id) return setOpen(null);
    setBusy(id);
    setError(null);
    const r = await compareSnapshot(id);
    setBusy(null);
    if (!r.ok) return setError(r.error);
    setOpen({ id, diff: r.diff });
  }

  async function restore(id: string) {
    if (!window.confirm("Restore this version? The deck as it is now is saved as a version first, so you can come back to it.")) return;
    setBusy(id);
    setError(null);
    const r = await restoreSnapshot(id);
    if (!r.ok) {
      setBusy(null);
      return setError(r.error);
    }
    window.location.reload(); // the editor above holds the deck in memory; reload to show the restored list
  }

  async function remove(id: string) {
    setBusy(id);
    const r = await deleteSnapshot(id);
    setBusy(null);
    if (!r.ok) return setError(r.error);
    setRows((x) => x.filter((s) => s.id !== id));
    if (open?.id === id) setOpen(null);
  }

  return (
    <div className="card-frame p-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={60}
          placeholder="Name this version (optional), e.g. before cutting lands"
          className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 text-base text-foreground placeholder:text-muted focus:border-gold focus:outline-none sm:text-sm"
        />
        <button onClick={save} disabled={!!busy} className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold-bright disabled:opacity-50">
          {busy === "save" ? "Saving…" : "Save version"}
        </button>
      </div>
      <p className="mt-1 text-[11px] text-muted">Saves the deck as last saved above. Keeps your latest 30 versions.</p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No versions yet. Save one before your next big change.</p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-border">
          {rows.map((s) => (
            <li key={s.id} className="py-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-foreground">{s.label || "Untitled version"}</span>
                  <span className="block text-[11px] text-muted">{when(s.createdAt)} · {s.cardCount} cards</span>
                </span>
                <button onClick={() => compare(s.id)} disabled={!!busy} className="rounded border border-border px-2 py-1 text-xs text-muted hover:border-gold hover:text-foreground disabled:opacity-50">
                  {open?.id === s.id ? "Hide changes" : "What changed"}
                </button>
                <button onClick={() => restore(s.id)} disabled={!!busy} className="rounded border border-gold/60 px-2 py-1 text-xs text-gold-bright hover:bg-gold/10 disabled:opacity-50">
                  Restore
                </button>
                <button onClick={() => remove(s.id)} disabled={!!busy} aria-label="Delete version" className="rounded px-2 py-1 text-xs text-muted hover:text-red-600 disabled:opacity-50">
                  ✕
                </button>
              </div>
              {open?.id === s.id && (
                <div className="mt-2 grid gap-3 rounded-md bg-surface-raised p-3 text-xs sm:grid-cols-2">
                  {open.diff.commanderChanged && (
                    <p className="sm:col-span-2 text-foreground">
                      Commander: {open.diff.commanderChanged.from || "none"} → {open.diff.commanderChanged.to || "none"}
                    </p>
                  )}
                  <div>
                    <p className="mb-1 font-semibold text-emerald-600">Added since ({open.diff.added.reduce((n, c) => n + c.qty, 0)})</p>
                    {open.diff.added.length ? open.diff.added.map((c) => <p key={c.name} className="text-foreground">+{c.qty} {c.name}</p>) : <p className="text-muted">Nothing</p>}
                  </div>
                  <div>
                    <p className="mb-1 font-semibold text-red-600">Removed since ({open.diff.removed.reduce((n, c) => n + c.qty, 0)})</p>
                    {open.diff.removed.length ? open.diff.removed.map((c) => <p key={c.name} className="text-foreground">−{c.qty} {c.name}</p>) : <p className="text-muted">Nothing</p>}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
