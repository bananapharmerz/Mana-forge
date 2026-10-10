import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { rowToDeck } from "@/lib/deckSerialize";
import { GUEST_DECK_ID } from "@/lib/guestDeckId";
import DeckEditor from "./DeckEditor";
import GuestDeckEditor from "./GuestDeckEditor";
import PriceChart from "@/app/prices/PriceChart";
import TrialNudge from "@/components/TrialNudge";
import { deckValueHistory } from "@/lib/prices";
import DeckSnapshotsPanel from "@/components/DeckSnapshotsPanel";

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

  const deck = rowToDeck(row);
  // Premium: the deck's value over time. Free members see what they'd get.
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { tier: true } });
  const premium = user?.tier === "premium";
  const value = premium
    ? await deckValueHistory(
        [deck.commander, deck.partner, deck.companion, ...deck.cards]
          .filter((c): c is NonNullable<typeof c> => !!c?.scryfallId)
          .map((c) => ({ id: c.scryfallId, qty: c.quantity ?? 1 }))
      ).catch(() => null)
    : null;
  const snapshots = premium
    ? (await db.deckSnapshot.findMany({ where: { deckId: row.id }, orderBy: { createdAt: "desc" }, select: { id: true, label: true, cardCount: true, createdAt: true } })).map((s) => ({ ...s, createdAt: s.createdAt.toISOString() }))
    : [];

  return (
    <>
      <DeckEditor initialDeck={deck} />
      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
        <h2 className="mb-2 font-display text-2xl font-semibold text-foreground">What this deck is worth</h2>
        {premium ? (
          value && value.current !== null ? (
            <>
              <PriceChart history={value.history} current={value.current} currentFoil={null} today={new Date().toISOString().slice(0, 10)} />
              <p className="mt-1.5 text-[11px] text-muted">As last saved. Each card&apos;s market price (TCGplayer, USD) per day.</p>
            </>
          ) : (
            <p className="text-sm text-muted">Add some cards and save; the value graph appears once they have prices.</p>
          )
        ) : (
          <TrialNudge>See what your deck is worth over the last week, month and year, and get an email when its price moves.</TrialNudge>
        )}
      </section>
      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
        <h2 className="mb-2 font-display text-2xl font-semibold text-foreground">Versions</h2>
        <DeckSnapshotsPanel deckId={row.id} premium={premium} initial={snapshots} />
      </section>
    </>
  );
}
