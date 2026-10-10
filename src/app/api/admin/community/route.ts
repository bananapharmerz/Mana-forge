import { NextResponse } from "next/server";
import { adminAllowed as allowed } from "@/lib/adminKey";
import { db } from "@/lib/db";
import { hit, ipFrom } from "@/lib/rateLimit";
import { text } from "@/lib/validate";
import { SLUG, idList, pollOptions } from "@/lib/community";

// For Nexus: create polls and Forge Challenges, and pick a challenge's finalists. Needs the
// `x-admin-key` header to match ADMIN_API_KEY (at least 32 characters); otherwise it's a 404.
//
//   GET                                  → polls with vote counts, challenges with entries and votes
//   POST {action:"createPoll", slug, question, description?, options:["A","B",…], opensAt?, closesAt}
//   POST {action:"createChallenge", slug, title, theme, rules?, prize, submitUntil, voteUntil}
//   POST {action:"setFinalists", slug, entryIds:[…]}   (up to 3 is the plan; 10 max)
// Dates are ISO strings, e.g. "2026-11-14T21:00:00Z".
export const dynamic = "force-dynamic";

const notFound = () => new NextResponse("Not found", { status: 404 });
const bad = (error: string) => NextResponse.json({ error }, { status: 400 });
const date = (v: unknown): Date | null => {
  if (typeof v !== "string") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

export async function GET(req: Request) {
  if (!hit(`admin:${ipFrom(req.headers)}`, 60, 60 * 1000) || !allowed(req)) return notFound();
  const [polls, challenges] = await Promise.all([
    db.poll.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { votes: { select: { optionId: true } } } }),
    db.challenge.findMany({ orderBy: { createdAt: "desc" }, take: 12, include: { entries: { include: { votes: { select: { id: true } } } } } }),
  ]);
  const deckIds = challenges.flatMap((c) => c.entries.map((e) => e.deckId));
  const decks = new Map(
    (await db.deck.findMany({ where: { id: { in: deckIds } }, select: { id: true, name: true, commanderName: true, isPublic: true, owner: { select: { name: true } } } })).map((d) => [d.id, d])
  );
  return NextResponse.json({
    polls: polls.map((p) => ({
      slug: p.slug,
      question: p.question,
      opensAt: p.opensAt,
      closesAt: p.closesAt,
      totalVotes: p.votes.length,
      results: pollOptions(p.options).map((o) => ({ ...o, votes: p.votes.filter((v) => v.optionId === o.id).length })),
    })),
    challenges: challenges.map((c) => ({
      slug: c.slug,
      title: c.title,
      submitUntil: c.submitUntil,
      voteUntil: c.voteUntil,
      finalists: idList(c.finalists),
      entries: c.entries.map((e) => ({
        entryId: e.id,
        userId: e.userId,
        deckId: e.deckId,
        deck: decks.get(e.deckId) ?? null,
        note: e.note,
        votes: e.votes.length,
      })),
    })),
  });
}

export async function POST(req: Request) {
  if (!hit(`admin:${ipFrom(req.headers)}`, 60, 60 * 1000) || !allowed(req)) return notFound();
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return bad("Send JSON.");
  const slug = typeof b.slug === "string" ? b.slug.trim().toLowerCase() : "";
  if (!SLUG.test(slug)) return bad("slug: lowercase letters, numbers and dashes, 2-61 characters.");

  if (b.action === "createPoll") {
    const question = text(b.question, 200);
    const closesAt = date(b.closesAt);
    const opensAt = b.opensAt === undefined ? new Date() : date(b.opensAt);
    const labels = Array.isArray(b.options) ? b.options.map((o) => text(o, 100)).filter(Boolean).slice(0, 20) : [];
    if (!question || !closesAt || !opensAt || closesAt <= opensAt) return bad("Need question and closesAt after opensAt.");
    if (labels.length < 2) return bad("Need at least 2 options.");
    const options = labels.map((label, i) => ({ id: `o${i + 1}`, label }));
    const poll = await db.poll.create({ data: { slug, question, description: text(b.description, 600) || null, options: JSON.stringify(options), opensAt, closesAt } }).catch(() => null);
    return poll ? NextResponse.json({ ok: true, url: `/vote/${slug}` }) : bad("A poll with that slug already exists.");
  }

  if (b.action === "createChallenge") {
    const title = text(b.title, 120);
    const theme = text(b.theme, 1000);
    const prize = text(b.prize, 200);
    const submitUntil = date(b.submitUntil);
    const voteUntil = date(b.voteUntil);
    if (!title || !theme || !prize || !submitUntil || !voteUntil || voteUntil <= submitUntil) return bad("Need title, theme, prize, submitUntil and a later voteUntil.");
    const ch = await db.challenge.create({ data: { slug, title, theme, rules: text(b.rules, 2000) || null, prize, submitUntil, voteUntil } }).catch(() => null);
    return ch ? NextResponse.json({ ok: true, url: `/challenge/${slug}` }) : bad("A challenge with that slug already exists.");
  }

  if (b.action === "setFinalists") {
    const ch = await db.challenge.findUnique({ where: { slug }, include: { entries: { select: { id: true } } } });
    if (!ch) return bad("No challenge with that slug.");
    if (Date.now() < ch.submitUntil.getTime()) return bad("Entries are still open.");
    const ids = Array.isArray(b.entryIds) ? [...new Set(b.entryIds.map(String))].slice(0, 10) : [];
    const valid = new Set(ch.entries.map((e) => e.id));
    if (!ids.length || ids.some((id) => !valid.has(id))) return bad("entryIds must be entries of this challenge.");
    await db.challenge.update({ where: { id: ch.id }, data: { finalists: JSON.stringify(ids) } });
    return NextResponse.json({ ok: true });
  }

  return bad("Unknown action.");
}
