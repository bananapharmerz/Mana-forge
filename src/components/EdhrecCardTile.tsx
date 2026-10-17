import { cardImage, cardBackImage, cardPriceUsd, type ScryfallCard } from "@/lib/scryfall";
import { scryfallCardToDeckCard } from "@/lib/deckTypes";
import { formatCents } from "@/lib/money";
import CardSelectButton from "./CardSelectButton";
import CardDetailButton from "./CardDetailButton";
import type { CardDetail, CardStats } from "./CardDetailModal";

export default function EdhrecCardTile({
  name,
  pctDecks,
  synergy,
  numDecks,
  scryfall,
}: {
  name: string;
  pctDecks: number;
  synergy?: number;
  numDecks?: number;
  scryfall?: ScryfallCard;
}) {
  const img = scryfall ? cardImage(scryfall) : undefined;
  const price = scryfall ? cardPriceUsd(scryfall) : null;
  const deckCard = scryfall ? scryfallCardToDeckCard(scryfall) : null;

  // A compact detail object for the popup, so the whole raw Scryfall card doesn't cross to the
  // browser for every tile — just what the popup renders.
  const detail: CardDetail | null = scryfall
    ? {
        name: scryfall.name,
        typeLine: scryfall.type_line,
        manaCost: scryfall.mana_cost,
        frontImg: img,
        backImg: cardBackImage(scryfall), // only set for true double-faced cards → enables flip
        oracle: scryfall.oracle_text,
        faces: scryfall.card_faces?.map((f) => ({ name: f.name, typeLine: f.type_line, oracle: f.oracle_text })),
        priceUsd: scryfall.prices?.usd ?? scryfall.prices?.usd_foil ?? null,
        priceEur: scryfall.prices?.eur ?? null,
        scryfallUri: scryfall.scryfall_uri,
      }
    : null;
  const stats: CardStats = { pctDecks, synergy, numDecks };

  return (
    <div className="card-frame overflow-hidden">
      <div className="relative aspect-[5/7] w-full bg-surface-raised">
        {deckCard && <CardSelectButton card={deckCard} />}
        {detail && deckCard ? (
          <CardDetailButton detail={detail} deckCard={deckCard} stats={stats} img={img} alt={name} />
        ) : (
          <div className="flex h-full items-center justify-center p-2 text-center text-[10px] text-muted">
            {name}
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="line-clamp-1 text-xs font-medium text-foreground">{name}</p>
        <p className="text-[10px] text-muted">
          {pctDecks.toFixed(0)}% of decks
          {price !== null && ` · ${formatCents(Math.round(price * 100))}`}
        </p>
      </div>
    </div>
  );
}
