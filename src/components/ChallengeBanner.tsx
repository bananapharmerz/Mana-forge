"use client";

import Link from "next/link";
import { useLocalStorageState } from "@/lib/useLocalStorageState";

export interface LiveChallenge {
  slug: string;
  title: string;
  phaseLabel: string;
  deadline: string;
  isSubmitting: boolean;
}

// A slim notification bar for live Forge Challenges, shown on the home page in place of a top-nav
// tab. Dismissible, but keyed to the current set of challenges so a new one re-shows the bar.
export default function ChallengeBanner({ challenges }: { challenges: LiveChallenge[] }) {
  const key = "mf-chal-dismissed";
  const [dismissed, setDismissed] = useLocalStorageState<string>(key, "");

  if (challenges.length === 0) return null;
  const sig = challenges.map((c) => c.slug).join(",");
  if (dismissed === sig) return null;

  const multi = challenges.length > 1;
  const href = multi ? "/challenge" : `/challenge/${challenges[0].slug}`;
  const label = multi
    ? `${challenges.length} challenges are live right now`
    : `${challenges[0].title} — ${challenges[0].phaseLabel}`;
  const sub = multi
    ? "Build a deck, enter, and win Premium"
    : `${challenges[0].isSubmitting ? "Entries close" : "Voting ends"} ${challenges[0].deadline} · win Premium`;

  return (
    <div className="border-b border-gold/30 bg-gradient-to-r from-[#2a1c0e] via-[#3a2a12] to-[#2a1c0e]">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6">
        <span aria-hidden className="text-lg">🏆</span>
        <Link href={href} className="group flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="truncate font-semibold text-gold-bright group-hover:underline">{label}</span>
          <span className="truncate text-sm text-[#d8c59c]">{sub}</span>
          <span className="font-semibold text-gold-bright transition-transform group-hover:translate-x-0.5">→</span>
        </Link>
        <button
          onClick={() => setDismissed(sig)}
          aria-label="Dismiss"
          className="shrink-0 rounded-md px-2 py-1 text-[#caa968] hover:bg-black/20 hover:text-gold-bright"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
