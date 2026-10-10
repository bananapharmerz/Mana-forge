import { db } from "@/lib/db";
import { unsubscribeUrl } from "@/lib/unsubscribe";
import { emailEnabled, emailHtml, esc, sendEmail } from "@/lib/email";
import { lastWeekEnd, moversForWeek, type Mover } from "@/lib/prices";
import { commanderSpotlights } from "@/lib/spotlight";
import { challengePhase, fmtDay } from "@/lib/community";
import { SITE } from "@/lib/site";
import { legalInfo } from "@/lib/legal";

// The weekly roundup: one short email on Monday mornings to members who switched it on themselves
// (account page, confirmed address only). Runs from the hourly price tick; each member gets at most
// one per week (weeklyEmailSentAt), so restarts and several ticks never double-send.
//   - the week's biggest Commander price movers (the same numbers as /prices/movers/<week>)
//   - the commander of the week
//   - what's on in the Forge Challenge

const SEND_FROM_UTC_HOUR = 7; // 09:00 in Germany in summer, 08:00 in winter
const money = (n: number) => `$${n.toFixed(2)}`;
const pct = (m: Mover) => `${m.pct > 0 ? "+" : "−"}${Math.abs(Math.round(m.pct * 100))}%`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** This week's Monday at the send hour (UTC), or null if it's not Monday after the send hour yet. */
function thisMondaySlot(now = new Date()): Date | null {
  const slot = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), SEND_FROM_UTC_HOUR));
  slot.setUTCDate(slot.getUTCDate() - ((slot.getUTCDay() + 6) % 7)); // back to Monday
  if (now < slot) return null;
  // Only send on the Monday itself, so a server that was down doesn't send a stale roundup mid-week.
  return now.getTime() - slot.getTime() < 24 * 3600000 ? slot : null;
}

export async function buildWeekly(): Promise<{ subject: string; html: (unsub: string) => string; text: (unsub: string) => string } | null> {
  const end = lastWeekEnd();
  const w = await moversForWeek(end, 5);
  const spot = commanderSpotlights()?.find((s) => s.period === "week") ?? null;
  const challenges = (await db.challenge.findMany({ orderBy: { submitUntil: "asc" }, take: 6 })).filter((c) => challengePhase(c) !== "done");
  if (!w.up.length && !w.down.length && !spot && !challenges.length) return null;
  const L = legalInfo();
  const moversUrl = `${SITE.url}/prices/movers/${end}`;

  const rows = (list: Mover[], colour: string) =>
    list
      .map((m) => `<tr><td style="padding:4px 0">${esc(m.name)}<br><span style="color:#7a7488;font-size:12px">${esc(m.setName ?? "")}</span></td><td style="padding:4px 0;text-align:right;white-space:nowrap">${money(m.weekAgoUsd)} → ${money(m.usd)}<br><b style="color:${colour}">${pct(m)}</b></td></tr>`)
      .join("");
  const parts: string[] = [];
  const text: string[] = [];
  if (w.up.length || w.down.length) {
    parts.push(`<h2 style="font-size:17px;margin:24px 0 8px">Price movers this week</h2>`);
    if (w.up.length) parts.push(`<p style="margin:8px 0 2px;font-weight:700;color:#1f7a45">Going up</p><table width="100%" style="font-size:14px;border-collapse:collapse">${rows(w.up, "#1f7a45")}</table>`);
    if (w.down.length) parts.push(`<p style="margin:12px 0 2px;font-weight:700;color:#b3361f">Going down</p><table width="100%" style="font-size:14px;border-collapse:collapse">${rows(w.down, "#b3361f")}</table>`);
    parts.push(`<p style="margin:8px 0 0;font-size:13px"><a href="${esc(moversUrl)}" style="color:#b8892e">All movers and price lines</a></p>`);
    text.push("PRICE MOVERS THIS WEEK", ...w.up.map((m) => `▲ ${m.name}: ${money(m.weekAgoUsd)} → ${money(m.usd)} (${pct(m)})`), ...w.down.map((m) => `▼ ${m.name}: ${money(m.weekAgoUsd)} → ${money(m.usd)} (${pct(m)})`), moversUrl, "");
  }
  if (spot) {
    const url = `${SITE.url}/decks/${encodeURIComponent(spot.name)}`;
    parts.push(`<h2 style="font-size:17px;margin:24px 0 8px">Commander of the week</h2><p style="margin:0"><b>${esc(spot.name)}</b><br><span style="color:#7a7488;font-size:13px">${esc(spot.typeLine)}</span></p><p style="margin:6px 0 0;font-size:13px"><a href="${esc(url)}" style="color:#b8892e">Top cards and decklists</a></p>`);
    text.push("COMMANDER OF THE WEEK", spot.name, url, "");
  }
  for (const c of challenges) {
    const phase = challengePhase(c);
    const url = `${SITE.url}/challenge/${c.slug}`;
    const when = phase === "submitting" ? `Entries close ${fmtDay(c.submitUntil)}` : phase === "voting" ? `Voting closes ${fmtDay(c.voteUntil)}` : "Finalists coming soon";
    parts.push(`<h2 style="font-size:17px;margin:24px 0 8px">Forge Challenge: ${esc(c.title)}</h2><p style="margin:0">${esc(c.theme)}</p><p style="margin:6px 0 0;font-size:13px;color:#7a7488">${esc(when)} · Prize: ${esc(c.prize)}</p><p style="margin:6px 0 0;font-size:13px"><a href="${esc(url)}" style="color:#b8892e">${phase === "voting" ? "Vote now" : "See the challenge"}</a></p>`);
    text.push(`FORGE CHALLENGE: ${c.title}`, c.theme, `${when} · Prize: ${c.prize}`, url, "");
  }
  const top = w.up[0];
  const subject = top ? `This week in Commander: ${top.name} ${pct(top)}` : `This week on ${SITE.name}`;
  const footer = (unsub: string) =>
    `You're getting this because you switched on the weekly roundup on your account page. <a href="${esc(unsub)}" style="color:#7a7488">Unsubscribe in one click</a>, or turn it off on <a href="${esc(SITE.url)}/account" style="color:#7a7488">your account page</a>. Prices: TCGplayer market (USD) via Scryfall; not financial advice.<br>${esc(SITE.name)} · ${esc(L.owner)} · ${esc(L.address)}`;
  return {
    subject,
    html: (unsub) => emailHtml({ heading: "Your weekly Commander roundup", body: parts.join(""), button: { label: "Open Mana Forge", url: SITE.url }, footer: footer(unsub) }),
    text: (unsub) => `Your weekly Commander roundup\n\n${text.join("\n")}\nUnsubscribe: ${unsub}\n\n${SITE.name} · ${L.owner} · ${L.address}`,
  };
}

export async function runWeeklyEmail(now = new Date()): Promise<{ emailed: number }> {
  const slot = thisMondaySlot(now);
  if (!slot || !emailEnabled()) return { emailed: 0 };
  const users = await db.user.findMany({
    where: { weeklyEmail: true, emailVerifiedAt: { not: null }, OR: [{ weeklyEmailSentAt: null }, { weeklyEmailSentAt: { lt: slot } }] },
    select: { id: true, email: true },
    take: 500,
  });
  if (!users.length) return { emailed: 0 };
  const mail = await buildWeekly();
  if (!mail) return { emailed: 0 };
  let emailed = 0;
  for (const u of users) {
    const unsub = unsubscribeUrl(u.id, "weekly");
    const ok = await sendEmail({
      to: u.email,
      subject: mail.subject,
      html: mail.html(unsub),
      text: mail.text(unsub),
      headers: { "List-Unsubscribe": `<${unsub.replace("/unsubscribe?", "/api/unsubscribe?")}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    });
    // Marked either way, so one bad address can't be retried every hour all Monday.
    await db.user.update({ where: { id: u.id }, data: { weeklyEmailSentAt: new Date() } }).catch(() => null);
    if (ok) emailed++;
    await sleep(600); // stay under the mail provider's rate limit
  }
  return { emailed };
}
