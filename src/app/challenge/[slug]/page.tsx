import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import SupporterBadge from "@/components/SupporterBadge";
import ChallengeEnterForm from "@/components/ChallengeEnterForm";
import ChallengeVoteButton from "@/components/ChallengeVoteButton";
import { authorName } from "@/lib/author";
import { challengePhase, fmtDate, idList, type ChallengePhase } from "@/lib/community";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const ch = await db.challenge.findUnique({ where: { slug }, select: { title: true, theme: true } });
  if (!ch) return { title: "Challenge not found", robots: { index: false } };
  const description = `${SITE.name} Forge Challenge: ${ch.theme}`.slice(0, 300);
  return { title: `${ch.title} · Forge Challenge`, description, alternates: { canonical: `/challenge/${slug}` }, openGraph: { title: ch.title, description, url: `/challenge/${slug}` } };
}

const STEPS: { phase: ChallengePhase; label: string }[] = [
  { phase: "submitting", label: "Entries open" },
  { phase: "judging", label: "Finalists picked" },
  { phase: "voting", label: "Community vote" },
  { phase: "done", label: "Winner" },
];

function art(commanderData: string): string | null {
  try {
    const url = (JSON.parse(commanderData) as { imageUrl?: string }).imageUrl;
    return url?.includes("cards.scryfall.io") ? url.replace("/normal/", "/art_crop/").replace("/large/", "/art_crop/") : null;
  } catch {
    return null;
  }
}

export default async function ChallengePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ch = await db.challenge.findUnique({ where: { slug }, include: { entries: { include: { _count: { select: { votes: true } } } } } });
  if (!ch) notFound();
  const session = await auth();
  const uid = session?.user?.id;
  const phase = challengePhase(ch);
  const finalistIds = idList(ch.finalists);

  const decks = new Map(
    (
      await db.deck.findMany({
        where: { id: { in: ch.entries.map((e) => e.deckId) }, isPublic: true },
        select: { id: true, name: true, commanderName: true, commanderData: true, owner: { select: { name: true, tier: true } } },
      })
    ).map((d) => [d.id, d])
  );
  // Entries whose deck was deleted or made private drop out of the list.
  const entries = ch.entries.filter((e) => decks.has(e.deckId));
  const finalists = finalistIds.map((id) => entries.find((e) => e.id === id)).filter((e): e is (typeof entries)[number] => !!e);
  const ranked = phase === "done" ? [...finalists].sort((a, b) => b._count.votes - a._count.votes) : finalists;
  const myEntry = uid ? ch.entries.find((e) => e.userId === uid) : undefined;
  const [myVote, myDecks] = await Promise.all([
    uid && phase !== "submitting" ? db.challengeVote.findUnique({ where: { challengeId_userId: { challengeId: ch.id, userId: uid } }, select: { entryId: true } }) : Promise.resolve(null),
    uid && phase === "submitting" ? db.deck.findMany({ where: { ownerId: uid }, select: { id: true, name: true, commanderName: true, isPublic: true }, orderBy: { updatedAt: "desc" } }) : Promise.resolve([]),
  ]);
  const stepIndex = STEPS.findIndex((s) => s.phase === phase);

  const DeckTile = ({ e, children, rank }: { e: (typeof entries)[number]; children?: React.ReactNode; rank?: number }) => {
    const d = decks.get(e.deckId)!;
    const a = art(d.commanderData);
    return (
      <div className={`card-frame flex flex-col overflow-hidden ${rank === 1 ? "border-gold" : ""}`}>
        <Link href={`/decks/view/${d.id}`} className="group block">
          <div className="relative aspect-[16/9] bg-surface-raised">
            {a && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]" loading="lazy" />
            )}
            {rank === 1 && <span className="absolute left-2 top-2 rounded-full bg-gold px-2.5 py-1 text-xs font-bold text-black">Winner</span>}
          </div>
          <div className="p-3">
            <p className="font-semibold text-foreground group-hover:text-gold-bright">{d.name}</p>
            <p className="text-xs text-muted">
              {d.commanderName} · by {authorName(d.owner.name)}
              <SupporterBadge tier={d.owner.tier} />
            </p>
            {e.note && <p className="mt-2 line-clamp-3 text-sm text-foreground/90">{e.note}</p>}
          </div>
        </Link>
        {children && <div className="mt-auto px-3 pb-3">{children}</div>}
      </div>
    );
  };

  return (
    <>
      <PageHeader title={ch.title} description={ch.theme} width="max-w-5xl" />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <ol className="mb-8 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.phase} className={`rounded-md border px-3 py-2 ${i === stepIndex ? "border-gold bg-gold/10 font-semibold text-foreground" : i < stepIndex ? "border-border text-muted line-through" : "border-border text-muted"}`}>
              {i + 1}. {s.label}
            </li>
          ))}
        </ol>

        <div className="grid gap-6 md:grid-cols-3">
          <section className="md:col-span-2">
            {phase === "submitting" && (
              <div className="card-frame p-5">
                <h2 className="mb-1 font-display text-2xl font-semibold text-foreground">Enter your deck</h2>
                <p className="mb-4 text-sm text-muted">Entries close {fmtDate(ch.submitUntil)}.</p>
                {uid ? (
                  <ChallengeEnterForm challengeId={ch.id} decks={myDecks} current={myEntry ? { deckId: myEntry.deckId, note: myEntry.note ?? "" } : null} />
                ) : (
                  <p className="text-sm text-muted">
                    <Link href={`/login?callbackUrl=/challenge/${slug}`} className="font-semibold text-gold-bright underline">Sign in</Link> or{" "}
                    <Link href={`/signup?callbackUrl=/challenge/${slug}`} className="underline hover:text-gold-bright">create a free account</Link> to enter. Build the deck on {SITE.name}, make it public, and pick it here.
                  </p>
                )}
              </div>
            )}
            {phase === "judging" && (
              <div className="card-frame p-5 text-sm text-muted">
                Entries are closed. The finalists are being picked; then everyone gets to vote until {fmtDate(ch.voteUntil)}.
              </div>
            )}
            {(phase === "voting" || phase === "done") && (
              <>
                <h2 className="mb-1 font-display text-2xl font-semibold text-foreground">{phase === "voting" ? "Vote for your favourite" : "Final results"}</h2>
                <p className="mb-4 text-sm text-muted">
                  {phase === "voting"
                    ? `Voting closes ${fmtDate(ch.voteUntil)}. One vote per account; you can't vote for your own deck. Votes stay hidden until the end.`
                    : `Voting closed ${fmtDate(ch.voteUntil)}.`}
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {ranked.map((e, i) => (
                    <DeckTile key={e.id} e={e} rank={phase === "done" && i === 0 && e._count.votes > 0 ? 1 : undefined}>
                      {phase === "done" ? (
                        <p className="text-sm font-semibold text-foreground">{e._count.votes} vote{e._count.votes === 1 ? "" : "s"}</p>
                      ) : myVote ? (
                        myVote.entryId === e.id && <p className="text-sm font-semibold text-emerald-600">Your vote ✓</p>
                      ) : uid ? (
                        e.userId !== uid && <ChallengeVoteButton challengeId={ch.id} entryId={e.id} />
                      ) : (
                        <Link href={`/login?callbackUrl=/challenge/${slug}`} className="block rounded-md border border-border px-3 py-2 text-center text-sm text-muted hover:border-gold">Sign in to vote</Link>
                      )}
                    </DeckTile>
                  ))}
                </div>
              </>
            )}
          </section>

          <aside className="flex flex-col gap-4">
            <div className="card-frame p-4">
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Prize</h3>
              <p className="text-sm font-semibold text-gold-bright">{ch.prize}</p>
            </div>
            <div className="card-frame p-4 text-sm">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Key dates</h3>
              <p className="text-foreground">Entries close: {fmtDate(ch.submitUntil)}</p>
              <p className="text-foreground">Voting closes: {fmtDate(ch.voteUntil)}</p>
            </div>
            <div className="card-frame p-4 text-sm text-foreground">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Rules</h3>
              {ch.rules && <p className="mb-2 whitespace-pre-line">{ch.rules}</p>}
              <ul className="list-disc space-y-1 pl-4 text-muted">
                <li>Commander-legal deck, built and public on {SITE.name}.</li>
                <li>One entry per member, with a short note on how it fits the theme.</li>
                <li>Finalists are picked for creativity and fit, then the community votes.</li>
              </ul>
            </div>
          </aside>
        </div>

        {(phase === "submitting" || phase === "judging") && (
          <section className="mt-10">
            <h2 className="mb-4 font-display text-2xl font-semibold text-foreground">
              Entries so far ({entries.length})
            </h2>
            {entries.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {entries.map((e) => (
                  <DeckTile key={e.id} e={e} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No entries yet. Be the first!</p>
            )}
          </section>
        )}

        <p className="mt-10 text-sm">
          <Link href="/challenge" className="text-muted underline hover:text-gold-bright">← All Forge Challenges</Link>
        </p>
      </div>
    </>
  );
}
