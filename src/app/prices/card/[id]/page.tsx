import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { cardPriceDetail } from "@/lib/prices";
import { SITE } from "@/lib/site";
import PriceChart from "../../PriceChart";
import WatchButton from "./WatchButton";

// One printing's price page: today's price and its history (1 week, 1 month, 1 year).
export const dynamic = "force-dynamic";

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const money = (v: number | null) => (v === null ? "—" : `$${v.toFixed(2)}`);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!ID.test(id)) return { title: "Card not found", robots: { index: false } };
  const c = await db.cardPrice.findUnique({ where: { scryfallId: id }, select: { name: true, setName: true, usd: true } });
  if (!c) return { title: "Card not found", robots: { index: false } };
  const title = `${c.name}${c.setName ? ` (${c.setName})` : ""} price history`;
  const description = `${c.name}${c.setName ? ` from ${c.setName}` : ""}: ${c.usd !== null ? `$${c.usd.toFixed(2)} today. ` : ""}Daily price chart for the last week, month and year, with alerts when it drops.`;
  return { title, description, alternates: { canonical: `/prices/card/${id}` }, openGraph: { title: `${title} · ${SITE.name}`, description } };
}

export default async function CardPricePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID.test(id)) notFound();
  const [detail, session] = await Promise.all([cardPriceDetail(id), auth()]);
  if (!detail) notFound();
  const { card, history } = detail;
  const uid = session?.user?.id;
  const watch = uid ? await db.priceWatch.findFirst({ where: { userId: uid, scryfallId: id }, select: { targetUsd: true } }) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link href="/prices" className="text-xs text-muted underline hover:text-gold-bright">
        ← Card prices
      </Link>
      <div className="mt-4 flex flex-col gap-6 sm:flex-row">
        <div className="w-full max-w-[220px] shrink-0">
          {card.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={card.imageUrl} alt={card.name} className="w-full rounded-xl shadow-lg" />
          ) : (
            <div className="aspect-[5/7] w-full rounded-xl bg-surface-raised" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-4xl font-semibold leading-tight text-foreground">{card.name}</h1>
          {card.setName && <p className="mt-1 text-sm text-muted">{card.setName}</p>}
          <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2">
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-muted">Today</dt>
              <dd className="font-mono text-2xl text-foreground">{money(card.usd)}</dd>
            </div>
            {card.usdFoil !== null && (
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted">Foil</dt>
                <dd className="font-mono text-2xl text-foreground">{money(card.usdFoil)}</dd>
              </div>
            )}
          </dl>
          <div className="mt-5">
            <WatchButton scryfallId={id} name={card.name} signedIn={!!uid} watching={!!watch} />
          </div>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-2xl font-semibold text-foreground">Price history</h2>
        <PriceChart history={history} current={card.usd} currentFoil={card.usdFoil} target={watch?.targetUsd ?? null} today={new Date().toISOString().slice(0, 10)} />
        <p className="mt-3 text-[11px] text-muted">
          Daily market prices (TCGplayer, USD) from Scryfall; older days from MTGJSON. Prices may differ from what stores charge.
        </p>
      </section>
    </div>
  );
}
