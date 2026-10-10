import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import { fmtDay } from "@/lib/community";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Community votes",
  description: `Quick polls for Commander players on ${SITE.name}: vote once, see what everyone else picked.`,
  alternates: { canonical: "/vote" },
};

export default async function VoteIndexPage() {
  const now = new Date();
  const polls = await db.poll.findMany({
    where: { opensAt: { lte: now } },
    orderBy: { closesAt: "desc" },
    take: 40,
    include: { _count: { select: { votes: true } } },
  });
  const open = polls.filter((p) => p.closesAt > now);
  const closed = polls.filter((p) => p.closesAt <= now);

  const Row = ({ p, live }: { p: (typeof polls)[number]; live: boolean }) => (
    <li>
      <Link href={`/vote/${p.slug}`} className="card-frame flex items-center justify-between gap-4 p-4 transition-colors hover:border-gold">
        <span className="min-w-0">
          <span className="block font-medium text-foreground">{p.question}</span>
          <span className="block text-xs text-muted">
            {live ? `Open until ${fmtDay(p.closesAt)}` : `Closed ${fmtDay(p.closesAt)}`} · {p._count.votes.toLocaleString("en-US")} votes
          </span>
        </span>
        <span className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold ${live ? "bg-gold text-black" : "border border-border text-muted"}`}>{live ? "Vote" : "Results"}</span>
      </Link>
    </li>
  );

  return (
    <>
      <PageHeader title="Community votes" description="One question, one vote per account. See what other Commander players think." width="max-w-3xl" />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h2 className="mb-3 font-display text-2xl font-semibold text-foreground">Open now</h2>
        {open.length ? <ul className="flex flex-col gap-2">{open.map((p) => <Row key={p.id} p={p} live />)}</ul> : <p className="text-sm text-muted">No vote is open right now. The next one is coming soon.</p>}
        {closed.length > 0 && (
          <>
            <h2 className="mb-3 mt-10 font-display text-2xl font-semibold text-foreground">Past results</h2>
            <ul className="flex flex-col gap-2">{closed.map((p) => <Row key={p.id} p={p} live={false} />)}</ul>
          </>
        )}
        <p className="mt-10 text-sm text-muted">
          Also on now: the monthly <Link href="/challenge" className="text-gold-bright underline">Forge Challenge</Link> deckbuilding contest.
        </p>
      </div>
    </>
  );
}
