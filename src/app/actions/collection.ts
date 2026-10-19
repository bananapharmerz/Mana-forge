"use server";

import { randomUUID } from "crypto";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { hit, TOO_MANY } from "@/lib/rateLimit";
import { revalidatePath } from "next/cache";
import { cardNameKey } from "@/lib/cardName";
import { parseOwnedList, OWNED_MAX_TEXT, OWNED_MAX_LINES, OWNED_MAX_QTY } from "@/lib/ownedList";

export interface ImportSummary {
  mode: "replace" | "add";
  added: number;
  updated: number;
  removed: number;
  total: number; // distinct cards after parsing
  rejected: string[];
}

// Import a pasted owned-card list. Parses and validates BEFORE touching the database; an empty or
// entirely-unparseable paste changes nothing (only clearOwned() empties the list). "replace" swaps
// the whole list in one transaction; "add" merges quantities onto what's there.
export async function importOwned(input: {
  text?: unknown;
  mode?: unknown;
}): Promise<{ ok: true; summary: ImportSummary } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sign in first." };
  const userId = session.user.id;
  if (!hit(`owned-import:${userId}`, 20, 60 * 60 * 1000)) return { ok: false, error: TOO_MANY };

  const text = String(input.text ?? "");
  if (text.length > OWNED_MAX_TEXT)
    return { ok: false, error: `That list is too large (over ${OWNED_MAX_TEXT.toLocaleString()} characters). Split it up.` };

  const mode = input.mode === "add" ? "add" : "replace";
  const parsed = parseOwnedList(text);
  if (parsed.lines > OWNED_MAX_LINES)
    return { ok: false, error: `That list has too many lines (over ${OWNED_MAX_LINES.toLocaleString()}). Split it up.` };
  if (parsed.entries.length === 0)
    return { ok: false, error: "No cards found in that list — nothing was changed." };

  const existing = await db.ownedCard.findMany({ where: { userId }, select: { nameKey: true, quantity: true } });
  const existingMap = new Map(existing.map((e) => [e.nameKey, e.quantity]));

  let added = 0;
  let updated = 0;
  let removed = 0;

  if (mode === "replace") {
    const newKeys = new Set(parsed.entries.map((e) => e.nameKey));
    for (const e of existing) if (!newKeys.has(e.nameKey)) removed++;
    for (const e of parsed.entries) {
      const prev = existingMap.get(e.nameKey);
      if (prev === undefined) added++;
      else if (prev !== e.quantity) updated++;
    }
    await db.$transaction([
      db.ownedCard.deleteMany({ where: { userId } }),
      db.ownedCard.createMany({
        data: parsed.entries.map((e) => ({ userId, name: e.name, nameKey: e.nameKey, quantity: e.quantity })),
      }),
    ]);
  } else {
    // "add": increment on the DATABASE side (capped), so two overlapping imports can't lose each
    // other's additions the way a read-then-write would. The added/updated tallies below are only
    // for the summary message and are computed from the pre-read snapshot.
    const ops = parsed.entries.map((e) => {
      const prev = existingMap.get(e.nameKey);
      if (prev === undefined) added++;
      else updated++;
      return db.$executeRawUnsafe(
        `INSERT INTO "OwnedCard" ("id","userId","name","nameKey","quantity","updatedAt")
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT("userId","nameKey") DO UPDATE SET
           "quantity" = MIN(?, "OwnedCard"."quantity" + excluded."quantity"),
           "name" = excluded."name",
           "updatedAt" = CURRENT_TIMESTAMP`,
        randomUUID(),
        userId,
        e.name,
        e.nameKey,
        e.quantity,
        OWNED_MAX_QTY
      );
    });
    await db.$transaction(ops);
  }

  revalidatePath("/collection");
  revalidatePath("/deck-builder");
  return { ok: true, summary: { mode, added, updated, removed, total: parsed.entries.length, rejected: parsed.rejected } };
}

// Add, change or remove one owned card by name. quantity <= 0 removes it.
export async function setOwned(input: {
  name?: unknown;
  quantity?: unknown;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sign in first." };
  const userId = session.user.id;
  if (!hit(`owned-set:${userId}`, 120, 60 * 60 * 1000)) return { ok: false, error: TOO_MANY };

  const name = String(input.name ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
  const key = cardNameKey(name);
  if (!key) return { ok: false, error: "Enter a card name." };

  let qty = Math.floor(Number(input.quantity));
  if (!Number.isFinite(qty)) qty = 1;
  qty = Math.min(OWNED_MAX_QTY, qty);

  if (qty <= 0) {
    await db.ownedCard.deleteMany({ where: { userId, nameKey: key } });
  } else {
    await db.ownedCard.upsert({
      where: { userId_nameKey: { userId, nameKey: key } },
      create: { userId, name, nameKey: key, quantity: qty },
      update: { quantity: qty, name },
    });
  }
  revalidatePath("/collection");
  revalidatePath("/deck-builder");
  return { ok: true };
}

// Empty the whole owned-card list. This is the only action that clears it.
export async function clearOwned(): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sign in first." };
  await db.ownedCard.deleteMany({ where: { userId: session.user.id } });
  revalidatePath("/collection");
  revalidatePath("/deck-builder");
  return { ok: true };
}
