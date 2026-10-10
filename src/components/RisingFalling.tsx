import CardNameZoom from "@/components/CardNameZoom";
import type { TrendCard } from "@/lib/trending";
import { SITE } from "@/lib/site";

const pct = (n: number) => `${Math.round(n * 100)}%`;

function List({ title, rows, up }: { title: string; rows: TrendCard[]; up: boolean }) {
  return (
    <div className="card-frame p-4">
      <h3 className="mb-3 text-sm font-semibold text-gold-bright">{title}</h3>
      {rows.length ? (
        <ul className="flex flex-col gap-2">
          {rows.map((t) => (
            <li key={t.name} className="flex items-center gap-3 text-sm">
              <CardNameZoom name={t.name} imageUrl={t.imageUrl} />
              <span className="ml-auto shrink-0 text-right text-xs">
                <span className="text-muted">{pct(t.olderPct)} → </span>
                <span className="font-semibold text-foreground">{pct(t.recentPct)}</span>
                <span className={`ml-2 font-semibold ${up ? "text-emerald-600" : "text-red-600"}`}>{up ? "▲" : "▼"}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Nothing changed much.</p>
      )}
    </div>
  );
}

export default function RisingFalling({
  commander,
  trends,
}: {
  commander: string;
  trends: { rising: TrendCard[]; falling: TrendCard[]; recentDecks: number; olderDecks: number; days: number };
}) {
  if (!trends.rising.length && !trends.falling.length) return null;
  return (
    <section id="trending" className="mt-12 scroll-mt-28">
      <h2 className="mb-1 text-xl font-bold text-foreground">Rising and falling in {commander} decks</h2>
      <p className="mb-4 text-xs text-muted">
        Share of {SITE.name} decks running each card: {trends.recentDecks} built in the last {trends.days} days vs {trends.olderDecks} built before.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <List title="Rising" rows={trends.rising} up />
        <List title="Falling" rows={trends.falling} up={false} />
      </div>
    </section>
  );
}
