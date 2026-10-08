import { cardImage, cardPriceUsd, type ScryfallCard } from "@/lib/scryfall";
import { scryfallCardToDeckCard } from "@/lib/deckTypes";
import { formatCents } from "@/lib/money";
import CardSelectButton from "./CardSelectButton";

export default function EdhrecCardTile({
  name,
  pctDecks,
  scryfall,
}: {
  name: string;
  pctDecks: number;
  scryfall?: ScryfallCard;
}) {
  const img = scryfall ? cardImage(scryfall) : undefined;
  const price = scryfall ? cardPriceUsd(scryfall) : null;

  return (
    <div className="card-frame overflow-hidden">
      <div className="relative aspect-[5/7] w-full bg-surface-raised">
        {scryfall && <CardSelectButton card={scryfallCardToDeckCard(scryfall)} />}
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={name} className="h-full w-full object-cover" loading="lazy" />
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
