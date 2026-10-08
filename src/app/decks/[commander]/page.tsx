import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  cardImage,
  cardArtist,
  getCardByName,
  getCardsByNames,
  type ScryfallCard,
} from "@/lib/scryfall";
import ManaPips from "@/components/ManaPips";
import CardTypeChart from "@/components/CardTypeChart";
import ManaCurveChart from "@/components/ManaCurveChart";
import EdhrecCardTile from "@/components/EdhrecCardTile";
import SectionJumpDrawer from "@/components/SectionJumpDrawer";
import PublicDeckCard from "@/components/PublicDeckCard";
import CardSelectButton from "@/components/CardSelectButton";
import PartnerCardStack from "@/components/PartnerCardStack";
import { extractPartnerWithName, partnerKindOf } from "@/lib/partnerMechanics";
import { db } from "@/lib/db";
import { scryfallCardToDeckCard, type DeckCard } from "@/lib/deckTypes";
import {
  getEdhrecCommanderData,
  getTypeSections,
  getNewCards,
  getMostPlayed,
  getEdhrecPublicDecks,
  getEdhrecDeckSource,
  type EdhrecCardView,
} from "@/lib/edhrec";
import { SITE } from "@/lib/site";
import type { Metadata } from "next";
import { authorName } from "@/lib/author";

export async function generateMetadata({ params }: { params: Promise<{ commander: string }> }): Promise<Metadata> {
  const { commander } = await params;
  const name = decodeURIComponent(commander);
  const count = await db.deck.count({ where: { commanderName: name, isPublic: true } }).catch(() => 0);
  return {
    title: `${name} Commander decks`,
    description: `${count ? `${count} ${name} deck${count === 1 ? "" : "s"} built on ${SITE.name}, plus` : "Build"} ${name} decklists, top cards and ideas for your next Commander game.`,
    alternates: { canonical: `/decks/${encodeURIComponent(name)}` },
    openGraph: { title: `${name} Commander decks · ${SITE.name}`, url: `/decks/${encodeURIComponent(name)}`, images: [{ url: "/opengraph-image", width: 1200, height: 630 }] },
  };
}

export const revalidate = 3600;

function CardGrid({
  cards,
  byName,
}: {
  cards: EdhrecCardView[];
  byName: Map<string, ScryfallCard>;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
      {cards.map((c) => (
        <EdhrecCardTile
          key={c.name}
          name={c.name}
          pctDecks={c.potential_decks > 0 ? (c.num_decks / c.potential_decks) * 100 : 0}
          scryfall={byName.get(c.name)}
        />
      ))}
    </div>
  );
}

export default async function CommanderDecksPage({
  params,
}: {
  params: Promise<{ commander: string }>;
}) {
  const { commander } = await params;
  const commanderName = decodeURIComponent(commander);
  const card = await getCardByName(commanderName);

  if (!card) notFound();

  const img = cardImage(card);

  // A specific "Partner with X" pairing is shown as both cards together, same stacked tile the
  // commanders grid uses (hover or swap to bring either one to the front).
  const partnerName = extractPartnerWithName(card);
  const partnerCard = partnerName ? await getCardByName(partnerName) : null;
  const partnerImg = partnerCard ? cardImage(partnerCard) : undefined;

  const [siteDecks, edhrec, edhrecDecks] = await Promise.all([
    db.deck.findMany({
      where: { commanderName: card.name, isPublic: true },
      include: { owner: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    getEdhrecCommanderData(card.name),
    getEdhrecPublicDecks(card.name, 24),
  ]);

  const deckSourceEntries = await Promise.all(
    // Credit links that aren't ready within a second fill in for the next visitor.
    (edhrecDecks ?? []).map(async (d) => [d.urlhash, await getEdhrecDeckSource(d.urlhash, 1000)] as const)
  );
  const deckSources = new Map(deckSourceEntries);

  const typeSections = edhrec ? getTypeSections(edhrec) : [];
  const newCards = edhrec ? getNewCards(edhrec) : [];
  const mostPlayed = edhrec ? getMostPlayed(edhrec, 250) : [];

  const allNames = Array.from(
    new Set([...mostPlayed.map((c) => c.name), ...newCards.map((c) => c.name)])
  );
  const scryfallCards = allNames.length > 0 ? await getCardsByNames(allNames) : [];
  const byName = new Map(scryfallCards.map((c) => [c.name, c]));

  // Play-rate-weighted mana curve: each card contributes its real play rate (num_decks /
  // potential_decks) to its CMC bucket — roughly "expected copies of a CMC-N card per deck" —
  // rather than counting every commonly-played card equally, then normalized to sum to 100%
  // so it reads as "X% of your nonland cards cost N mana" like a real average deck.
  const curveWeights = new Map<number, number>();
  for (const c of mostPlayed) {
    const cmc = byName.get(c.name)?.cmc;
    if (cmc === undefined) continue;
    const rate = c.potential_decks > 0 ? c.num_decks / c.potential_decks : 0;
    const bucket = Math.min(Math.floor(cmc), 7);
    curveWeights.set(bucket, (curveWeights.get(bucket) ?? 0) + rate);
  }
  const curveTotal = Array.from(curveWeights.values()).reduce((s, w) => s + w, 0) || 1;
  const manaCurve = Array.from({ length: 8 }, (_, i) => ({
    label: i === 7 ? "7+" : String(i),
    pct: ((curveWeights.get(i) ?? 0) / curveTotal) * 100,
  }));

  const jumpTabs = [
    { id: "most-played", label: "Most Played", show: mostPlayed.length > 0 },
    { id: "new-cards", label: "New Cards", show: newCards.length > 0 },
    ...typeSections.map((s) => ({ id: s.tag, label: s.label, show: true })),
    { id: "public-decks", label: "Public Decks", show: !!edhrecDecks && edhrecDecks.length > 0 },
    { id: "site-decks", label: "Site Decks", show: true },
  ].filter((t) => t.show);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href="/commanders" className="text-xs text-muted underline hover:text-gold-bright">
        ← Back to Commanders
      </Link>

      <div className="mt-6 flex flex-col gap-8 sm:flex-row">
        <div className="w-full max-w-xs shrink-0">
          {img && partnerCard && partnerImg ? (
            <div className="card-frame relative aspect-[5/7] w-full overflow-hidden bg-surface-raised">
              <CardSelectButton
                card={scryfallCardToDeckCard(card)}
                partner={scryfallCardToDeckCard(partnerCard)}
              />
              <PartnerCardStack
                cardName={card.name}
                cardImg={img}
                partnerName={partnerCard.name}
                partnerImg={partnerImg}
                sizes="320px"
              />
            </div>
          ) : (
            img && (
              <div className="card-frame relative overflow-hidden">
                <CardSelectButton card={scryfallCardToDeckCard(card)} pickKind={partnerKindOf(card)} />
                <Image
                  src={img}
                  alt={card.name}
                  width={480}
                  height={670}
                  className="w-full"
                  priority
                />
              </div>
            )
          )}
          {partnerCard && partnerImg && (
            <p className="mt-1.5 text-center text-xs text-muted">
              Partners with{" "}
              <Link
                href={`/decks/${encodeURIComponent(partnerCard.name)}`}
                className="text-gold-bright underline"
              >
                {partnerCard.name}
              </Link>
            </p>
          )}
          {cardArtist(card) && (
            <p className="mt-1.5 text-center text-[10px] text-muted">
              Art by {cardArtist(card)}
            </p>
          )}
        </div>

        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">{card.name}</h1>
          <p className="mt-1 text-muted">{card.type_line}</p>
          <div className="mt-3">
            <ManaPips colors={card.color_identity} />
          </div>
          {card.oracle_text && (
            <p className="mt-4 whitespace-pre-line text-sm text-foreground/90">
              {card.oracle_text}
            </p>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/deck-builder?commander=${encodeURIComponent(card.name)}`}
              className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold-bright"
            >
              Build a deck with {card.name}
            </Link>
          </div>
        </div>
      </div>

      {edhrec ? (
        <>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="card-frame p-4">
              <h3 className="mb-3 text-sm font-semibold text-gold-bright">
                Average Card Type Breakdown
              </h3>
              <CardTypeChart counts={edhrec.typeCounts} />
            </div>
            <div className="card-frame p-4">
              <h3 className="mb-3 text-sm font-semibold text-gold-bright">
                Average Mana Curve
              </h3>
              {curveTotal > 0 ? (
                <ManaCurveChart curve={manaCurve} />
              ) : (
                <p className="text-sm text-muted">Not enough data.</p>
              )}
            </div>
          </div>

          <SectionJumpDrawer tabs={jumpTabs} />

          {mostPlayed.length > 0 && (
            <div id="most-played" className="mt-8 scroll-mt-28">
              <h2 className="mb-4 text-xl font-bold text-foreground">
                Most Played With {card.name} ({mostPlayed.length})
              </h2>
              <CardGrid cards={mostPlayed} byName={byName} />
            </div>
          )}

          {newCards.length > 0 && (
            <div id="new-cards" className="mt-10 scroll-mt-28">
              <h2 className="mb-4 text-xl font-bold text-foreground">New Cards</h2>
              <CardGrid cards={newCards} byName={byName} />
            </div>
          )}

          {typeSections.map((section) => (
            <div key={section.tag} id={section.tag} className="mt-10 scroll-mt-28">
              <h2 className="mb-4 text-xl font-bold text-foreground">
                {section.label} ({section.cardviews.length})
              </h2>
              <CardGrid cards={section.cardviews} byName={byName} />
            </div>
          ))}

          <p className="mt-6 text-[10px] text-muted">
            Play-rate data via EDHREC. Card images and prices via Scryfall.
          </p>
        </>
      ) : (
        <p className="mt-12 text-sm text-muted">
          EDHREC stats aren&apos;t available for {card.name} right now.
        </p>
      )}

      {edhrecDecks && edhrecDecks.length > 0 && (
        <div id="public-decks" className="mt-12 scroll-mt-28">
          <h2 className="mb-4 text-xl font-bold text-foreground">
            Public Decks with {card.name}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {edhrecDecks.map((d) => (
              <PublicDeckCard key={d.urlhash} deck={d} source={deckSources.get(d.urlhash) ?? null} />
            ))}
          </div>
          <p className="mt-2 text-[10px] text-muted">
            Real decks submitted by their original builders on Moxfield, Archidekt, and other
            deck sites — click through to credit and see the full list.
          </p>
        </div>
      )}

      <div id="site-decks" className="mt-12 scroll-mt-28">
        <h2 className="mb-4 text-xl font-bold text-foreground">
          Decks built with {card.name} on {SITE.name} ({siteDecks.length})
        </h2>
        {siteDecks.length === 0 ? (
          <p className="text-sm text-muted">
            No {SITE.name} decks yet — be the first to build and publish one.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {siteDecks.map((deck) => {
              const cards: DeckCard[] = JSON.parse(deck.cards);
              const size = cards.reduce((s, c) => s + c.quantity, 0) + 1;
              const author = authorName(deck.owner.name);
              return (
                <Link
                  key={deck.id}
                  href={`/decks/view/${deck.id}`}
                  className="card-frame flex flex-col gap-1 p-4 transition-colors hover:border-gold"
                >
                  <h3 className="font-semibold text-foreground">{deck.name}</h3>
                  <p className="text-xs text-muted">
                    by {author} · {size}/100 cards
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
