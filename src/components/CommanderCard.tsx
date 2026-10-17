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
