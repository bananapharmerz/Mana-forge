import { auth } from "@/auth";
import { db } from "@/lib/db";
import { deckLimitFor } from "@/lib/tier";
import { rowToDeck } from "@/lib/deckSerialize";
import DeckBuilderIndexClient from "./DeckBuilderIndexClient";
import StarterDecks from "@/components/StarterDecks";
import EmailConfirmNote from "@/components/EmailConfirmNote";
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
    <>
    {!user?.emailVerifiedAt && user?.email && (
      <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
        <EmailConfirmNote email={user.email} />
      </div>
    )}
    <DeckBuilderIndexClient
      initialDecks={decks}
      deckLimit={Number.isFinite(limit) ? limit : null}
      tier={user?.tier ?? "free"}
      starter={decks.length === 0 ? <StarterDecks signedIn title="Or copy a ready-made deck" /> : undefined}
    />
    </>
  );
}
