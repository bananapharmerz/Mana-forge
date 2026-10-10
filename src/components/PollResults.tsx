import type { PollOption } from "@/lib/community";

// Results as simple bars, biggest first. `mine` highlights the viewer's own pick.
export default function PollResults({ options, counts, mine }: { options: PollOption[]; counts: Map<string, number>; mine?: string | null }) {
  const total = [...counts.values()].reduce((s, n) => s + n, 0);
  const rows = options.map((o) => ({ ...o, n: counts.get(o.id) ?? 0 })).sort((a, b) => b.n - a.n);
  const top = rows[0]?.n ?? 0;
  return (
    <div className="flex flex-col gap-2">
      {rows.map((o) => {
        const pct = total ? (o.n / total) * 100 : 0;
        return (
          <div key={o.id} className="relative overflow-hidden rounded-lg border border-border bg-surface px-4 py-3 text-sm">
            <div className={`absolute inset-y-0 left-0 ${o.n === top && top > 0 ? "bg-gold/25" : "bg-gold/10"}`} style={{ width: `${pct}%` }} aria-hidden />
            <div className="relative flex items-center justify-between gap-3">
              <span className="text-foreground">
                {o.label}
                {mine === o.id && <span className="ml-2 rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-semibold text-gold-bright">your vote</span>}
              </span>
              <span className="shrink-0 font-mono text-foreground">{pct.toFixed(0)}%</span>
            </div>
          </div>
        );
      })}
      <p className="text-xs text-muted">{total.toLocaleString("en-US")} vote{total === 1 ? "" : "s"}</p>
    </div>
  );
}
