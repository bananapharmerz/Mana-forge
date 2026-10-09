import ArtBand from "@/components/ArtBand";
import { ManaCost } from "@/components/ManaText";
import SupporterBadge from "@/components/SupporterBadge";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { rowToDeck } from "@/lib/deckSerialize";
import { CATEGORY_ORDER, deckSize, manaCurve } from "@/lib/deckTypes";
import CardNameZoom from "@/components/CardNameZoom";
import MakeItMineButton from "@/components/MakeItMineButton";
import FavoriteButton from "@/components/FavoriteButton";
import ReportDeckButton from "@/components/ReportDeckButton";
import BuyDeckPanel from "@/components/BuyDeckPanel";
import PartnerCardStack from "@/components/PartnerCardStack";
import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { authorName, HOUSE_EMAIL } from "@/lib/author";

export async function generateMetadata({ params }: { params: Promise<{ deckId: string }> }): Promise<Metadata> {
  const { deckId } = await params;
  const d = await db.deck.findUnique({ where: { id: deckId }, select: { name: true, commanderName: true, commanderData: true, isPublic: true, owner: { select: { name: true } } } });
  if (!d || !d.isPublic) return { title: "Deck not found", robots: { index: false } };
  const by = d.owner.name && d.owner.name !== SITE.name ? ` by ${d.owner.name}` : "";
  // "Kami: Average Build" already names the commander, so don't repeat it.
  const title = d.name.toLowerCase().includes(d.commanderName.toLowerCase()) ? `${d.name} — Commander deck` : `${d.name} — ${d.commanderName} Commander deck`;
  const description = `${d.commanderName} Commander (EDH) decklist${by}: ${d.name}. The full 100-card list, mana curve and what the deck costs.`;
  // The commander's art for link previews (Scryfall's art crop of the card image).
  const art = (() => {
    try {
      const url = (JSON.parse(d.commanderData) as { imageUrl?: string }).imageUrl;
      return url?.includes("cards.scryfall.io") ? url.replace("/normal/", "/art_crop/").replace("/large/", "/art_crop/") : undefined;
    } catch {
      return undefined;
    }
  })();
  return {
    title,
    description,
    alternates: { canonical: `/decks/view/${deckId}` },
    openGraph: { type: "article", title, description, url: `/decks/view/${deckId}`, images: art ? [{ url: art, alt: `${d.commanderName} card art` }] : [{ url: "/opengraph-image", width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", images: art ? [art] : undefined },
  };
}

export const revalidate = 60;

export default async function ViewDeckPage({
  params,
}: {
  params: Promise<{ deckId: string }>;
}) {
  const { deckId } = await params;
  const [row, session] = await Promise.all([
    db.deck.findUnique({
      where: { id: deckId },
      include: { owner: { select: { name: true, email: true, tier: true } } },
    }),
    auth(),
  ]);

  if (!row || !row.isPublic) notFound();

  const userId = session?.user?.id;
  const isOwnDeck = userId === row.ownerId;
  const favorite = userId
    ? await db.favorite.findUnique({ where: { userId_deckId: { userId, deckId } } })
    : null;

  const deck = rowToDeck(row);
  const author = authorName(row.owner.name);
  const size = deckSize(deck);
  const curve = manaCurve(deck);
  const maxCurve = Math.max(1, ...curve.map((c) => c.count));

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    cards: deck.cards.filter((c) => c.category === cat),
  })).filter((g) => g.cards.length > 0);

  return (
    <>
    <ArtBand
      art={deck.commander?.imageUrl?.includes("cards.scryfall.io") ? deck.commander.imageUrl.replace("/normal/", "/art_crop/").replace("/large/", "/art_crop/") : null}
      colors={deck.commander?.colorIdentity}
    >
      <div className="mx-auto max-w-6xl px-4 pb-9 pt-8 sm:px-6">
        <Link
          href={`/decks/${encodeURIComponent(deck.commander?.name ?? "")}`}
          className="text-xs text-[#cdbf9e] underline hover:text-[#f5ecd6]"
        >
          ← Back to {deck.commander?.name}
        </Link>
        <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold leading-tight text-[#f5ecd6] sm:text-5xl">{deck.name}</h1>
        <p className="mt-2 text-sm text-[#cdbf9e]">
          by {author}
          <SupporterBadge tier={row.owner.tier} /> · {size} cards
        </p>
        {row.owner.email === HOUSE_EMAIL && (
          <p className="mt-1 max-w-2xl text-xs text-[#a99c7c]">
            Starter deck built from community play data on{" "}
            <a href="https://edhrec.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#f5ecd6]">
              EDHREC
            </a>
            . Make it yours and tune it to your table.
          </p>
        )}
        {!isOwnDeck && (
          <div className="mt-5 max-w-xs">
            <MakeItMineButton deckId={row.id} signedIn={Boolean(userId)} large />
            <p className="mt-1.5 text-xs text-[#a99c7c]">Copy all {size} cards into your own deck, then tweak it.</p>
          </div>
        )}
      </div>
    </ArtBand>
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
              { "@type": "ListItem", position: 2, name: "Commanders", item: `${SITE.url}/commanders` },
              { "@type": "ListItem", position: 3, name: deck.commander?.name ?? row.commanderName, item: `${SITE.url}/decks/${encodeURIComponent(deck.commander?.name ?? row.commanderName)}` },
              { "@type": "ListItem", position: 4, name: deck.name, item: `${SITE.url}/decks/view/${row.id}` },
            ],
          }).replace(/</g, "\\u003c"),
        }}
      />
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="w-full lg:w-64 shrink-0">
          {deck.commander?.imageUrl && deck.partner?.imageUrl ? (
            <div className="card-frame relative aspect-[5/7] w-full overflow-hidden bg-surface-raised">
              <PartnerCardStack
                cardName={deck.commander.name}
                cardImg={deck.commander.imageUrl}
                partnerName={deck.partner.name}
                partnerImg={deck.partner.imageUrl}
                sizes="256px"
              />
            </div>
          ) : (
            deck.commander?.imageUrl && (
              <div className="card-frame overflow-hidden">
                <Image
                  src={deck.commander.imageUrl}
                  alt={deck.commander.name}
                  width={480}
                  height={670}
                  className="w-full"
                />
              </div>
            )
          )}
          <p className="mt-2 text-center text-sm font-medium text-gold-bright">
            {deck.commander?.name}
            {deck.partner && ` & ${deck.partner.name}`}
          </p>
          {deck.companion?.imageUrl && (
            <>
              <div className="card-frame mt-3 overflow-hidden">
                <Image
                  src={deck.companion.imageUrl}
                  alt={deck.companion.name}
                  width={480}
                  height={670}
                  className="w-full"
                />
              </div>
              <p className="mt-1 text-center text-xs font-medium text-gold-bright">
                Companion: {deck.companion.name}
              </p>
            </>
          )}

          <div className="card-frame mt-6 p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Mana Curve
            </h3>
            <div className="flex gap-1">
              {curve.map((b) => (
                <div key={b.cmc} className="flex flex-1 flex-col items-center gap-1">
                  <div className="relative h-20 w-full">
                    <div
                      className="absolute bottom-0 w-full rounded-t bg-gold"
                      style={{ height: `${(b.count / maxCurve) * 100}%`, minHeight: b.count > 0 ? 4 : 0 }}
                    />
                  </div>
                  <span className="text-[10px] text-muted">{b.cmc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card-frame mt-4 p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{size}/100</p>
            <p className="text-xs text-muted">cards in deck</p>
          </div>

          <div className="mt-4 flex items-center gap-2">
            {isOwnDeck ? (
              <Link
                href={`/deck-builder/${row.id}`}
                className="flex-1 rounded-md border border-border px-2 py-2 text-center text-xs text-muted hover:border-gold hover:text-foreground"
              >
                This is your deck — Edit
              </Link>
            ) : (
              <div className="flex-1">
                <MakeItMineButton deckId={row.id} signedIn={Boolean(userId)} />
              </div>
            )}
            <FavoriteButton
              kind="site"
              deckId={row.id}
              initialFavorited={Boolean(favorite)}
              signedIn={Boolean(userId)}
            />
          </div>

          <BuyDeckPanel deck={deck} />
          {!isOwnDeck && <ReportDeckButton deckId={row.id} />}
        </div>

        <div className="flex-1">

          <div className="mt-8 flex flex-col gap-6">
            {grouped.length === 0 && (
              <p className="text-sm text-muted">This deck has no cards yet.</p>
            )}
            {grouped.map((group) => (
              <div key={group.category}>
                <h3 className="mb-2 text-sm font-semibold text-gold-bright">
                  {group.category} ({group.cards.reduce((s, c) => s + c.quantity, 0)})
                </h3>
                <div className="flex flex-col gap-1">
                  {group.cards.map((c) => (
                    <div
                      key={c.name}
                      className="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2"
                    >
                      <span className="w-6 text-right text-xs text-muted">{c.quantity}x</span>
                      <CardNameZoom name={c.name} imageUrl={c.imageUrl} />
                      <ManaCost cost={c.manaCost} className="ml-auto text-sm" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
