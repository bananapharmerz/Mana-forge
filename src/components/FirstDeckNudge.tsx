"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TRIAL_DAYS } from "@/lib/tier";

const KEY = "mf_first_deck_nudge";

// Shown once, the first time a free member's first deck saves with real cards in it.
export default function FirstDeckNudge({ ready }: { ready: boolean }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!ready || show) return;
    // A short pause so it lands after the "Saved" tick, not in the middle of adding cards.
    const t = setTimeout(() => {
      try {
        if (localStorage.getItem(KEY)) return;
        localStorage.setItem(KEY, "1");
      } catch {
        return; // no storage, no way to keep it to once, so skip it
      }
      setShow(true);
    }, 1200);
    return () => clearTimeout(t);
  }, [ready, show]);

  if (!show) return null;
  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-md rounded-xl border border-gold/50 bg-surface p-4 shadow-2xl sm:left-auto"
    >
      <button
        onClick={() => setShow(false)}
        aria-label="Close"
        className="absolute right-2 top-1.5 text-lg leading-none text-muted hover:text-foreground"
      >
        ×
      </button>
      <p className="pr-5 font-semibold text-foreground">🔥 Your first deck is saved!</p>
      <p className="mt-1 text-sm text-muted">
        Premium tracks what it&apos;s worth over time, suggests budget upgrades for your commander and keeps every
        version of your list.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <Link
          href="/premium"
          onClick={() => setShow(false)}
          className="rounded-md bg-gold px-3 py-1.5 text-sm font-semibold text-black hover:bg-gold-bright"
        >
          Try free for {TRIAL_DAYS} days
        </Link>
        <button onClick={() => setShow(false)} className="text-sm text-muted hover:text-foreground">
          Maybe later
        </button>
      </div>
    </div>
  );
}
