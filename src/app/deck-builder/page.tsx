import { auth } from "@/auth";
import { db } from "@/lib/db";
import { deckLimitFor } from "@/lib/tier";
import { rowToDeck } from "@/lib/deckSerialize";
import DeckBuilderIndexClient from "./DeckBuilderIndexClient";
import StarterDecks from "@/components/StarterDecks";
import EmailConfirmNote from "@/components/EmailConfirmNote";
import WeeklyEmailNudge from "@/components/WeeklyEmailNudge";
import GameLogPanel from "@/components/GameLogPanel";
import { computeNeeds } from "@/lib/ownedList";
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

  const userId = session.user.id;
  const [games, gameTotal, gameWins, perDeck, owned] = await Promise.all([
    db.gameLog.findMany({ where: { userId }, orderBy: { playedAt: "desc" }, take: 20 }),
    db.gameLog.count({ where: { userId } }),
    db.gameLog.count({ where: { userId, won: true } }),
    db.gameLog.groupBy({ by: ["deckId", "won"], where: { userId, deckId: { not: null } }, _count: { _all: true } }),
    db.ownedCard.findMany({ where: { userId }, select: { nameKey: true, quantity: true } }),
  ]);

  const deckNameById = new Map(rows.map((r) => [r.id, r.name]));
  const gameRows = games.map((g) => ({
    id: g.id,
    won: g.won,
    commanderName: g.commanderName,
    players: g.players,
    playedAt: g.playedAt.toISOString(),
    notes: g.notes,
    deckName: g.deckId ? deckNameById.get(g.deckId) ?? null : null,
  }));
  const deckOptions = decks.map((d) => ({ id: d.id, name: d.name, commanderName: d.commander?.name ?? "" }));

  // Per-deck win/loss, from logged games linked to each deck.
  const deckStats: Record<string, { wins: number; losses: number }> = {};
  for (const g of perDeck) {
    if (!g.deckId) continue;
    const s = (deckStats[g.deckId] ??= { wins: 0, losses: 0 });
    if (g.won) s.wins += g._count._all;
    else s.losses += g._count._all;
  }

  // Owned-vs-needed per deck (distinct non-basic cards), from the member's real-world owned list.
  const ownedMap = new Map(owned.map((o) => [o.nameKey, o.quantity]));
  const hasOwnedList = ownedMap.size > 0;
  const ownedCounts: Record<string, { owned: number; needed: number }> = {};
  if (hasOwnedList) {
    for (const d of decks) {
      const needCards = [d.commander, d.partner, d.companion, ...d.cards]
        .filter((c): c is NonNullable<typeof c> => !!c)
        .map((c) => ({ name: c.name, quantity: c.quantity, category: c.category }));
      const r = computeNeeds(needCards, ownedMap);
      ownedCounts[d.id] = { owned: r.ownedNames, needed: r.neededNames };
    }
  }

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
      deckStats={deckStats}
      ownedCounts={ownedCounts}
      hasOwnedList={hasOwnedList}
      starter={decks.length === 0 ? <StarterDecks signedIn title="Or copy a ready-made deck" /> : undefined}
    />
    <div className="mx-auto max-w-5xl px-4 pb-12 sm:px-6">
      <GameLogPanel games={gameRows} total={gameTotal} wins={gameWins} decks={deckOptions} />
    </div>
    </>
  );
}
