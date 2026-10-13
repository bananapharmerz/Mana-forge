import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import CommunityFeed, { type FeedPost } from "@/components/CommunityFeed";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Community — share decks & talk Magic",
  description: `The ${SITE.name} community: share your Commander decks, post a hot take, upvote and talk Magic with other players.`,
  alternates: { canonical: "/community" },
  openGraph: { images: ["/opengraph-image"],
    title: `${SITE.name} Community`,
    description: "Share decks, post, upvote and talk Magic with other Commander players.",
    url: "/community",
  },
};

export const dynamic = "force-dynamic";

function ago(d: Date): string {
  const s = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  const mo = Math.floor(days / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

const named = (n: string | null) => (n && n.trim()) || "Planeswalker";

export default async function CommunityPage() {
  const session = await auth();
  const uid = session?.user?.id;

  const [rows, me] = await Promise.all([
    db.post.findMany({
      where: { status: "visible" },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        author: { select: { name: true, tier: true } },
        deck: { select: { id: true, name: true, commanderName: true, isPublic: true } },
        comments: {
          where: { status: "visible" },
          orderBy: { createdAt: "asc" },
          take: 30,
          include: { author: { select: { name: true } } },
        },
      },
    }),
    uid ? db.user.findUnique({ where: { id: uid }, select: { communityOptInAt: true } }) : Promise.resolve(null),
  ]);

  const myVotes = uid
    ? new Set(
        (await db.postVote.findMany({ where: { userId: uid, postId: { in: rows.map((r) => r.id) } }, select: { postId: true } })).map((v) => v.postId)
      )
    : new Set<string>();

  const decks = uid
    ? (
        await db.deck.findMany({
          where: { ownerId: uid, isPublic: true },
          select: { id: true, name: true, commanderName: true },
          orderBy: { updatedAt: "desc" },
          take: 50,
        })
      ).map((d) => ({ id: d.id, name: d.name, commander: d.commanderName }))
    : [];

  const posts: FeedPost[] = rows.map((p) => ({
    id: p.id,
    kind: p.kind === "deck" ? "deck" : "text",
    body: p.body,
    author: named(p.author.name),
    authorTier: p.author.tier,
    ago: ago(p.createdAt),
    deck: p.deck && p.deck.isPublic ? { id: p.deck.id, name: p.deck.name, commander: p.deck.commanderName } : null,
    score: p.score,
    voted: myVotes.has(p.id),
    mine: uid === p.authorId,
    comments: p.comments.map((c) => ({
      id: c.id,
      body: c.body,
      author: named(c.author.name),
      ago: ago(c.createdAt),
      mine: uid === c.authorId,
    })),
  }));

  return (
    <>
      <PageHeader
        title="Community"
        description="Share your decks, post a hot take, upvote and talk Magic with other players."
        width="max-w-2xl"
      />
      <CommunityFeed posts={posts} signedIn={!!uid} needsOptin={!!uid && !me?.communityOptInAt} decks={decks} />
    </>
  );
}
