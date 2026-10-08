import type { Deck as DeckRow } from "@/generated/prisma/client";
import type { Deck } from "./deckTypes";

export function rowToDeck(row: DeckRow): Deck {
  return {
    id: row.id,
    name: row.name,
    isPublic: row.isPublic,
    commander: JSON.parse(row.commanderData),
    partner: row.partnerCommanderData ? JSON.parse(row.partnerCommanderData) : undefined,
    companion: row.companionData ? JSON.parse(row.companionData) : undefined,
    cards: JSON.parse(row.cards),
    cardBackUrl: row.cardBackUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
