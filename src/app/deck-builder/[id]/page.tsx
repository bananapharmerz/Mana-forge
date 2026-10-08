import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { rowToDeck } from "@/lib/deckSerialize";
import DeckEditor from "./DeckEditor";

export default async function DeckBuilderEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=/deck-builder/${id}`);

  const row = await db.deck.findUnique({ where: { id } });
  if (!row || row.ownerId !== session.user.id) notFound();

  return <DeckEditor initialDeck={rowToDeck(row)} />;
}
