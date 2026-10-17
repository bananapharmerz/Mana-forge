#!/usr/bin/env node
// Smoke test: a 30-second check that the built site actually renders, run after `next build`
// and before a change is marked ready to ship.
//
// Why: a branch can type-check and build fine and still crash a page on render, or lose the
// plan buttons on /premium. This starts the production build on a spare port, asks for the pages
// that money depends on, and fails on anything other than a 200 with that page's marker text.
//
// Safe by design: it only sends GET requests, and it only runs against the local dev.db in this
// folder (the default in src/lib/db.ts). If DATABASE_PATH is set (that's how the server points at
// the live database) it refuses to run, so it can never touch real data.
//
// Usage:  npx next build && npm run smoke

import { spawn, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const PORT = Number(process.env.SMOKE_PORT) || 3999;
const BASE = `http://127.0.0.1:${PORT}`;

// One marker per page: text that only shows up when the important part rendered. Signed-out view,
// since the smoke test has no account. Keep them to headings and button labels that rarely change.
const PAGES = [
  { path: "/", marker: "Free Commander deck builder" }, // the hero's eyebrow line; the h1 is split by a <span>
  { path: "/premium", marker: "Choose a plan" },
  { path: "/prices", marker: "Know what your cards are worth" },
  { path: "/commanders", marker: "card-frame" }, // the commander grid itself, not just the header
  { path: "/deck-builder", marker: "Deck builder" },
  { path: "/api/health", marker: '"ok":true' }, // GET-only route; /api/a only takes POST beacons
];

function fail(msg) {
  console.error(`✗ smoke: ${msg}`);
  process.exitCode = 1;
}

if (process.env.DATABASE_PATH) {
  fail("DATABASE_PATH is set, which points at a real database. The smoke test only runs against the local dev.db; unset it and try again.");
  process.exit(1);
}
if (!existsSync(path.join(process.cwd(), "dev.db"))) {
  fail("no local dev.db in this folder. Create one with `node scripts/migrate-local.cjs` first.");
  process.exit(1);
}
if (!existsSync(path.join(process.cwd(), ".next", "BUILD_ID"))) {
  fail("no production build found. Run `npx next build` first.");
  process.exit(1);
}

const server = spawn(`npx next start -p ${PORT}`, { shell: true, stdio: ["ignore", "ignore", "pipe"] });
let serverErr = "";
server.stderr.on("data", (d) => (serverErr = (serverErr + d).slice(-2000)));

function stopServer() {
  if (server.exitCode !== null) return;
  // With shell: true the real server is a grandchild; on Windows only taskkill /T reaches it.
  if (process.platform === "win32") {
    try {
      execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: "ignore" });
    } catch {
      // already gone
    }
  } else server.kill("SIGTERM");
}

async function waitForServer(ms) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if (server.exitCode !== null) return false;
    try {
      await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(2000) });
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  return false;
}

try {
  if (!(await waitForServer(30000))) {
    fail(`the server didn't start on port ${PORT}.${serverErr ? `\n${serverErr}` : ""}`);
  } else {
    for (const page of PAGES) {
      const started = Date.now();
      try {
        const res = await fetch(BASE + page.path, { method: "GET", redirect: "manual", signal: AbortSignal.timeout(20000) });
        const body = await res.text();
        const ms = Date.now() - started;
        if (res.status !== 200) fail(`${page.path} answered ${res.status} (${ms} ms)`);
        else if (!body.includes(page.marker)) fail(`${page.path} is missing "${page.marker}" (${ms} ms)`);
        else console.log(`✓ ${page.path} (${ms} ms)`);
      } catch (e) {
        fail(`${page.path} didn't answer: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
} finally {
  stopServer();
}

console.log(process.exitCode ? "smoke: FAILED" : "smoke: passed");
