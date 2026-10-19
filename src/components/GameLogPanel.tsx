"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logGame, deleteGameLog } from "@/app/actions/games";

export interface GameRow {
  id: string;
  won: boolean;
  commanderName: string | null;
  players: number;
  playedAt: string; // ISO
  notes: string | null;
}

const today = () => new Date().toISOString().slice(0, 10);

// Record games you played (paper or online) to build your win-rate and game stats. The list and
// notes are private to you; your profile shows only the totals (games, win-rate, record).
export default function GameLogPanel({ games, total, wins }: { games: GameRow[]; total: number; wins: number }) {
  const router = useRouter();
  const [won, setWon] = useState(true);
  const [commander, setCommander] = useState("");
  const [players, setPlayers] = useState(4);
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const losses = total - wins;
  const rate = total > 0 ? Math.round((wins / total) * 100) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const r = await logGame({ won, commanderName: commander, players, playedAt: date, notes });
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: r.error });
    setMsg({ ok: true, text: "Game logged." });
    setCommander("");
    setNotes("");
    router.refresh();
  }

  async function remove(id: string) {
    const r = await deleteGameLog(id);
    if (r.ok) router.refresh();
  }

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <section className="card-frame mt-8 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-foreground">Game log</h2>
        {total > 0 && (
          <p className="text-sm text-muted">
            <span className="font-semibold text-foreground">{wins}–{losses}</span>
            {rate !== null && <> · <span className="font-semibold text-gold-bright">{rate}% win rate</span></>}
            {" · "}{total} game{total === 1 ? "" : "s"}
          </p>
        )}
      </div>
      <p className="mt-1 text-xs text-muted">
        Track your games (paper or online) to build your win-rate. Only the totals show on your public profile.
      </p>

      <form onSubmit={submit} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="flex overflow-hidden rounded-md border border-border">
          <button
            type="button"
            onClick={() => setWon(true)}
            className={`px-3 py-1.5 text-sm font-semibold ${won ? "bg-gold text-black" : "text-muted hover:text-foreground"}`}
          >
            Win
          </button>
          <button
            type="button"
            onClick={() => setWon(false)}
            className={`px-3 py-1.5 text-sm font-semibold ${!won ? "bg-surface-raised text-foreground" : "text-muted hover:text-foreground"}`}
          >
            Loss
          </button>
        </div>
        <div>
          <label className="block text-[11px] text-muted">Commander (optional)</label>
          <input
            value={commander}
            onChange={(e) => setCommander(e.target.value)}
            maxLength={150}
            placeholder="e.g. Atraxa"
            className="mt-0.5 w-44 rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-foreground focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-[11px] text-muted">Players</label>
          <input
            type="number"
            min={2}
            max={16}
            value={players}
            onChange={(e) => setPlayers(Number(e.target.value))}
            className="mt-0.5 w-16 rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-foreground focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-[11px] text-muted">Date</label>
          <input
            type="date"
            value={date}
            max={today()}
            onChange={(e) => setDate(e.target.value)}
            className="mt-0.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-foreground focus:border-gold focus:outline-none"
          />
        </div>
        <div className="flex-1 min-w-[10rem]">
          <label className="block text-[11px] text-muted">Notes (optional, private)</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={200}
            placeholder="How it went…"
            className="mt-0.5 w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-foreground focus:border-gold focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold-bright disabled:opacity-50"
        >
          {busy ? "Logging…" : "Log game"}
        </button>
        {msg && <span className={`text-sm ${msg.ok ? "text-green-600" : "text-red-700"}`}>{msg.text}</span>}
      </form>

      {games.length > 0 && (
        <ul className="mt-5 divide-y divide-border">
          {games.map((g) => (
            <li key={g.id} className="flex items-center gap-3 py-2 text-sm">
              <span
                className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  g.won ? "bg-gold/20 text-gold-bright" : "bg-surface-raised text-muted"
                }`}
              >
                {g.won ? "W" : "L"}
              </span>
              <span className="w-24 shrink-0 text-xs text-muted">{fmtDate(g.playedAt)}</span>
              <span className="flex-1 truncate text-foreground">
                {g.commanderName || <span className="text-muted">No commander</span>}
                <span className="text-muted"> · {g.players}p</span>
                {g.notes && <span className="text-muted"> — {g.notes}</span>}
              </span>
              <button
                onClick={() => remove(g.id)}
                className="shrink-0 text-xs text-muted hover:text-down"
                aria-label="Delete game"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
