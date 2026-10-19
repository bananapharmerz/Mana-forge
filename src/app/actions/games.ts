"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { hit, TOO_MANY } from "@/lib/rateLimit";
import { revalidatePath } from "next/cache";

function clean(v: unknown, max: number): string {
  return String(v ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

// After a change, the owner's My Decks page and (if they have one) their public profile both show
// different game stats, so refresh both.
async function revalidateProfile(userId: string) {
  revalidatePath("/deck-builder");
  const u = await db.user.findUnique({ where: { id: userId }, select: { username: true } }).catch(() => null);
  if (u?.username) revalidatePath(`/u/${u.username}`);
}

/** Record a game the member played (paper or online): win/loss, commander, pod size and date. */
export async function logGame(input: {
  won?: unknown;
  commanderName?: unknown;
  players?: unknown;
  playedAt?: unknown; // "YYYY-MM-DD"
  notes?: unknown;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sign in first." };
  if (!hit(`log-game:${session.user.id}`, 60, 60 * 60 * 1000)) return { ok: false, error: TOO_MANY };

  const won = input.won === true;
  const commanderName = clean(input.commanderName, 150) || null;
  const notes = clean(input.notes, 200) || null;

  let players = Math.floor(Number(input.players));
  if (!Number.isFinite(players)) players = 4;
  players = Math.min(16, Math.max(2, players));

  let playedAt = new Date();
  const raw = String(input.playedAt ?? "").trim();
  if (raw) {
    // Noon UTC so the chosen calendar day doesn't shift across time zones.
    const d = new Date(`${raw}T12:00:00Z`);
    if (!isNaN(d.getTime())) playedAt = d;
  }
  if (playedAt.getTime() > Date.now()) playedAt = new Date(); // no future games
  if (playedAt.getTime() < new Date("2010-01-01T00:00:00Z").getTime()) {
    return { ok: false, error: "That date is too far in the past." };
  }

  await db.gameLog.create({
    data: { userId: session.user.id, won, commanderName, players, playedAt, notes },
  });
  await revalidateProfile(session.user.id);
  return { ok: true };
}

/** Delete one of the member's own logged games. */
export async function deleteGameLog(id: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sign in first." };
  const gid = String(id ?? "");
  const row = await db.gameLog.findUnique({ where: { id: gid }, select: { userId: true } });
  if (!row || row.userId !== session.user.id) return { ok: false, error: "Game not found." };
  await db.gameLog.delete({ where: { id: gid } });
  await revalidateProfile(session.user.id);
  return { ok: true };
}
