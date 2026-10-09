import Link from "next/link";
import { TRIAL_DAYS } from "@/lib/tier";

// A small Premium prompt shown right where a free member runs into something Premium does
// (the deck limit, price alerts, budget upgrades, the game queue). Leads with the free trial.
export default function TrialNudge({ children, compact = false }: { children: React.ReactNode; compact?: boolean }) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gold/40 bg-gold/10 ${compact ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm"}`}
    >
      <p className="min-w-0 flex-1 text-foreground">{children}</p>
      <Link
        href="/premium"
        className={`shrink-0 rounded-md bg-gold font-semibold text-black hover:bg-gold-bright ${compact ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm"}`}
      >
        Try free for {TRIAL_DAYS} days
      </Link>
    </div>
  );
}
