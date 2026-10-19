import { auth } from "@/auth";
import { db } from "@/lib/db";
import { deckLimitFor } from "@/lib/tier";
import { rowToDeck } from "@/lib/deckSerialize";
import DeckBuilderIndexClient from "./DeckBuilderIndexClient";
import StarterDecks from "@/components/StarterDecks";
import EmailConfirmNote from "@/components/EmailConfirmNote";
import WeeklyEmailNudge from "@/components/WeeklyEmailNudge";
import GameLogPanel from "@/components/GameLogPanel";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Your profile", robots: { index: false, follow: false } };

export default async function DeckBuilderIndexPage() {
  const session = await auth();
  // No account yet: they can still build one deck in their browser and save it after signing up.
  if (!session?.user?.id) return <DeckBuilderIndexClient initialDecks={[]} deckLimit={null} tier="free" guest />;

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  // Every account has a public handle; accounts without one (Google sign-ups, older accounts) pick
  // one before using account features.
  if (user && !user.username) redirect("/choose-username?next=/deck-builder");
  const rows = await db.deck.findMany({
    where: { ownerId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });

  const decks = rows.map(rowToDeck);
  const limit = deckLimitFor(user?.tier ?? "free");
  // Once a member has a deck and has confirmed their email, offer the weekly roundup — once.
  // (Unconfirmed members see the "confirm your email" note instead; they can opt in afterwards.)
  const showWeeklyNudge =
    !!user && rows.length >= 1 && !!user.emailVerifiedAt && !user.weeklyEmail && !user.weeklyEmailPromptedAt;

  const [games, gameTotal, gameWins] = await Promise.all([
    db.gameLog.findMany({ where: { userId: session.user.id }, orderBy: { playedAt: "desc" }, take: 20 }),
    db.gameLog.count({ where: { userId: session.user.id } }),
    db.gameLog.count({ where: { userId: session.user.id, won: true } }),
  ]);
  const gameRows = games.map((g) => ({
    id: g.id,
    won: g.won,
    commanderName: g.commanderName,
    players: g.players,
    playedAt: g.playedAt.toISOString(),
    notes: g.notes,
  }));

  return (
    <>
    {!user?.emailVerifiedAt && user?.email && (
      <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
        <EmailConfirmNote email={user.email} />
      </div>
    )}
    {showWeeklyNudge && (
      <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
        <WeeklyEmailNudge />
      </div>
    )}
    <DeckBuilderIndexClient
      initialDecks={decks}
      deckLimit={Number.isFinite(limit) ? limit : null}
      tier={user?.tier ?? "free"}
      profileName={user?.name ?? null}
      profileAvatar={user?.avatar ?? null}
      starter={decks.length === 0 ? <StarterDecks signedIn title="Or copy a ready-made deck" /> : undefined}
    />
    <div className="mx-auto max-w-5xl px-4 pb-12 sm:px-6">
      <GameLogPanel games={gameRows} total={gameTotal} wins={gameWins} />
    </div>
    </>
  );
}
