// Temporary IP bans for repeated abuse. Every time a rate limit or login lock turns a request away
// (src/lib/rateLimit.ts) that IP gets a strike; enough strikes in an hour and the IP is banned:
// 24 hours the first time, 7 days if it was banned in the last 30 days. Banned visitors see
// /banned with an appeal code and can email us; bans can be lifted from Nexus.
// Ordinary visitors never get close: it takes 15 blocked requests within an hour.

import { randomInt } from "node:crypto";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";
import { emailHtml, esc, sendEmail } from "@/lib/email";
import { legalInfo } from "@/lib/legal";
import { SITE } from "@/lib/site";
import { bansFile, hashIp, type BansFile } from "@/lib/banHash";

const STRIKE_LIMIT = 15;
const STRIKE_WINDOW_MS = 60 * 60 * 1000;
const FIRST_BAN_MS = 24 * 60 * 60 * 1000;
const REPEAT_BAN_MS = 7 * 24 * 60 * 60 * 1000;
const REPEAT_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;
const KEEP_AFTER_EXPIRY_MS = 90 * 24 * 60 * 60 * 1000;

const AREA_REASON: Record<string, string> = {
  login: "too many failed sign-in attempts",
  signup: "too many sign-up attempts",
  contact: "too many contact form messages",
  checkout: "too many checkout attempts",
  resetreq: "too many password reset requests",
  resetset: "too many password reset attempts",
  report: "too many deck reports",
  cancelreq: "too many cancellation requests",
  "play-action": "flooding a game room with actions",
  "play-create": "creating too many game rooms",
  stream: "opening too many game connections",
};
const reasonFor = (area: string) => AREA_REASON[area] ?? "sending far more requests than normal use";

const g = globalThis as unknown as { __mfStrikes?: Map<string, number[]>; __mfBanTimer?: ReturnType<typeof setInterval> };
const strikes: Map<string, number[]> = g.__mfStrikes ?? (g.__mfStrikes = new Map());

/** Called (fire-and-forget) whenever a request is turned away by a rate limit. */
export async function strike(area: string): Promise<void> {
  const { clientIp } = await import("@/lib/rateLimit");
  const ip = await clientIp();
  if (!ip || ip === "local") return;
  const now = Date.now();
  const list = (strikes.get(ip) ?? []).filter((t) => now - t < STRIKE_WINDOW_MS);
  list.push(now);
  strikes.set(ip, list);
  if (strikes.size > 5000) for (const [k, v] of strikes) if (!v.length || now - v[v.length - 1] > STRIKE_WINDOW_MS) strikes.delete(k);
  if (list.length < STRIKE_LIMIT) return;
  strikes.delete(ip);
  await banIp(ip, area, list.length);
}

function newCode(): string {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += abc[randomInt(abc.length)];
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

async function signedInEmail(): Promise<string | null> {
  try {
    const { auth } = await import("@/auth");
    const session = await auth();
    const id = session?.user?.id;
    if (!id) return null;
    const u = await db.user.findUnique({ where: { id }, select: { email: true } });
    return u?.email ?? null;
  } catch {
    return null;
  }
}

export async function banIp(ip: string, area: string, count: number) {
  const ipHash = hashIp(ip);
  const now = new Date();
  const active = await db.ipBan.findFirst({ where: { ipHash, liftedAt: null, expiresAt: { gt: now } } });
  if (active) return active;
  const recent = await db.ipBan.count({ where: { ipHash, createdAt: { gt: new Date(now.getTime() - REPEAT_LOOKBACK_MS) } } });
  const expiresAt = new Date(now.getTime() + (recent ? REPEAT_BAN_MS : FIRST_BAN_MS));
  const email = await signedInEmail();
  const ban = await db.ipBan.create({
    data: { ipHash, code: newCode(), reason: reasonFor(area), area, strikes: count, email, expiresAt },
  });
  await writeBansFile();
  console.warn(`[bans] banned an IP until ${expiresAt.toISOString()} (${area}, ${count} strikes, code ${ban.code})`);
  if (email) await sendBanEmail(email, ban.code, ban.reason, expiresAt).catch(() => null);
  return ban;
}

async function sendBanEmail(to: string, code: string, reason: string, until: Date) {
  const contact = legalInfo().email;
  const when = until.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });
  const subject = `Access to ${SITE.name} paused until ${when}`;
  const appeal = `mailto:${contact}?subject=${encodeURIComponent(`Ban appeal ${code}`)}`;
  await sendEmail({
    to,
    subject,
    replyTo: contact,
    html: emailHtml({
      heading: "Your access has been paused",
      body: `<p>Requests from your connection were blocked because of <b>${esc(reason)}</b>, so ${esc(SITE.name)} is unavailable from it until <b>${esc(when)}</b> (Berlin time). After that it opens again automatically.</p>
<p>If you think this is a mistake, reply to this email or write to <a href="${esc(appeal)}">${esc(contact)}</a> with your appeal code <b>${esc(code)}</b> and a short explanation. We read every appeal and lift bans that shouldn't have happened.</p>`,
    }),
    text: `Requests from your connection were blocked because of ${reason}, so ${SITE.name} is unavailable from it until ${when} (Berlin time). It opens again automatically after that.\n\nIf this is a mistake, reply to this email or write to ${contact} with your appeal code ${code} and a short explanation.`,
  });
}

/** Mirrors active bans to bans.json for the proxy. */
export async function writeBansFile() {
  const now = new Date();
  const rows = await db.ipBan.findMany({ where: { liftedAt: null, expiresAt: { gt: now } }, select: { ipHash: true, code: true, expiresAt: true } });
  const out: BansFile = {};
  for (const r of rows) out[r.ipHash] = { code: r.code, until: r.expiresAt.getTime() };
  const file = bansFile();
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(out));
  renameSync(tmp, file);
}

export async function liftBan(code: string, note?: string) {
  const r = await db.ipBan.updateMany({
    where: { code: code.trim().toUpperCase(), liftedAt: null },
    data: { liftedAt: new Date(), liftNote: note?.slice(0, 300) || null },
  });
  await writeBansFile();
  return r.count > 0;
}

export async function banByCode(code: string) {
  return db.ipBan.findUnique({ where: { code: code.trim().toUpperCase() } });
}

/** Keeps bans.json current (bans expire) and forgets old bans. Started from instrumentation. */
export function startBanSync() {
  if (g.__mfBanTimer) return;
  const tick = async () => {
    try {
      await writeBansFile();
      await db.ipBan.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - KEEP_AFTER_EXPIRY_MS) } } });
    } catch (e) {
      console.error("[bans] sync failed:", e);
    }
  };
  g.__mfBanTimer = setInterval(tick, 10 * 60 * 1000);
  g.__mfBanTimer.unref?.();
  setTimeout(tick, 5000);
}
