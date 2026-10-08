import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { deckLimitFor } from "@/lib/tier";
import { rowToDeck } from "@/lib/deckSerialize";
import DeckBuilderIndexClient from "./DeckBuilderIndexClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My decks", robots: { index: false, follow: false } };

export default async function DeckBuilderIndexPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/deck-builder");

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
