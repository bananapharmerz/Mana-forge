"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { hit, TOO_MANY } from "@/lib/rateLimit";
import { text } from "@/lib/validate";
import { challengePhase, idList, pollOptions } from "@/lib/community";

type Result = { ok: true } | { ok: false; error: string };

async function userId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

// ---- Polls ----------------------------------------------------------------------------------

export async function castPollVote(pollId: string, optionId: string): Promise<Result> {
  const uid = await userId();
  if (!uid) return { ok: false, error: "Sign in to vote." };
  if (!hit(`poll:${uid}`, 30, 60 * 60 * 1000)) return { ok: false, error: TOO_MANY };
  const poll = await db.poll.findUnique({ where: { id: String(pollId) } });
  if (!poll) return { ok: false, error: "That poll doesn't exist." };
  const now = Date.now();
  if (now < poll.opensAt.getTime()) return { ok: false, error: "This poll hasn't opened yet." };
  if (now >= poll.closesAt.getTime()) return { ok: false, error: "This poll has closed." };
  if (!pollOptions(poll.options).some((o) => o.id === optionId)) return { ok: false, error: "Pick one of the options." };
  try {
    await db.pollVote.create({ data: { pollId: poll.id, userId: uid, optionId } });
  } catch {
    return { ok: false, error: "You've already voted in this poll." };
  }
  revalidatePath(`/vote/${poll.slug}`);
  revalidatePath("/vote");
  return { ok: true };
}

// ---- Forge Challenge ------------------------------------------------------------------------

export async function enterChallenge(challengeId: string, deckId: string, note: string): Promise<Result> {
  const uid = await userId();
  if (!uid) return { ok: false, error: "Sign in to enter." };
  if (!hit(`challenge:${uid}`, 20, 60 * 60 * 1000)) return { ok: false, error: TOO_MANY };
  const ch = await db.challenge.findUnique({ where: { id: String(challengeId) } });
  if (!ch) return { ok: false, error: "That challenge doesn't exist." };
  if (challengePhase(ch) !== "submitting") return { ok: false, error: "Entries for this challenge are closed." };
  const deck = await db.deck.findUnique({ where: { id: String(deckId) }, select: { id: true, ownerId: true, isPublic: true } });
  if (!deck || deck.ownerId !== uid) return { ok: false, error: "Pick one of your own decks." };
  if (!deck.isPublic) return { ok: false, error: "Make the deck public first, so others can see it." };
  const why = text(note, 600);
  if (why.length < 10) return { ok: false, error: "Add a sentence or two on how the deck fits the theme." };
  // One entry per member: entering again swaps the deck.
  await db.challengeEntry.upsert({
    where: { challengeId_userId: { challengeId: ch.id, userId: uid } },
    create: { challengeId: ch.id, userId: uid, deckId: deck.id, note: why },
    update: { deckId: deck.id, note: why },
  });
  revalidatePath(`/challenge/${ch.slug}`);
  return { ok: true };
}

export async function withdrawChallengeEntry(challengeId: string): Promise<Result> {
  const uid = await userId();
  if (!uid) return { ok: false, error: "Sign in first." };
  const ch = await db.challenge.findUnique({ where: { id: String(challengeId) } });
  if (!ch) return { ok: false, error: "That challenge doesn't exist." };
  if (challengePhase(ch) !== "submitting") return { ok: false, error: "Entries can't be changed after the deadline." };
  await db.challengeEntry.deleteMany({ where: { challengeId: ch.id, userId: uid } });
  revalidatePath(`/challenge/${ch.slug}`);
  return { ok: true };
}

export async function voteChallengeFinalist(challengeId: string, entryId: string): Promise<Result> {
  const uid = await userId();
  if (!uid) return { ok: false, error: "Sign in to vote." };
  if (!hit(`challenge-vote:${uid}`, 20, 60 * 60 * 1000)) return { ok: false, error: TOO_MANY };
  const ch = await db.challenge.findUnique({ where: { id: String(challengeId) } });
  if (!ch) return { ok: false, error: "That challenge doesn't exist." };
  if (challengePhase(ch) !== "voting") return { ok: false, error: "Voting isn't open right now." };
  if (!idList(ch.finalists).includes(entryId)) return { ok: false, error: "Vote for one of the finalists." };
  const entry = await db.challengeEntry.findUnique({ where: { id: entryId }, select: { userId: true } });
  if (!entry) return { ok: false, error: "That entry is gone." };
  if (entry.userId === uid) return { ok: false, error: "You can't vote for your own deck." };
  try {
    await db.challengeVote.create({ data: { challengeId: ch.id, entryId, userId: uid } });
  } catch {
    return { ok: false, error: "You've already voted in this challenge." };
  }
  revalidatePath(`/challenge/${ch.slug}`);
  return { ok: true };
}
