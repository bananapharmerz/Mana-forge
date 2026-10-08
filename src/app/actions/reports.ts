"use server";

import { createHash, randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { text } from "@/lib/validate";
import { clientIp, hit, TOO_MANY } from "@/lib/rateLimit";

const REASONS = ["spam", "offensive", "copyright", "other"] as const;
export type ReportReason = (typeof REASONS)[number];

/** Flags a public deck for the admin to review in Nexus. Anyone can report, signed in or not. */
export async function reportDeck(
  deckId: unknown,
  reason: unknown,
  details?: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = text(deckId, 40);
  const why = REASONS.includes(reason as ReportReason) ? (reason as ReportReason) : null;
  if (!/^[a-z0-9]{10,40}$/i.test(id) || !why) return { ok: false, error: "That report couldn't be sent." };

  const ip = await clientIp();
  // At most 10 reports an hour from one address, and one per deck per address per day.
  if (!hit(`report:${ip}:${id}`, 1, 24 * 60 * 60 * 1000)) return { ok: false, error: "You've already reported this deck. Thanks!" };
  if (!hit(`report:${ip}`, 10, 60 * 60 * 1000)) return { ok: false, error: TOO_MANY };

  const deck = await db.deck.findUnique({ where: { id }, select: { isPublic: true } });
  if (!deck?.isPublic) return { ok: false, error: "That deck isn't public." };

  const session = await auth();
  const ipHash = createHash("sha256").update(`${process.env.AUTH_SECRET ?? ""}:${ip}`).digest("hex").slice(0, 16);
  await db.$executeRaw`
    INSERT INTO "DeckReport" ("id", "deckId", "reason", "details", "reporterId", "ipHash", "status", "createdAt")
    VALUES (${randomUUID()}, ${id}, ${why}, ${text(details, 500) || null}, ${session?.user?.id ?? null}, ${ipHash}, 'open', ${new Date().toISOString()})`;
  return { ok: true };
}
