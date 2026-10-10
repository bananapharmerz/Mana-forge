import Link from "next/link";
import Sparkline from "../Sparkline";
import { signedPct, usd } from "@/lib/livePrice";
import type { Mover, WeekMovers } from "@/lib/prices";

const nice = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
export const weekLabel = (w: { startDay: string; endDay: string }) => `${nice(w.startDay)} – ${nice(w.endDay)}`;

function Table({ title, rows, spark, up }: { title: string; rows: Mover[]; spark: WeekMovers["spark"]; up: boolean }) {
  return (
    <section className="card-frame p-4">
      <h2 className="mb-3 font-display text-xl font-semibold text-foreground">{title}</h2>
      {rows.length ? (
        <ol className="flex flex-col divide-y divide-border">
          {rows.map((m, i) => (
            <li key={m.scryfallId} className="flex items-center gap-3 py-2 text-sm">
              <span className="w-5 shrink-0 text-right text-xs text-muted">{i + 1}</span>
              {m.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.imageUrl} alt="" className="h-12 w-9 shrink-0 rounded-sm object-cover object-top" loading="lazy" />
              ) : (
                <span className="h-12 w-9 shrink-0 rounded-sm bg-surface-raised" />
              )}
              <span className="min-w-0 flex-1">
                <Link href={`/prices/card/${m.scryfallId}`} className="block truncate font-medium text-foreground hover:text-gold-bright hover:underline">{m.name}</Link>
                <span className="block truncate text-[11px] text-muted">{m.setName}</span>
              </span>
              <span className="hidden shrink-0 sm:block">
                <Sparkline values={spark[m.scryfallId] ?? []} width={96} height={28} />
              </span>
              <span className="w-24 shrink-0 text-right">
                <span className="block font-mono text-foreground">{usd(m.usd)}</span>
                <span className="block text-[11px] text-muted">from {usd(m.weekAgoUsd)}</span>
                <span className={`block text-[11px] font-semibold ${up ? "text-emerald-600" : "text-red-600"}`}>{up ? "▲" : "▼"} {signedPct(m.pct)}</span>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted">No big moves this week.</p>
      )}
    </section>
  );
}

export default function MoversView({ w, archive, current }: { w: WeekMovers; archive: string[]; current?: string }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <Table title="Biggest risers" rows={w.up} spark={w.spark} up />
        <Table title="Biggest fallers" rows={w.down} spark={w.spark} up={false} />
      </div>
      <p className="mt-4 text-[11px] text-muted">
        {w.tracked.toLocaleString("en-US")} printings compared. Scryfall&apos;s daily market prices (TCGplayer, USD) for cards in Commander decks and watchlists on Mana Forge; at least $1 and a move of 3% or more. Lines show the last 30 days.
      </p>
      {archive.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-display text-xl font-semibold text-foreground">Past weeks</h2>
          <ul className="flex flex-wrap gap-2 text-sm">
            {archive.map((d) => (
              <li key={d}>
                <Link
                  href={`/prices/movers/${d}`}
                  className={`block rounded-md border px-3 py-1.5 ${d === current ? "border-gold text-gold-bright" : "border-border text-muted hover:border-gold hover:text-foreground"}`}
                >
                  Week to {nice(d)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="mt-8 text-sm">
        <Link href="/prices" className="text-muted underline hover:text-gold-bright">← Price tracker and your watchlist</Link>
      </p>
    </div>
  );
}
