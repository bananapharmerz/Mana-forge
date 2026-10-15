#!/usr/bin/env node
// Apply pending Prisma migrations to the LOCAL SQLite dev database.
//
// Why this exists: `prisma migrate deploy` can't acquire the SQLite lock locally on Windows with
// Prisma 7 + the better-sqlite3 driver adapter (it fails with "database is locked" even when the
// dev server is stopped). This script applies each pending migration's SQL directly through
// better-sqlite3 — which opens the DB fine — and records it in Prisma's _prisma_migrations table,
// so `prisma migrate status` stays consistent. Prod is unaffected: it still runs the normal
// `prisma migrate deploy` in the Docker build.
//
// Usage:  stop the dev server first (it holds the file lock), then:  node scripts/migrate-local.cjs
// It is idempotent — already-applied migrations are skipped. On a conflict it stops and reports,
// leaving the database untouched past that point.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

let Database;
try {
  Database = require("better-sqlite3");
} catch {
  console.error("better-sqlite3 isn't installed. Run `npm install` first.");
  process.exit(1);
}

const url = process.env.DATABASE_URL || "file:./dev.db";
const dbPath = url.replace(/^file:/, "");
if (!fs.existsSync(dbPath)) {
  console.error(`Dev database not found at ${dbPath} (DATABASE_URL=${url}).`);
  process.exit(1);
}

let db;
try {
  db = new Database(dbPath);
} catch (e) {
  console.error("Couldn't open the database:", e.message);
  process.exit(1);
}

// Clear any stale WAL lock state left by a hard-killed dev server.
try {
  db.pragma("wal_checkpoint(TRUNCATE)");
} catch {}

const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
if (!fs.existsSync(migrationsDir)) {
  console.error("No prisma/migrations directory — run this from the repo root.");
  process.exit(1);
}

let applied;
try {
  applied = new Set(
    db.prepare(`SELECT migration_name FROM "_prisma_migrations"`).all().map((r) => r.migration_name)
  );
} catch (e) {
  console.error('No "_prisma_migrations" table. Initialise the database with Prisma first.');
  process.exit(1);
}

const pending = fs
  .readdirSync(migrationsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort()
  .filter((name) => !applied.has(name));

if (pending.length === 0) {
  console.log("Up to date — no pending migrations.");
  db.close();
  process.exit(0);
}

console.log(`${pending.length} pending migration(s):`);
const record = db.prepare(
  `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
   VALUES (?, ?, ?, ?, NULL, NULL, ?, 1)`
);

let done = 0;
for (const name of pending) {
  const sqlPath = path.join(migrationsDir, name, "migration.sql");
  if (!fs.existsSync(sqlPath)) {
    console.log("  skip (no migration.sql):", name);
    continue;
  }
  const sql = fs.readFileSync(sqlPath, "utf8");
  try {
    db.exec(sql);
    const now = new Date().toISOString();
    record.run(crypto.randomUUID(), "local-apply", now, name, now);
    console.log("  ✓", name);
    done++;
  } catch (e) {
    const locked = /database is locked/i.test(e.message);
    console.error("  ✗", name, "->", e.message);
    if (locked) console.error("\nThe database is locked — stop the dev server and try again.");
    else console.error(`\nStopped after ${done} migration(s). Fix the conflict and re-run.`);
    db.close();
    process.exit(1);
  }
}

db.close();
console.log(`\nDone — applied ${done} migration(s). The local database is up to date.`);
