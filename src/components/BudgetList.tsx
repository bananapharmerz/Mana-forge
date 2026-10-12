import Link from "next/link";
import type { BudgetTier } from "@/lib/budget";
import { usd } from "@/lib/livePrice";

// One price tier of a budget page: a heading, a line on what's in it, and a grid of cards,
// most-played first. `href` says where each card links (its commander page, or a price search).
export default function BudgetList({ tiers, href }: { tiers: BudgetTier[]; href: (name: string) => string }) {
  if (tiers.every((t) => t.cards.length === 0))
    return <p className="text-sm text-muted">Card prices couldn&apos;t be loaded just now. Try again in a minute.</p>;
  return (
    <div className="flex flex-col gap-10">
      {tiers.map((t) => (
        <section key={t.label}>
          <h2 className="font-display text-2xl font-semibold text-foreground">{t.label}</h2>
          <p className="mb-4 text-sm text-muted">{t.blurb}</p>
          <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {t.cards.map((c, i) => (
              <li key={c.name} className="card-frame flex flex-col p-2">
                <Link href={href(c.name)} className="group flex flex-1 flex-col">
                  {c.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image} alt={c.name} className="aspect-[488/680] w-full rounded-md object-cover" loading="lazy" />
                  ) : (
                    <span className="aspect-[488/680] w-full rounded-md bg-surface-raised" />
                  )}
                  <span className="mt-2 flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-foreground group-hover:text-gold-bright group-hover:underline">
                      <span className="mr-1 text-[11px] text-muted">{i + 1}.</span>
                      {c.name}
                    </span>
                    <span className="shrink-0 font-mono text-sm text-gold-bright">{usd(c.usd)}</span>
                  </span>
                  <span className="truncate text-[11px] text-muted">{c.typeLine}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
      <p className="text-xs text-muted">
        Ranked by how often each card is played in Commander (EDHREC data via Scryfall). Prices are TCGplayer market prices in
        USD for each card&apos;s cheapest printing, refreshed hourly. Not financial advice.
      </p>
    </div>
  );
}
