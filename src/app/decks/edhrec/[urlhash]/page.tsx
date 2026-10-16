import ArtBand from "@/components/ArtBand";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getEdhrecDeckList } from "@/lib/edhrec";
import { getCardByName, getCardsByNames, cardImage, type ScryfallCard } from "@/lib/scryfall";
import CardNameZoom from "@/components/CardNameZoom";
import { ManaCost } from "@/components/ManaText";

// A read-only, public view of one community deck from EDHREC (sourced from Moxfield, Archidekt,
// etc.). The full list is shown here on Mana Forge — no sign-up, no bounce off-site — with credit
// to the original builder and their site. Saving a copy still needs an account.
export const revalidate = 3600;

// Ordering so the list reads like a real decklist rather than EDHREC's object key order.
const CAT_ORDER = ["Commander", "Planeswalker", "Creature", "Sorcery", "Instant", "Artifact", "Enchantment", "Battle", "Land"];
const catRank = (c: string) => {
  const i = CAT_ORDER.indexOf(c);
  return i === -1 ? CAT_ORDER.length : i;
};

export async function generateMetadata({ params }: { params: Promise<{ urlhash: string }> }): Promise<Metadata> {
  const { urlhash } = await params;
  const list = await getEdhrecDeckList(urlhash, 6000).catch(() => null);
  const name = list?.commanders[0];
  // EDHREC-sourced lists are other people's decks mirrored for viewing; keep them out of our index.
  return {
    title: name ? `${name} — community deck` : "Community deck",
    robots: { index: false, follow: true },
  };
}

export default async function EdhrecDeckPage({ params }: { params: Promise<{ urlhash: string }> }) {
  const { urlhash } = await params;
  const list = await getEdhrecDeckList(urlhash, 9000);
  if (!list) notFound();

  const commanderName = list.commanders[0] ?? "";
  const allNames = Array.from(new Set([...list.commanders, ...list.groups.flatMap((g) => g.cards.map((c) => c.name))]));
  const [commanderCard, scryfall] = await Promise.all([
    commanderName ? getCardByName(commanderName).catch(() => null) : Promise.resolve(null),
    allNames.length ? getCardsByNames(allNames).catch(() => [] as ScryfallCard[]) : Promise.resolve([] as ScryfallCard[]),
  ]);
  const byName = new Map(scryfall.map((c) => [c.name, c]));
  const art = commanderCard?.image_uris?.art_crop ?? commanderCard?.card_faces?.[0]?.image_uris?.art_crop ?? null;

  const groups = [...list.groups].sort((a, b) => catRank(a.category) - catRank(b.category));
  const total = list.groups.reduce((s, g) => s + g.cards.reduce((n, c) => n + c.qty, 0), 0) + list.commanders.length;
  const credit = list.source;

  return (
    <>
      <ArtBand art={art} colors={commanderCard?.color_identity}>
        <div className="mx-auto max-w-6xl px-4 pb-9 pt-8 sm:px-6">
          <Link href={`/decks/${encodeURIComponent(commanderName)}`} className="text-xs text-[#cdbf9e] underline hover:text-[#f5ecd6]">
            ← Back to {commanderName || "commander"}
          </Link>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold leading-tight text-[#f5ecd6] sm:text-5xl">
            {commanderName}
            <span className="text-[#cdbf9e]"> — community deck</span>
          </h1>
          <p className="mt-2 text-sm text-[#cdbf9e]">
            {total} cards
            {list.savedate ? ` · ${list.savedate}` : ""}
            {credit ? (
              <>
                {" "}· built by a player on{" "}
                <a href={credit.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-[#f5ecd6]">
                  {credit.siteName} ↗
                </a>
              </>
            ) : null}
          </p>
          <p className="mt-3 max-w-2xl text-xs text-[#a99c7c]">
            A community decklist, shown here for reference. Credit to its original builder{credit ? ` on ${credit.siteName}` : ""}.{" "}
            <Link href={`/deck-builder?commander=${encodeURIComponent(commanderName)}`} className="text-gold-bright underline hover:text-[#f5ecd6]">
              Build your own {commanderName} deck
            </Link>{" "}
            — free, no account needed. Sign up to save decks to your collection.
          </p>
        </div>
      </ArtBand>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="w-full lg:w-64 shrink-0">
            {commanderCard && cardImage(commanderCard) && (
              <div className="card-frame overflow-hidden">
                <Image src={cardImage(commanderCard)!} alt={commanderName} width={480} height={670} className="w-full" />
              </div>
            )}
            <p className="mt-2 text-center text-sm font-medium text-gold-bright">{commanderName}</p>
            <div className="card-frame mt-4 p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{total}</p>
              <p className="text-xs text-muted">cards in deck</p>
            </div>
            <Link
              href={`/deck-builder?commander=${encodeURIComponent(commanderName)}`}
              className="mt-4 block rounded-md bg-gold px-3 py-2 text-center text-sm font-semibold text-black hover:bg-gold-bright"
            >
              Build your own
            </Link>
            {credit && (
              <a
                href={credit.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block rounded-md border border-border px-3 py-2 text-center text-xs text-muted hover:border-gold hover:text-foreground"
              >
                View the original on {credit.siteName} ↗
              </a>
            )}
          </div>

          <div className="flex-1">
            <div className="flex flex-col gap-6">
              {groups.map((group) => (
                <div key={group.category}>
                  <h3 className="mb-2 text-sm font-semibold text-gold-bright">
                    {group.category} ({group.cards.reduce((s, c) => s + c.qty, 0)})
                  </h3>
                  <div className="flex flex-col gap-1">
                    {group.cards.map((c) => {
                      const sc = byName.get(c.name);
                      return (
                        <div key={c.name} className="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2">
                          <span className="w-6 text-right text-xs text-muted">{c.qty}x</span>
                          <CardNameZoom name={c.name} imageUrl={sc ? cardImage(sc) ?? undefined : undefined} />
                          {sc?.mana_cost && <ManaCost cost={sc.mana_cost} className="ml-auto text-sm" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-6 text-[10px] text-muted">
              Decklist via EDHREC{credit ? `, originally on ${credit.siteName}` : ""}. Card images and prices via Scryfall.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
