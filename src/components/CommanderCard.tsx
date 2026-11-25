import Image from "next/image";
import Link from "next/link";
import { cardImage, cardPriceUsd, type ScryfallCard } from "@/lib/scryfall";
import { usd } from "@/lib/livePrice";
import { scryfallCardToDeckCard, type DeckCard } from "@/lib/deckTypes";
import { extractPartnerWithName, partnerKindOf } from "@/lib/partnerMechanics";
import ManaPips from "./ManaPips";
import CardSelectButton from "./CardSelectButton";
import PartnerCardStack from "./PartnerCardStack";
import FoilTilt from "./fx/FoilTilt";

export default function CommanderCard({
  card,
  partnerCards,
  asCompanion,
  isNew,
}: {
  card: ScryfallCard;
  partnerCards?: Record<string, DeckCard>;
  asCompanion?: boolean;
  isNew?: boolean; // first printed in one of the newest sets (see lib/newBadge.ts)
}) {
  const img = cardImage(card);
  const partnerName = extractPartnerWithName(card);
  const partner = partnerName ? partnerCards?.[partnerName] : undefined;
  const partnerImg = partner?.imageUrl;
  // USD with foil fallback, the same rule the rest of the site uses. 0 counts as "no price".
  const rawPrice = cardPriceUsd(card);
  const price = rawPrice !== null && rawPrice > 0 ? rawPrice : null;

  return (
    <Link
      href={`/decks/${encodeURIComponent(card.name)}`}
      className="card-frame group flex flex-col overflow-hidden transition-transform hover:-translate-y-1 hover:border-gold"
    >
      <FoilTilt className="relative aspect-[5/7] w-full overflow-hidden bg-surface-raised">
        <CardSelectButton
          card={scryfallCardToDeckCard(card)}
          partner={partner}
          pickKind={partner || asCompanion ? null : partnerKindOf(card)}
          companion={asCompanion}
        />
        {/* Top-left, opposite the select button. One plain word, so it reads at a glance. */}
        {isNew && (
          <span className="absolute left-1.5 top-1.5 z-10 rounded-full bg-up px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black shadow-sm">
            New<span className="sr-only"> commander from the latest set</span>
          </span>
        )}
        {partnerName && partnerImg ? (
          <PartnerCardStack
            cardName={card.name}
            cardImg={img}
            partnerName={partnerName}
            partnerImg={partnerImg}
          />
        ) : img ? (
          <Image
            src={img}
            alt={card.name}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 16vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted">
            No image
          </div>
        )}
      </FoilTilt>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {/* Nearly every commander's type line starts "Legendary Creature —", so it doesn't help
            tell cards apart. Keep it as hover and screen-reader text, and show the card's own
            price below instead, which does differ and helps budget players pick at a glance. */}
        <h3
          className="line-clamp-1 text-sm font-semibold text-foreground group-hover:text-gold-bright"
          title={card.type_line}
        >
          {card.name}
          <span className="sr-only">, {card.type_line}</span>
        </h3>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <ManaPips colors={card.color_identity} />
          {/* No price, no label: a "$0.00" would read as "free". */}
          {price !== null && (
            <span
              className="shrink-0 font-mono text-[11px] text-gold-bright"
              title="Approximate market price of this single card (Scryfall, USD), not a whole deck"
            >
              {usd(price)}
              <span className="ml-1 font-sans text-[10px] text-muted">card</span>
              <span className="sr-only"> approximate market price for this card</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
