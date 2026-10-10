"use client";

import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { trackGoal } from "@/components/SiteTracker";
import Ember from "@/components/Ember";

// The thank-you after Stripe checkout (it sends people back to /premium?upgraded=1): a celebration
// and the three things to try first, instead of the sales page they just paid on.
const noop = () => () => {};

export default function PremiumThanks({ trialDays }: { trialDays: number }) {
  const upgraded = useSyncExternalStore(
    noop,
    () => new URLSearchParams(window.location.search).get("upgraded") === "1",
    () => false
  );
  // Counted once per page load, for the funnel in Nexus.
  const counted = useRef(false);
  useEffect(() => {
    if (upgraded && !counted.current) {
      counted.current = true;
      trackGoal("premium");
    }
  }, [upgraded]);
  if (!upgraded) return null;
  return (
    <section aria-label="Welcome to Premium" className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">
      <div className="card-frame flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
        <Ember mood="hyped" size={140} title="Ember celebrating" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-bright">Thank you!</p>
          <h2 className="mt-1 font-display text-3xl font-semibold text-foreground">Welcome to Premium</h2>
          <p className="mt-1 text-sm text-muted">
            Premium is yours (with a free {trialDays}-day trial if this is your first time). It can take a few seconds to switch on: if something
            still looks locked, refresh the page.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
            <Link href="/deck-builder" className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold-bright">
              Build as many decks as you like
            </Link>
            <Link href="/prices" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:border-gold">
              Set price alerts
            </Link>
            <Link href="/play" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:border-gold">
              Start a game, no wait
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
