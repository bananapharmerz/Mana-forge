"use client";

import { useState } from "react";
import { setPriceAlerts } from "@/app/actions/premium";
import { FREE_PRICE_ALERTS } from "@/lib/tier";

// On the account page, for everyone: price alert emails on or off (the unsubscribe link turns them
// off; this is how to turn them back on). Premium members also have it on their Premium page.
export default function PriceAlertsToggle({ initial, premium }: { initial: boolean; premium: boolean }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function flip() {
    setBusy(true);
    const r = await setPriceAlerts(!on).catch(() => null);
    if (r !== null) setOn(r);
    setBusy(false);
  }

  return (
    <section className="card-frame mt-8 p-5">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-semibold text-foreground">Price alert emails</h2>
          <p className="mt-1 text-sm text-muted">
            {premium
              ? "An email when a card on your watchlist hits your target price, plus a weekly note of big price moves in your decks."
              : `An email when one of your first ${FREE_PRICE_ALERTS} watchlist target prices is hit. Set targets on the price tracker.`}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Price alert emails"
          onClick={flip}
          disabled={busy}
          className={`relative h-7 w-12 flex-none rounded-full transition-colors disabled:opacity-50 ${on ? "bg-gold" : "border border-border bg-surface-raised"}`}
        >
          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "left-[1.4rem]" : "left-0.5"}`} />
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">{on ? "On." : "Off."}</p>
    </section>
  );
}
