import Link from "next/link";
import { TRIAL_DAYS } from "@/lib/tier";

// A blurred look at a Premium feature with an unlock button on top. The content underneath is a
// made-up sample, never the member's real Premium data, so nothing is given away in the HTML.
export default function PremiumLockedPreview({
  children,
  pitch,
  compact = false,
}: {
  children: React.ReactNode;
  pitch: string;
  compact?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg">
      <div aria-hidden className="pointer-events-none select-none blur-[5px] opacity-70">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/40 p-3 text-center">
        <p className={`max-w-sm text-foreground ${compact ? "text-xs" : "text-sm"}`}>{pitch}</p>
        <Link
          href="/premium"
          className={`rounded-md bg-gold font-semibold text-black shadow hover:bg-gold-bright ${compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"}`}
        >
          🔒 Unlock with a {TRIAL_DAYS}-day free trial
        </Link>
      </div>
    </div>
  );
}

// Sample value line for the locked deck value graph.
export function SampleValueChart() {
  const pts = [42, 44, 43, 47, 46, 49, 52, 50, 55, 54, 58, 61, 59, 63, 66, 64, 69, 72, 70, 74];
  const w = 600;
  const h = 180;
  const max = 80;
  const min = 35;
  const xy = pts.map((v, i) => [(i / (pts.length - 1)) * w, h - ((v - min) / (max - min)) * h] as const);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <div className="card-frame p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-2xl font-bold text-foreground">$74.20</span>
        <span className="text-sm font-semibold text-green-500">+18.4% this month</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-40 w-full" preserveAspectRatio="none">
        <path d={`${line} L${w},${h} L0,${h} Z`} fill="currentColor" className="text-gold/20" />
        <path d={line} fill="none" stroke="currentColor" strokeWidth="3" className="text-gold" />
      </svg>
      <div className="mt-2 flex gap-2 text-xs text-muted">
        <span className="rounded border border-gold px-2 py-0.5 text-gold-bright">Week</span>
        <span className="rounded border border-border px-2 py-0.5">Month</span>
        <span className="rounded border border-border px-2 py-0.5">Year</span>
      </div>
    </div>
  );
}
