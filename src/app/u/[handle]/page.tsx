import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import Avatar from "@/components/Avatar";
import SupporterBadge from "@/components/SupporterBadge";
import ShareButton from "@/components/ShareButton";
import { authorName } from "@/lib/author";
import { SITE } from "@/lib/site";
import { parseStats, STAT_LABELS, type StatKey } from "@/lib/profileStats";

// A member's public profile. Opt-in: it exists only when they've set a handle and switched the
// profile on. Shows who they are, their public decks, recent posts, and (if they allow it) a
// collection summary. Game stats / win-rate come in a later phase once games are recorded.
// Kept out of the search index for now — it's user content and we don't want thin pages crawled.
export const revalidate = 300;

async function getProfile(handleRaw: string) {
  const handle = decodeURIComponent(handleRaw).trim().toLowerCase();
  if (!handle) return null;
  const user = await db.user.findUnique({
    where: { username: handle },
    select: {
      id: true, name: true, usernameDisplay: true, username: true, avatar: true, bio: true,
      tier: true, createdAt: true, publicProfile: true, showCollection: true, profileStats: true,
    },
  });
  if (!user || !user.publicProfile) return null;
  return user;
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const user = await getProfile(handle).catch(() => null);
  if (!user) return { title: "Profile not found", robots: { index: false, follow: false } };
  const display = user.usernameDisplay ?? user.username ?? "";
  const name = authorName(user.name);
  const title = `${name} (@${display})`;
  const description = user.bio ?? `${name}'s Magic: The Gathering profile on ${SITE.name} — decks, collection and posts.`;
  const url = `/u/${user.username}`;
  const img = user.avatar && user.avatar.startsWith("data:") ? user.avatar : "/opengraph-image";
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: false, follow: true },
    openGraph: { title: `${title} · ${SITE.name}`, description, url, images: [img] },
    twitter: { card: "summary", title: `${title} · ${SITE.name}`, description },
  };
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3 text-center">
      <div className="text-xl font-bold text-foreground">{value}</div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wide text-muted">{label}</div>
    </div>
  );
}

export default async function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const user = await getProfile(handle);
  if (!user) notFound();

  const display = user.usernameDisplay ?? user.username ?? "";
  const name = authorName(user.name);

  const [publicDeckCount, totalDeckCount, postCount, decks, posts, favoritesReceived, upvotes, collection, gamesTotal, gamesWon] = await Promise.all([
    db.deck.count({ where: { ownerId: user.id, isPublic: true } }),
    db.deck.count({ where: { ownerId: user.id } }),
    db.post.count({ where: { authorId: user.id, status: "visible" } }),
    db.deck.findMany({
      where: { ownerId: user.id, isPublic: true },
      select: { id: true, name: true, commanderName: true, cards: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    db.post.findMany({
      where: { authorId: user.id, status: "visible" },
      select: { id: true, kind: true, body: true, score: true, createdAt: true, deck: { select: { id: true, name: true, commanderName: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    db.favorite.count({ where: { deck: { ownerId: user.id, isPublic: true } } }),
    db.post.aggregate({ where: { authorId: user.id, status: "visible" }, _sum: { score: true } }),
    // Always aggregated so a "cards owned / unique cards" stat tile works; the collection *section*
    // below is still gated by showCollection.
    db.collectionCard.aggregate({ where: { userId: user.id }, _sum: { quantity: true, foilQuantity: true }, _count: true }),
    db.gameLog.count({ where: { userId: user.id } }),
    db.gameLog.count({ where: { userId: user.id, won: true } }),
  ]);

  const deckSize = (cardsJson: string) => {
    try {
      const cards = JSON.parse(cardsJson) as { quantity?: number }[];
      return cards.reduce((s, c) => s + (c.quantity ?? 1), 0) + 1; // + the commander
    } catch {
      return 0;
    }
  };

  const postsTotalScore = upvotes._sum.score ?? 0;
  const collectionCopies = collection ? (collection._sum.quantity ?? 0) + (collection._sum.foilQuantity ?? 0) : 0;
  const collectionUnique = collection ? collection._count : 0;
  const winRatePct = gamesTotal > 0 ? Math.round((gamesWon / gamesTotal) * 100) : null;
  const joined = user.createdAt.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const profileUrl = `${SITE.url}/u/${user.username}`;

  // The stat tiles the member chose to show (falls back to a sensible default set). Win-rate reads
  // "—" until they've logged at least one game.
  const statValues: Record<StatKey, string | number> = {
    publicDecks: publicDeckCount,
    totalDecks: totalDeckCount,
    posts: postCount,
    upvotes: postsTotalScore,
    favorites: favoritesReceived,
    cardsOwned: collectionCopies,
    uniqueCards: collectionUnique,
    winRate: winRatePct !== null ? `${winRatePct}%` : "—",
    gamesPlayed: gamesTotal,
  };
  const chosenStats = parseStats(user.profileStats);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <Avatar avatar={user.avatar} seed={name} size={88} className="ring-2 ring-border" />
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 font-display text-3xl font-semibold text-foreground">
            {name}
            <SupporterBadge tier={user.tier} />
          </h1>
          <p className="mt-0.5 text-sm text-muted">@{display} · Joined {joined}</p>
          {user.bio && <p className="mt-2 max-w-prose text-[15px] text-foreground/90">{user.bio}</p>}
        </div>
        <ShareButton url={profileUrl} label="Share profile" />
      </div>

      {/* Stats — the tiles the member chose */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {chosenStats.map((key) => (
          <Stat key={key} label={STAT_LABELS[key]} value={statValues[key]} />
        ))}
      </div>

      {/* Decks */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-bold text-foreground">Public decks</h2>
        {decks.length === 0 ? (
          <p className="text-sm text-muted">No public decks yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {decks.map((d) => (
              <Link
                key={d.id}
                href={`/decks/view/${d.id}`}
                className="card-frame flex flex-col gap-1 p-4 transition-colors hover:border-gold"
              >
                <h3 className="font-semibold text-foreground">{d.name}</h3>
                <p className="text-xs text-muted">{d.commanderName} · {deckSize(d.cards)}/100 cards</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Collection (opt-in) */}
      {user.showCollection && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-bold text-foreground">Collection</h2>
          {collectionUnique === 0 ? (
            <p className="text-sm text-muted">No cards collected yet — open some packs to start a collection.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="Cards owned" value={collectionCopies} />
              <Stat label="Unique cards" value={collectionUnique} />
              <div className="flex items-center justify-center rounded-lg border border-border bg-surface px-4 py-3 text-center text-xs text-muted">
                Built from opened packs
              </div>
            </div>
          )}
        </section>
      )}

      {/* Recent posts */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-bold text-foreground">Recent posts</h2>
        {posts.length === 0 ? (
          <p className="text-sm text-muted">Hasn&apos;t posted in the community yet.</p>
        ) : (
          <ul className="space-y-3">
            {posts.map((p) => (
              <li key={p.id} className="card-frame p-4">
                {p.kind === "deck" && p.deck ? (
                  <p className="text-sm text-foreground">
                    Shared a deck: <Link href={`/decks/view/${p.deck.id}`} className="text-gold-bright underline">{p.deck.name}</Link>
                    <span className="text-muted"> · {p.deck.commanderName}</span>
                  </p>
                ) : null}
                {p.body && <p className="mt-1 text-sm text-foreground/90">{p.body}</p>}
                <p className="mt-1.5 text-[11px] text-muted">
                  ▲ {p.score} · {p.createdAt.toLocaleDateString("en-GB", { dateStyle: "medium" })}
                </p>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-sm">
          <Link href="/community" className="text-gold-bright underline hover:text-gold">See the community feed →</Link>
        </p>
      </section>

      {/* Game stats — from the member's own game log */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-bold text-foreground">Game stats</h2>
        {gamesTotal === 0 ? (
          <p className="text-sm text-muted">No games logged yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Games" value={gamesTotal} />
            <Stat label="Win rate" value={winRatePct !== null ? `${winRatePct}%` : "—"} />
            <Stat label="Record" value={`${gamesWon}–${gamesTotal - gamesWon}`} />
          </div>
        )}
      </section>
    </div>
  );
}
