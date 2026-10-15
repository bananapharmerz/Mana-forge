"use client";

import { useState } from "react";
import { respondWeeklyEmailNudge } from "@/app/actions/account";

// One-time nudge on My Decks, shown once a member has a deck and hasn't been asked yet: switch on
// the Monday roundup (new-set spoilers, the week's price movers, the Forge Challenge). Either
// answer is recorded server-side (weeklyEmailPromptedAt), so this never shows again.
export default function WeeklyEmailNudge() {
  const [state, setState] = useState<"ask" | "done" | "gone">("ask");
  const [busy, setBusy] = useState(false);

  const respond = async (optIn: boolean) => {
    setBusy(true);
    // Record the answer; the card goes away regardless, so a failed write never leaves it nagging.
    await respondWeeklyEmailNudge(optIn).catch(() => null);
    setState(optIn ? "done" : "gone");
    setBusy(false);
  };

  if (state === "gone") return null;

  if (state === "done") {
    return (
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-foreground">
        <span aria-hidden>✉️</span>
        <span>You&apos;re on the list — your first weekly roundup lands Monday. Change it anytime on your account page.</span>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-xl border border-gold/40 bg-gold/10 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">Get the weekly Commander roundup</p>
          <p className="mt-1 text-sm text-muted">
            New set spoilers, the week&apos;s biggest price moves, and the Forge Challenge — one short email on Mondays. One-click unsubscribe anytime.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled={busy}
            data-track="weekly nudge: opt in"
            onClick={() => respond(true)}
            className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-gold-bright disabled:opacity-50"
          >
            {busy ? "…" : "Email me the roundup"}
          </button>
          <button
            type="button"
            disabled={busy}
            data-track="weekly nudge: dismiss"
            onClick={() => respond(false)}
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
          >
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
}
