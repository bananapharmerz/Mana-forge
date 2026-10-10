"use client";

import { useState } from "react";
import { setWeeklyEmail } from "@/app/actions/account";

// The opt-in for the Monday roundup on the account page. Off until the member turns it on.
export default function WeeklyEmailToggle({ initial, verified }: { initial: boolean; verified: boolean }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function flip() {
    setBusy(true);
    setError(null);
    const r = await setWeeklyEmail(!on).catch(() => ({ ok: false as const, error: "Something went wrong. Try again." }));
    if (r.ok) setOn(r.on);
    else setError(r.error);
    setBusy(false);
  }

  return (
    <section className="card-frame mt-8 p-5">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-semibold text-foreground">Weekly roundup email</h2>
          <p className="mt-1 text-sm text-muted">
            One short email on Mondays: the week&apos;s biggest Commander price movers, the commander of the week and what&apos;s on in the Forge Challenge. No ads, unsubscribe in
            one click.
          </p>
          {!verified && <p className="mt-2 text-xs text-muted">Confirm your email address first (see the note at the top of this page).</p>}
          {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Weekly roundup email"
          onClick={flip}
          disabled={busy || (!verified && !on)}
          className={`relative h-7 w-12 flex-none rounded-full transition-colors disabled:opacity-50 ${on ? "bg-gold" : "bg-surface-raised border border-border"}`}
        >
          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "left-[1.4rem]" : "left-0.5"}`} />
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">{on ? "On: the next one arrives Monday morning." : "Off."}</p>
    </section>
  );
}
