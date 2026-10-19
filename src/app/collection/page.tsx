import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getCardsByNames, cardImage } from "@/lib/scryfall";
import { cardNameKey } from "@/lib/cardName";
import PageHeader from "@/components/PageHeader";
import OwnedCardsManager from "./OwnedCardsManager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Cards you own",
  robots: { index: false, follow: false },
};

// The member's real-world owned-card list (kept separate from the pack-opening collection at
// /packs/collection). Feeds owned-vs-needed in the deck builder. Private to the owner.
export default async function OwnedCollectionPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/collection");

  const SHOW_LIMIT = 5000;
  const [cards, agg] = await Promise.all([
    db.ownedCard.findMany({
      where: { userId: session.user.id },
      orderBy: [{ name: "asc" }],
      take: SHOW_LIMIT,
    }),
    db.ownedCard.aggregate({
      where: { userId: session.user.id },
      _count: { _all: true },
      _sum: { quantity: true },
    }),
  ]);
  // Card images for the displayed cards, resolved by name from Scryfall (cached). Capped so a huge
  // collection doesn't fan out into dozens of API calls on each load; cards past the cap show a
  // name tile. Matched back to owned rows by normalized name.
  const IMAGE_LIMIT = 450;
  const sf = await getCardsByNames(cards.slice(0, IMAGE_LIMIT).map((c) => c.name)).catch(() => []);
  const imgByKey = new Map<string, { imageUrl?: string; uri?: string }>();
  for (const c of sf) if (!imgByKey.has(cardNameKey(c.name))) imgByKey.set(cardNameKey(c.name), { imageUrl: cardImage(c), uri: c.scryfall_uri });

  const rows = cards.map((c) => ({
    name: c.name,
    nameKey: c.nameKey,
    quantity: c.quantity,
    imageUrl: imgByKey.get(c.nameKey)?.imageUrl ?? null,
    uri: imgByKey.get(c.nameKey)?.uri ?? null,
  }));
  // True totals come from the aggregate, not the (capped) displayed rows.
  const distinct = agg._count._all;
  const copies = agg._sum.quantity ?? 0;

  return (
    <>
      <PageHeader
        title="Cards you own"
        description="Your real-world collection. Mana Forge uses it to show how much of each deck you already have."
        width="max-w-4xl"
      >
        <Link
          href="/deck-builder"
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:border-gold"
        >
          Back to decks
        </Link>
      </PageHeader>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <p className="mb-6 text-sm text-muted">
          This is separate from{" "}
          <Link href="/packs/collection" className="underline hover:text-gold-bright">
            cards you&apos;ve pulled from Open Packs
          </Link>{" "}
          — it&apos;s the list of cards you actually own, used for owned-vs-needed in the deck
          builder. Cards are matched by name (any printing); basic lands aren&apos;t counted.
        </p>
        <OwnedCardsManager initial={rows} distinct={distinct} copies={copies} />
      </div>
    </>
  );
}
