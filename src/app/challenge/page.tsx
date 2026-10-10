import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import { challengePhase, fmtDay } from "@/lib/community";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Forge Challenge: monthly Commander deckbuilding contest",
  description: `A new theme every month. Build a Commander deck on ${SITE.name}, enter it, and let the community vote. Winners get Premium.`,
  alternates: { canonical: "/challenge" },
};

const LABEL = { submitting: "Entries open", judging: "Picking finalists", voting: "Voting now", done: "Finished" } as const;

export default async function ChallengeIndexPage() {
  const all = await db.challenge.findMany({ orderBy: { submitUntil: "desc" }, take: 24, include: { _count: { select: { entries: true } } } });
  const live = all.filter((c) => challengePhase(c) !== "done");
  const past = all.filter((c) => challengePhase(c) === "done");

  const Card = ({ c }: { c: (typeof all)[number] }) => {
    const phase = challengePhase(c);
    return (
      <Link href={`/challenge/${c.slug}`} className="card-frame block p-5 transition-colors hover:border-gold">
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${phase === "done" ? "bg-surface-raised text-muted" : "bg-gold text-black"}`}>{LABEL[phase]}</span>
        <h2 className="mt-2 font-display text-xl font-semibold text-foreground">{c.title}</h2>
        <p className="mt-1 line-clamp-2 text-sm text-muted">{c.theme}</p>
        <p className="mt-2 text-xs text-muted">
          {c._count.entries} entr{c._count.entries === 1 ? "y" : "ies"} · {phase === "submitting" ? `entries close ${fmtDay(c.submitUntil)}` : `voting ${phase === "done" ? "closed" : "closes"} ${fmtDay(c.voteUntil)}`}
        </p>
      </Link>
    );
  };

  return (
    <>
      <PageHeader title="Forge Challenge" description="A new deckbuilding theme every month. Build it, enter it, and let the community pick the winner. Prizes are free months of Premium." width="max-w-5xl" />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {live.length ? (
          <div className="grid gap-4 md:grid-cols-2">{live.map((c) => <Card key={c.id} c={c} />)}</div>
        ) : (
          <p className="text-sm text-muted">The next challenge is being forged. Check back soon, or warm up in the <Link href="/vote" className="text-gold-bright underline">community vote</Link>.</p>
        )}
        <section className="mt-10 card-frame p-5 text-sm text-foreground">
          <h2 className="mb-2 font-display text-xl font-semibold">How it works</h2>
          <ol className="list-decimal space-y-1 pl-5 text-muted">
            <li>Read the theme and build a Commander deck for it in the <Link href="/deck-builder" className="text-gold-bright underline">deck builder</Link>.</li>
            <li>Make the deck public and enter it on the challenge page with a short note.</li>
            <li>When entries close, finalists are picked, and everyone votes.</li>
            <li>Most votes wins the prize shown on the challenge.</li>
          </ol>
        </section>
        {past.length > 0 && (
          <>
            <h2 className="mb-3 mt-10 font-display text-2xl font-semibold text-foreground">Past challenges</h2>
            <div className="grid gap-4 md:grid-cols-2">{past.map((c) => <Card key={c.id} c={c} />)}</div>
          </>
        )}
      </div>
    </>
  );
}
