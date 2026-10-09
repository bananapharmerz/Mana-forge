// Writes server errors to the ErrorLog table so Nexus can show them (called from
// src/instrumentation.ts). Only the route, the message (emails masked) and the digest the
// visitor sees on the error page are kept — no query strings, headers or cookies. At most 60
// rows a minute, kept for 30 days.

import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";

let windowStart = 0;
let written = 0;

// A visitor or bot leaving before the page finished sending: not a fault in the site.
const CLIENT_GONE = /destination stream closed early|premature close|request aborted|ECONNRESET|EPIPE|socket hang up/i;

export async function logServerError(err: unknown, request: { path: string; method: string }, routeType?: string) {
  try {
    if (CLIENT_GONE.test(err instanceof Error ? `${err.message} ${(err as { code?: string }).code ?? ""}` : String(err))) return;
    const now = Date.now();
    if (now - windowStart > 60_000) {
      windowStart = now;
      written = 0;
    }
    if (++written > 60) return;

    const message = (err instanceof Error ? err.message : String(err))
      .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "[email]")
      .slice(0, 1000);
    const digest = typeof err === "object" && err !== null && "digest" in err ? String(err.digest).slice(0, 100) : null;
    const path = String(request.path || "/").split("?")[0].slice(0, 300);
    const method = String(request.method || "GET").slice(0, 10);
    const kind = String(routeType || "").slice(0, 20) || null;

    await db.$executeRaw`
      INSERT INTO "ErrorLog" ("id", "digest", "path", "method", "message", "kind", "createdAt")
      VALUES (${randomUUID()}, ${digest}, ${path}, ${method}, ${message}, ${kind}, ${new Date().toISOString()})`;
    if (Math.random() < 0.02) {
      const cutoff = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
      await db.$executeRaw`DELETE FROM "ErrorLog" WHERE "createdAt" < ${cutoff}`;
    }
  } catch {
    // Never let error logging cause another error (e.g. before the migration has run).
  }
}
