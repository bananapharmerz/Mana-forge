import PageHeader from "@/components/PageHeader";
import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { livePrices, mostValuable, priceHistory, trackerStats, weeklyMovers, type Mover } from "@/lib/prices";
import { signedPct, usd } from "@/lib/livePrice";
import Watchlist, { type WatchRow } from "./Watchlist";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Card price tracker",
  alternates: { canonical: "/prices" },
  description: "Follow Magic: The Gathering card prices: your watchlist with target prices, and the week's biggest movers in Commander decks.",
  openGraph: { title: "Card price tracker · Mana Forge", description: "Follow Magic: The Gathering card prices: your watchlist with target prices, and the week's biggest movers in Commander decks." },
};

function MoverList({ title, rows, up }: { title: string; rows: Mover[]; up: boolean }) {
  return (
    <div className="card-frame p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h2>
      {rows.length ? (
        <ul className="space-y-2">
          {rows.map((m) => (
            <li key={m.scryfallId} className="flex items-center gap-3 text-sm">
              {m.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.imageUrl} alt="" className="h-10 w-7 shrink-0 rounded-sm object-cover object-top" loading="lazy" />
              ) : (
                <span className="h-10 w-7 shrink-0 rounded-sm bg-surface-raised" />
              )}
              <span className="min-w-0 flex-1">
                <Link href={`/prices/card/${m.scryfallId}`} className="block truncate text-foreground hover:text-gold-bright hover:underline">{m.name}</Link>
                <span className="block truncate text-[11px] text-muted">{m.setName}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-mono text-foreground">{usd(m.usd)}</span>
                <span className={`block text-[11px] font-semibold ${up ? "text-emerald-600" : "text-red-600"}`}>
                  {up ? "▲" : "▼"} {signedPct(m.pct)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Nothing moved much yet. Movers show up once a few days of prices have been recorded.</p>
      )}
    </div>
  );
}

export default async function PricesPage() {
  const session = await auth();
  const uid = session?.user?.id;
  const [movers, valuable, stats, watches] = await Promise.all([
    weeklyMovers(6),
    mostValuable(8),
    trackerStats(),
    uid ? db.priceWatch.findMany({ where: { userId: uid }, orderBy: { createdAt: "desc" } }) : Promise.resolve([]),
  ]);
  const me = uid ? await db.user.findUnique({ where: { id: uid }, select: { tier: true } }) : null;
  const ids = watches.map((w) => w.scryfallId);
  const [prices, history, cards] = await Promise.all([
    livePrices(ids),
    priceHistory(ids, 30),
    ids.length ? db.cardPrice.findMany({ where: { scryfallId: { in: ids } }, select: { scryfallId: true, setName: true, imageUrl: true } }) : Promise.resolve([]),
  ]);
  const meta = new Map(cards.map((c) => [c.scryfallId, c]));
  const rows: WatchRow[] = watches.map((w) => ({
    id: w.id,
    scryfallId: w.scryfallId,
    name: w.name,
    setName: meta.get(w.scryfallId)?.setName ?? null,
    imageUrl: meta.get(w.scryfallId)?.imageUrl ?? null,
    usd: prices[w.scryfallId]?.usd ?? prices[w.scryfallId]?.usdFoil ?? null,
    weekAgoUsd: prices[w.scryfallId]?.weekAgoUsd ?? null,
    targetUsd: w.targetUsd,
    history: (history[w.scryfallId] ?? []).map((h) => h.usd),
  }));
  const hits = rows.filter((r) => r.targetUsd !== null && r.usd !== null && r.usd <= r.targetUsd);

  return (
    <>
      <PageHeader title="Know what your cards are worth" description={`Daily Scryfall prices for ${stats.cards.toLocaleString("en-US")} printings in ${SITE.name} decks and watchlists. Watch a card, set the price you'd pay, and see it flagged when it drops there.`} width="max-w-6xl" />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <section className="mb-10">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold text-foreground">Your watchlist</h2>
          {hits.length > 0 && (
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700">
              {hits.length} at or below your target
            </span>
          )}
        </div>
        {uid ? (
          <Watchlist rows={rows} premium={me?.tier === "premium"} />
        ) : (
          <div className="card-frame p-6 text-center text-sm text-muted">
            <Link href="/signup?callbackUrl=/prices" className="font-semibold text-gold-bright underline">Create a free account</Link> to watch cards and set the price you&apos;d pay. Already have one?{" "}
            <Link href="/login?callbackUrl=/prices" className="underline hover:text-gold-bright">Sign in</Link>.
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MoverList title="Up this week" rows={movers.up} up />
        <MoverList title="Down this week" rows={movers.down} up={false} />
        <div className="card-frame p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Most valuable in {SITE.name} decks</h2>
          {valuable.length ? (
            <ol className="space-y-1.5 text-sm">
              {valuable.map((c, i) => (
                <li key={c.scryfallId} className="flex items-center gap-2">
                  <span className="w-4 text-right text-[11px] text-muted">{i + 1}</span>
                  <Link href={`/prices/card/${c.scryfallId}`} className="min-w-0 flex-1 truncate text-foreground hover:text-gold-bright hover:underline" title={c.setName ?? undefined}>{c.name}</Link>
                  <span className="font-mono text-gold-bright">{usd(c.usd ?? 0)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted">Prices are being collected; check back shortly.</p>
          )}
        </div>
      </section>

      <p className="mt-8 text-center text-[11px] text-muted">
        {stats.updatedAt ? `Last updated ${new Date(stats.updatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}. ` : ""}
        Prices are Scryfall&apos;s daily market prices (TCGplayer, USD) and may differ from what stores charge.
      </p>
    </div>
    </>
  );
}
