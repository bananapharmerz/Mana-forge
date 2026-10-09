import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { rowToDeck } from "@/lib/deckSerialize";
import { GUEST_DECK_ID } from "@/lib/guestDeckId";
import DeckEditor from "./DeckEditor";
import GuestDeckEditor from "./GuestDeckEditor";

export default async function DeckBuilderEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // The guest deck lives in the visitor's browser, so there's nothing to load or check here.
  if (id === GUEST_DECK_ID) return <GuestDeckEditor />;

  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=/deck-builder/${id}`);

  const row = await db.deck.findUnique({ where: { id } });
  if (!row || row.ownerId !== session.user.id) notFound();

  return <DeckEditor initialDeck={rowToDeck(row)} />;
}
