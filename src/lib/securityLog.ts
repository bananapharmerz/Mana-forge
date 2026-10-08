// A tally of what Mana Forge's defences stop (blocked logins, rate limits, fake payment
// notifications, breached passwords, fake game seats), for Nexus's Police Station. Counts are
// kept in memory and written once a minute as one row per kind of stop — never IPs, emails,
// passwords or anything a visitor typed.

import { randomUUID } from "node:crypto";

export type SecurityKind = "login_locked" | "rate_limited" | "breached_password" | "seat_rejected" | "webhook_bad_signature" | "payment_mismatch";

const g = globalThis as unknown as { __mfSec?: Map<string, number>; __mfSecTimer?: ReturnType<typeof setInterval> };
const pending: Map<string, number> = g.__mfSec ?? (g.__mfSec = new Map<string, number>());

async function flush() {
  if (!pending.size) return;
  const rows = [...pending.entries()];
  pending.clear();
  try {
    const { db } = await import("@/lib/db");
    const now = new Date().toISOString();
    for (const [key, count] of rows) {
      const [kind, area] = key.split("|");
      await db.$executeRaw`INSERT INTO "SecurityEvent" ("id", "kind", "area", "count", "createdAt") VALUES (${randomUUID()}, ${kind}, ${area}, ${count}, ${now})`;
    }
    if (Math.random() < 0.05) {
      const cutoff = new Date(Date.now() - 90 * 86400000).toISOString();
      await db.$executeRaw`DELETE FROM "SecurityEvent" WHERE "createdAt" < ${cutoff}`;
    }
  } catch {
    // Table missing (migration not run yet) or database busy: drop this minute's tally.
  }
}

if (!g.__mfSecTimer) {
  g.__mfSecTimer = setInterval(() => void flush(), 60_000);
  g.__mfSecTimer.unref?.();
}

/** Counts one stop. `area` is a short label like "login", "checkout" or "stripe". */
export function securityEvent(kind: SecurityKind, area = "") {
  const key = `${kind}|${area.replace(/[^a-z]/gi, "").slice(0, 20)}`;
  pending.set(key, (pending.get(key) ?? 0) + 1);
}
