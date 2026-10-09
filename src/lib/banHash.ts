import { createHash } from "node:crypto";
import path from "node:path";

// Shared by the server and src/proxy.ts. The IP itself is never stored: only a keyed hash of it.
export function hashIp(ip: string): string {
  return createHash("sha256").update(`${process.env.AUTH_SECRET ?? ""}|ipban|${ip}`).digest("hex").slice(0, 40);
}

// Active bans are mirrored to a small JSON file next to the database, so the proxy can check every
// request without touching the database.
export function bansFile(): string {
  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "dev.db");
  return path.join(path.dirname(dbPath), "bans.json");
}

export type BansFile = Record<string, { code: string; until: number }>;
