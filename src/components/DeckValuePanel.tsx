"use client";

import Link from "next/link";
import { signedPct, signedUsd, usd, type DeckValue } from "@/lib/livePrice";

// The deck's value today, how it moved this week, and the cards that moved it most.
export default function DeckValuePanel({ value }: { value: DeckValue }) {
  const change = value.totalUsd - value.weekAgoUsd;
  const pct = value.weekAgoUsd ? change / value.weekAgoUsd : 0;
  const moved = Math.abs(change) >= 0.01;
  return (
    <div className="card-frame mt-4 p-4">
      <div className="text-center">
        <p className="text-2xl font-bold text-gold-bright">{usd(value.totalUsd)}</p>
        <p className="text-xs text-muted">
          deck value (USD)
          {value.missingPriceCount > 0 && ` · ${value.missingPriceCount} unpriced`}
        </p>
        {moved && (
          <p className={`mt-1 text-xs font-semibold ${change > 0 ? "text-emerald-600" : "text-red-600"}`}>
            {change > 0 ? "▲" : "▼"} {signedUsd(change)} ({signedPct(pct)}) this week
          </p>
        )}
      </div>
      {value.movers.length > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">Biggest movers</p>
          <ul className="space-y-1">
            {value.movers.map((m) => (
              <li key={m.card.scryfallId} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-foreground">{m.card.name}</span>
                <span className={`shrink-0 font-mono ${m.change > 0 ? "text-emerald-600" : "text-red-600"}`}>{signedUsd(m.change)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-3 text-center text-[10px] text-muted">
        Scryfall prices, updated daily{value.updatedAt ? ` · ${new Date(value.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : ""} ·{" "}
        <Link href="/prices" className="underline hover:text-gold-bright">Price tracker</Link>
      </p>
    </div>
  );
}
