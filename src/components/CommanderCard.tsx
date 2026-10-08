import Image from "next/image";
import Link from "next/link";
import { cardImage, type ScryfallCard } from "@/lib/scryfall";
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
}: {
  card: ScryfallCard;
  partnerCards?: Record<string, DeckCard>;
  asCompanion?: boolean;
}) {
  const img = cardImage(card);
  const partnerName = extractPartnerWithName(card);
  const partner = partnerName ? partnerCards?.[partnerName] : undefined;
  const partnerImg = partner?.imageUrl;

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
        <h3 className="line-clamp-1 text-sm font-semibold text-foreground group-hover:text-gold-bright">
          {card.name}
        </h3>
        <p className="line-clamp-1 text-xs text-muted">{card.type_line}</p>
        <div className="mt-auto pt-1">
          <ManaPips colors={card.color_identity} />
        </div>
      </div>
    </Link>
  );
}
