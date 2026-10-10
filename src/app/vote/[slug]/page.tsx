import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import PollVoteForm from "@/components/PollVoteForm";
import PollResults from "@/components/PollResults";
import { fmtDate, pollOptions } from "@/lib/community";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const poll = await db.poll.findUnique({ where: { slug }, select: { question: true, description: true } });
  if (!poll) return { title: "Poll not found", robots: { index: false } };
  const description = poll.description ?? `Vote in the ${SITE.name} community poll: ${poll.question}`;
  return { title: `${poll.question} · Community vote`, description, alternates: { canonical: `/vote/${slug}` }, openGraph: { title: poll.question, description, url: `/vote/${slug}` } };
}

export default async function PollPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const poll = await db.poll.findUnique({ where: { slug } });
  if (!poll || poll.opensAt.getTime() > Date.now()) notFound();
  const session = await auth();
  const uid = session?.user?.id;
  const [grouped, mine] = await Promise.all([
    db.pollVote.groupBy({ by: ["optionId"], where: { pollId: poll.id }, _count: { _all: true } }),
    uid ? db.pollVote.findUnique({ where: { pollId_userId: { pollId: poll.id, userId: uid } }, select: { optionId: true } }) : Promise.resolve(null),
  ]);
  const counts = new Map(grouped.map((g) => [g.optionId, g._count._all]));
  const options = pollOptions(poll.options);
  const open = Date.now() < poll.closesAt.getTime();
  const showResults = !open || !!mine;

  return (
    <>
      <PageHeader title={poll.question} description={poll.description ?? undefined} width="max-w-3xl" />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <p className="mb-5 text-xs uppercase tracking-wide text-muted">
          {open ? `Open until ${fmtDate(poll.closesAt)}` : `Closed ${fmtDate(poll.closesAt)} · final results`}
        </p>
        {showResults ? (
          <PollResults options={options} counts={counts} mine={mine?.optionId} />
        ) : uid ? (
          <PollVoteForm pollId={poll.id} options={options} />
        ) : (
          <div className="card-frame p-6 text-sm text-muted">
            <ul className="mb-4 list-disc pl-5 text-foreground">
              {options.map((o) => (
                <li key={o.id}>{o.label}</li>
              ))}
            </ul>
            <Link href={`/login?callbackUrl=/vote/${slug}`} className="font-semibold text-gold-bright underline">Sign in</Link> or{" "}
            <Link href={`/signup?callbackUrl=/vote/${slug}`} className="underline hover:text-gold-bright">create a free account</Link> to vote. One vote per account keeps it fair.
          </div>
        )}
        <p className="mt-8 text-sm">
          <Link href="/vote" className="text-muted underline hover:text-gold-bright">← All community votes</Link>
        </p>
      </div>
    </>
  );
}
