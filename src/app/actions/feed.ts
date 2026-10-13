"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { text } from "@/lib/validate";
import { clientIp, hit, TOO_MANY } from "@/lib/rateLimit";
import { screen } from "@/lib/automod";
import { MAX_COMMENT, MAX_POST } from "@/lib/feedConstants";

type Result = { ok: true } | { ok: false; error: string };

const REASONS = ["spam", "offensive", "copyright", "other"] as const;
type Reason = (typeof REASONS)[number];

// Who's allowed to post/comment: a signed-in member with a confirmed email who has accepted the
// community rules. Returns the user id or an error the UI shows (with a nudge to fix it).
async function poster(): Promise<{ id: string } | { error: string }> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return { error: "Sign in to join the community." };
  const u = await db.user.findUnique({ where: { id }, select: { emailVerifiedAt: true, communityOptInAt: true } });
  if (!u) return { error: "Sign in to join the community." };
  if (!u.emailVerifiedAt) return { error: "Confirm your email first — check your inbox for the link." };
  if (!u.communityOptInAt) return { error: "NEEDS_OPTIN" };
  return { id };
}

// One-time: the member accepts the community rules, which unlocks posting and commenting.
export async function acceptCommunityRules(): Promise<Result> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return { ok: false, error: "Sign in first." };
  await db.user.update({ where: { id }, data: { communityOptInAt: new Date() } });
  revalidatePath("/community");
  return { ok: true };
}

export async function createPost(kind: unknown, body: unknown, deckId: unknown): Promise<Result> {
  const who = await poster();
  if ("error" in who) return { ok: false, error: who.error };
  if (!hit(`post:${who.id}`, 10, 60 * 60 * 1000)) return { ok: false, error: TOO_MANY };

  const k = kind === "deck" ? "deck" : "text";
  const words = text(body, MAX_POST);

  let deck: string | null = null;
  if (k === "deck") {
    const did = text(deckId, 40);
    const d = await db.deck.findUnique({ where: { id: did }, select: { id: true, ownerId: true, isPublic: true } });
    if (!d || d.ownerId !== who.id) return { ok: false, error: "Pick one of your own decks to share." };
    if (!d.isPublic) return { ok: false, error: "Make the deck public first, so others can open it." };
    deck = d.id;
  } else if (words.length < 2) {
    return { ok: false, error: "Write something first." };
  }

  if (words) {
    const verdict = screen(words);
    if (!verdict.ok) return { ok: false, error: verdict.reason };
  }

  await db.post.create({ data: { authorId: who.id, kind: k, body: words || null, deckId: deck } });
  revalidatePath("/community");
  return { ok: true };
}

export async function votePost(postId: unknown): Promise<{ ok: true; voted: boolean } | { ok: false; error: string }> {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) return { ok: false, error: "Sign in to upvote." };
  if (!hit(`vote:${uid}`, 120, 60 * 60 * 1000)) return { ok: false, error: TOO_MANY };
  const id = text(postId, 40);
  const post = await db.post.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!post || post.status !== "visible") return { ok: false, error: "That post is gone." };

  const existing = await db.postVote.findUnique({ where: { postId_userId: { postId: id, userId: uid } }, select: { id: true } });
  try {
    if (existing) {
      await db.postVote.delete({ where: { id: existing.id } });
      await db.post.update({ where: { id }, data: { score: { decrement: 1 } } });
      revalidatePath("/community");
      return { ok: true, voted: false };
    }
    await db.postVote.create({ data: { postId: id, userId: uid } });
    await db.post.update({ where: { id }, data: { score: { increment: 1 } } });
    revalidatePath("/community");
    return { ok: true, voted: true };
  } catch {
    return { ok: false, error: "Couldn't register that vote — try again." };
  }
}

export async function addComment(postId: unknown, body: unknown): Promise<Result> {
  const who = await poster();
  if ("error" in who) return { ok: false, error: who.error };
  if (!hit(`comment:${who.id}`, 30, 60 * 60 * 1000)) return { ok: false, error: TOO_MANY };
  const id = text(postId, 40);
  const words = text(body, MAX_COMMENT);
  if (words.length < 2) return { ok: false, error: "Write a comment first." };
  const verdict = screen(words);
  if (!verdict.ok) return { ok: false, error: verdict.reason };

  const post = await db.post.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!post || post.status !== "visible") return { ok: false, error: "That post is gone." };

  await db.postComment.create({ data: { postId: id, authorId: who.id, body: words } });
  await db.post.update({ where: { id }, data: { commentCount: { increment: 1 } } });
  revalidatePath("/community");
  return { ok: true };
}

// Author removes their own post or comment (soft delete, so threads don't break).
export async function removeOwn(kind: unknown, id: unknown): Promise<Result> {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) return { ok: false, error: "Sign in first." };
  const rid = text(id, 40);
  if (kind === "comment") {
    const c = await db.postComment.findUnique({ where: { id: rid }, select: { authorId: true, postId: true, status: true } });
    if (!c || c.authorId !== uid) return { ok: false, error: "That's not yours to remove." };
    if (c.status === "visible") {
      await db.postComment.update({ where: { id: rid }, data: { status: "removed" } });
      await db.post.update({ where: { id: c.postId }, data: { commentCount: { decrement: 1 } } });
    }
  } else {
    const p = await db.post.findUnique({ where: { id: rid }, select: { authorId: true } });
    if (!p || p.authorId !== uid) return { ok: false, error: "That's not yours to remove." };
    await db.post.update({ where: { id: rid }, data: { status: "removed" } });
  }
  revalidatePath("/community");
  return { ok: true };
}

// Anyone (signed in or not) can report a post or comment. Nexus shows open reports to the admin.
export async function reportContent(postId: unknown, commentId: unknown, reason: unknown, details?: unknown): Promise<Result> {
  const pid = postId ? text(postId, 40) : null;
  const cid = commentId ? text(commentId, 40) : null;
  const why = REASONS.includes(reason as Reason) ? (reason as Reason) : null;
  if ((!pid && !cid) || !why) return { ok: false, error: "That report couldn't be sent." };

  const ip = await clientIp();
  const key = cid || pid;
  if (!hit(`postreport:${ip}:${key}`, 1, 24 * 60 * 60 * 1000)) return { ok: false, error: "You've already reported this. Thanks!" };
  if (!hit(`postreport:${ip}`, 10, 60 * 60 * 1000)) return { ok: false, error: TOO_MANY };

  const session = await auth();
  const ipHash = createHash("sha256").update(`${process.env.AUTH_SECRET ?? ""}:${ip}`).digest("hex").slice(0, 16);
  await db.$executeRaw`
    INSERT INTO "PostReport" ("id", "postId", "commentId", "reason", "details", "reporterId", "ipHash", "status", "createdAt")
    VALUES (${randomUUID()}, ${pid}, ${cid}, ${why}, ${text(details, 500) || null}, ${session?.user?.id ?? null}, ${ipHash}, 'open', ${new Date().toISOString()})`;
  return { ok: true };
}
