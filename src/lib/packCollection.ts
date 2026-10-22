// Saving pulled cards to a member's collection: one upsert per printing (nonfoil and foil counted
// separately). Used by single-pack rips and Premium booster-box rips, inside their transaction.

import type { Prisma } from "@/generated/prisma/client";
import type { PackCard } from "@/lib/packs";

export async function addPullsToCollection(tx: Prisma.TransactionClient, userId: string, cards: PackCard[]): Promise<void> {
  const byPrint = new Map<string, { card: PackCard; nonfoil: number; foil: number }>();
  for (const c of cards) {
    const e = byPrint.get(c.scryfallId) ?? { card: c, nonfoil: 0, foil: 0 };
    if (c.foil) e.foil += 1;
    else e.nonfoil += 1;
    byPrint.set(c.scryfallId, e);
  }
  for (const { card, nonfoil, foil } of byPrint.values()) {
    await tx.collectionCard.upsert({
      where: { userId_scryfallId: { userId, scryfallId: card.scryfallId } },
      create: {
        userId,
        scryfallId: card.scryfallId,
        name: card.name,
        setCode: card.setCode,
        setName: card.setName,
        rarity: card.rarity,
        colors: card.colors,
        imageUrl: card.image ?? null,
        collectorNumber: card.collectorNumber ?? null,
        scryfallUri: card.scryfallUri ?? null,
        priceUsd: card.priceUsd ?? null,
        quantity: nonfoil,
        foilQuantity: foil,
      },
      update: {
        quantity: { increment: nonfoil },
        foilQuantity: { increment: foil },
        colors: card.colors,
        priceUsd: card.priceUsd ?? undefined,
      },
    });
  }
}
