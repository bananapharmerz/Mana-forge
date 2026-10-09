import { auth } from "@/auth";
import { db } from "@/lib/db";
import { deckLimitFor } from "@/lib/tier";
import { rowToDeck } from "@/lib/deckSerialize";
import DeckBuilderIndexClient from "./DeckBuilderIndexClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My decks", robots: { index: false, follow: false } };

export default async function DeckBuilderIndexPage() {
  const session = await auth();
  // No account yet: they can still build one deck in their browser and save it after signing up.
  if (!session?.user?.id) return <DeckBuilderIndexClient initialDecks={[]} deckLimit={null} tier="free" guest />;

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  const rows = await db.deck.findMany({
    where: { ownerId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });

  const decks = rows.map(rowToDeck);
  const limit = deckLimitFor(user?.tier ?? "free");

  return (
    <DeckBuilderIndexClient
      initialDecks={decks}
      deckLimit={Number.isFinite(limit) ? limit : null}
      tier={user?.tier ?? "free"}
    />
  );
}
