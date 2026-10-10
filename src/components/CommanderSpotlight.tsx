import Link from "next/link";
import ManaPips from "@/components/ManaPips";
import Reveal from "@/components/fx/Reveal";
import { commanderSpotlights } from "@/lib/spotlight";
import { db } from "@/lib/db";

// Home page: commander of the day, the week and the month, each linking to its commander page,
// plus whatever community event is on (the Forge Challenge and the open vote).
export default async function CommanderSpotlight() {
  const picks = commanderSpotlights();
  const now = new Date();
  const [challenge, poll] = await Promise.all([
    db.challenge.findFirst({ where: { voteUntil: { gt: now } }, orderBy: { submitUntil: "asc" }, select: { slug: true, title: true, submitUntil: true } }).catch(() => null),
    db.poll.findFirst({ where: { opensAt: { lte: now }, closesAt: { gt: now } }, orderBy: { closesAt: "asc" }, select: { slug: true, question: true } }).catch(() => null),
  ]);
  if (!picks && !challenge && !poll) return null;
  const day = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "Europe/Berlin" });
  return (
    <section className="mx-auto max-w-7xl px-4 pb-4 pt-14 sm:px-6" aria-labelledby="spotlight-title">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-gold">Fresh picks</p>
      <h2 id="spotlight-title" className="mb-6 font-display text-3xl font-semibold text-foreground">
        Commanders in the spotlight
      </h2>
      {picks && (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {picks.map((p, i) => (
          <Reveal key={p.period} delay={i * 80} className="flex">
            <Link
              href={`/decks/${encodeURIComponent(p.name)}`}
              className="card-frame group flex w-full flex-col overflow-hidden transition-colors hover:border-gold"
            >
              <div className="relative aspect-[16/9] overflow-hidden bg-surface-raised">
                {p.art && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.art} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                )}
                <span className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#ffe2a8] backdrop-blur-sm">
                  {p.label.replace("Commander of the ", "Of the ")}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-1 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-foreground group-hover:text-gold-bright">{p.name}</h3>
                  <ManaPips colors={p.colors} />
                </div>
                <p className="text-xs text-muted">{p.typeLine}</p>
                <p className="mt-auto pt-3 text-xs text-muted">
                  <span className="font-semibold text-gold-bright">See the best cards and decks →</span>
                  <span className="float-right">{p.changes}</span>
                </p>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
      )}
      {(challenge || poll) && (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {challenge && (
            <Link href={`/challenge/${challenge.slug}`} className="card-frame flex items-center gap-4 p-4 transition-colors hover:border-gold">
              <span aria-hidden className="text-3xl">🏆</span>
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-gold">Forge Challenge</span>
                <span className="block truncate font-semibold text-foreground">{challenge.title}</span>
                <span className="block text-xs text-muted">
                  {challenge.submitUntil > now ? `Enter a deck by ${day(challenge.submitUntil)} · win a free month of Premium` : "Finalists are in: vote for the winner"}
                </span>
              </span>
            </Link>
          )}
          {poll && (
            <Link href={`/vote/${poll.slug}`} className="card-frame flex items-center gap-4 p-4 transition-colors hover:border-gold">
              <span aria-hidden className="text-3xl">🗳️</span>
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-gold">Community vote</span>
                <span className="block truncate font-semibold text-foreground">{poll.question}</span>
                <span className="block text-xs text-muted">One tap, then see how everyone voted</span>
              </span>
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
