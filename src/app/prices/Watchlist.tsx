"use client";

import { useState, useTransition } from "react";
import CardSearchBox from "@/components/CardSearchBox";
import { autocompleteCardNames } from "@/lib/scryfall";
import { addWatch, removeWatch, setWatchTarget } from "@/app/actions/prices";
import { signedPct, usd } from "@/lib/livePrice";
import Sparkline from "./Sparkline";
import TrialNudge from "@/components/TrialNudge";

export interface WatchRow {
  id: string;
  scryfallId: string;
  name: string;
  setName: string | null;
  imageUrl: string | null;
  usd: number | null;
  weekAgoUsd: number | null;
  targetUsd: number | null;
  history: (number | null)[];
}

function TargetEditor({ row, onDone }: { row: WatchRow; onDone: (msg: string, ok: boolean) => void }) {
  const [value, setValue] = useState(row.targetUsd ? row.targetUsd.toFixed(2) : "");
  const [pending, start] = useTransition();
  const save = (v: number | null) =>
    start(async () => {
      const r = await setWatchTarget(row.id, v);
      onDone(r.ok ? r.message : r.error, r.ok);
    });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const n = Number(value.replace(/[$,\s]/g, ""));
        save(value.trim() ? n : null);
      }}
      className="flex items-center gap-1"
    >
      <span className="text-xs text-muted">$</span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        inputMode="decimal"
        placeholder="target"
        aria-label={`Target price for ${row.name}`}
        className="w-16 rounded border border-border bg-surface px-1.5 py-1 text-xs text-foreground focus:border-gold focus:outline-none"
      />
      <button disabled={pending} className="rounded border border-border px-1.5 py-1 text-[11px] text-muted hover:border-gold hover:text-foreground disabled:opacity-50">
        Set
      </button>
    </form>
  );
}

export default function Watchlist({ rows, premium = false }: { rows: WatchRow[]; premium?: boolean }) {
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, start] = useTransition();
  const notify = (text: string, ok: boolean) => setMsg({ text, ok });
  const add = (name: string) =>
    start(async () => {
      const r = await addWatch(name);
      notify(r.ok ? r.message : r.error, r.ok);
    });
  const remove = (id: string) =>
    start(async () => {
      const r = await removeWatch(id);
      notify(r.ok ? r.message : r.error, r.ok);
    });

  return (
    <div className="card-frame overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
        <div className="min-w-[240px] flex-1">
          <CardSearchBox placeholder="Add a card to watch…" fetchSuggestions={autocompleteCardNames} onSelect={add} />
        </div>
        {pending && <span className="text-xs text-muted">Working…</span>}
        {msg && !pending && <span className={`text-xs ${msg.ok ? "text-emerald-600" : "text-red-600"}`}>{msg.text}</span>}
      </div>
      {!premium && rows.some((r) => r.targetUsd !== null) && (
        <div className="border-b border-border p-3">
          <TrialNudge compact>Don&apos;t check back every day: Premium emails you the moment a card hits your target.</TrialNudge>
        </div>
      )}
      {rows.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted">Nothing on your watchlist yet. Search for a card above; we track its cheapest printing.</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((r) => {
            const change = r.usd !== null && r.weekAgoUsd ? (r.usd - r.weekAgoUsd) / r.weekAgoUsd : null;
            const hit = r.targetUsd !== null && r.usd !== null && r.usd <= r.targetUsd;
            return (
              <li key={r.id} className={`flex flex-wrap items-center gap-3 px-3 py-2.5 sm:flex-nowrap ${hit ? "bg-emerald-500/[0.07]" : ""}`}>
                {r.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.imageUrl} alt="" className="h-12 w-[34px] shrink-0 rounded-sm object-cover object-top" loading="lazy" />
                ) : (
                  <span className="h-12 w-[34px] shrink-0 rounded-sm bg-surface-raised" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{r.name}</span>
                  <span className="block truncate text-[11px] text-muted">{r.setName}</span>
                  {hit && <span className="mt-0.5 inline-block rounded bg-emerald-600/15 px-1.5 text-[10px] font-semibold text-emerald-700">At your target: time to buy</span>}
                </span>
                <span className="hidden shrink-0 text-gold-bright sm:block">
                  <Sparkline values={r.history} target={r.targetUsd} />
                </span>
                <span className="w-20 shrink-0 text-right">
                  <span className="block font-mono text-sm text-foreground">{r.usd === null ? "—" : usd(r.usd)}</span>
                  {change !== null && Math.abs(change) >= 0.005 && (
                    <span className={`block text-[11px] ${change > 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {change > 0 ? "▲" : "▼"} {signedPct(change)} wk
                    </span>
                  )}
                </span>
                <span className="flex w-full items-center justify-end gap-3 sm:w-auto">
                  <TargetEditor row={r} onDone={notify} />
                  <button onClick={() => remove(r.id)} disabled={pending} aria-label={`Stop watching ${r.name}`} className="text-xs text-muted hover:text-red-600 disabled:opacity-50">
                    ✕
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
