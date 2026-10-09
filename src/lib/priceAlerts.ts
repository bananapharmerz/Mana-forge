import { db } from "@/lib/db";
import { unsubscribeUrl } from "@/lib/unsubscribe";
import { emailEnabled, emailHtml, esc, sendEmail } from "@/lib/email";
import { inChunks, today } from "@/lib/prices";
import { SITE } from "@/lib/site";
import { legalInfo } from "@/lib/legal";

// Premium perk: after each price refresh, email Premium members (who haven't turned it off)
//  - when a card on their watchlist drops to the target price they set (once, until it climbs back), and
//  - at most once a week, the cards in their decks whose price moved a lot over the last 7 days.
const MOVE_MIN_USD = 2;
const MOVE_MIN_PCT = 0.2;
const DIGEST_EVERY_MS = 7 * 86400000;

type Move = { name: string; from: number; to: number };
const money = (n: number) => `$${n.toFixed(2)}`;

function deckIds(raws: (string | null)[]): Set<string> {
  const ids = new Set<string>();
  for (const raw of raws) {
    if (!raw) continue;
    try {
      const v = JSON.parse(raw) as { scryfallId?: string } | { scryfallId?: string }[];
      for (const c of Array.isArray(v) ? v : [v]) if (c?.scryfallId) ids.add(c.scryfallId);
    } catch {}
  }
  return ids;
}

export async function runPriceAlerts(): Promise<{ emailed: number }> {
  // A watched card that climbed back above its target can alert again next time it drops.
  const alerted = await db.priceWatch.findMany({ where: { alertedAt: { not: null }, targetUsd: { not: null } }, select: { id: true, scryfallId: true, targetUsd: true } });
  if (alerted.length) {
    const now = new Map((await inChunks(alerted.map((w) => w.scryfallId), (part) => db.cardPrice.findMany({ where: { scryfallId: { in: part } }, select: { scryfallId: true, usd: true } }))).map((p) => [p.scryfallId, p.usd]));
    const rearm = alerted.filter((w) => {
      const usd = now.get(w.scryfallId);
      return usd != null && usd > (w.targetUsd ?? 0);
    });
    if (rearm.length) await db.priceWatch.updateMany({ where: { id: { in: rearm.map((w) => w.id) } }, data: { alertedAt: null } });
  }

  if (!emailEnabled()) return { emailed: 0 };
  const users = await db.user.findMany({
    where: { tier: "premium", priceAlerts: true, emailVerifiedAt: { not: null } }, // only confirmed addresses get mail
    select: { id: true, email: true, priceDigestAt: true },
  });
  let emailed = 0;
  const weekAgo = today(Date.now() - DIGEST_EVERY_MS);

  for (const u of users) {
    // 1. Watchlist targets reached.
    const watches = await db.priceWatch.findMany({ where: { userId: u.id, targetUsd: { not: null }, alertedAt: null } });
    const prices = new Map(
      (await db.cardPrice.findMany({ where: { scryfallId: { in: watches.map((w) => w.scryfallId) } }, select: { scryfallId: true, usd: true } })).map((p) => [p.scryfallId, p.usd])
    );
    const hits = watches.flatMap((w) => {
      const usd = prices.get(w.scryfallId);
      return usd != null && w.targetUsd != null && usd <= w.targetUsd ? [{ id: w.id, name: w.name, usd, target: w.targetUsd }] : [];
    });

    // 2. Big weekly moves in their decks.
    let moves: { up: Move[]; down: Move[] } = { up: [], down: [] };
    const digestDue = !u.priceDigestAt || Date.now() - u.priceDigestAt.getTime() >= DIGEST_EVERY_MS;
    if (digestDue) {
      const decks = await db.deck.findMany({ where: { ownerId: u.id }, select: { commanderData: true, partnerCommanderData: true, companionData: true, cards: true } });
      const ids = [...deckIds(decks.flatMap((d) => [d.commanderData, d.partnerCommanderData, d.companionData, d.cards]))];
      if (ids.length) {
        const [cur, old] = await Promise.all([
          inChunks(ids, (part) => db.cardPrice.findMany({ where: { scryfallId: { in: part } }, select: { scryfallId: true, name: true, usd: true } })),
          inChunks(ids, (part) => db.cardPriceHistory.findMany({ where: { scryfallId: { in: part }, day: weekAgo }, select: { scryfallId: true, usd: true } })),
        ]);
        const before = new Map(old.map((o) => [o.scryfallId, o.usd]));
        const all: Move[] = [];
        for (const c of cur) {
          const from = before.get(c.scryfallId);
          if (from == null || c.usd == null || from <= 0) continue;
          const diff = c.usd - from;
          if (Math.abs(diff) >= MOVE_MIN_USD && Math.abs(diff) / from >= MOVE_MIN_PCT) all.push({ name: c.name, from, to: c.usd });
        }
        const byDiff = (a: Move, b: Move) => Math.abs(b.to - b.from) - Math.abs(a.to - a.from);
        moves = { up: all.filter((m) => m.to > m.from).sort(byDiff).slice(0, 8), down: all.filter((m) => m.to < m.from).sort(byDiff).slice(0, 8) };
      }
    }

    if (!hits.length && !moves.up.length && !moves.down.length) continue;

    const sections: string[] = [];
    const lines: string[] = [];
    if (hits.length) {
      sections.push(`<p><b>Hit your target price</b></p><ul>${hits.map((h) => `<li>${esc(h.name)}: now ${money(h.usd)} (your target ${money(h.target)})</li>`).join("")}</ul>`);
      lines.push("Hit your target price:", ...hits.map((h) => `- ${h.name}: now ${money(h.usd)} (target ${money(h.target)})`), "");
    }
    const moveList = (title: string, list: Move[]) => {
      if (!list.length) return;
      sections.push(`<p><b>${title}</b></p><ul>${list.map((m) => `<li>${esc(m.name)}: ${money(m.from)} → ${money(m.to)}</li>`).join("")}</ul>`);
      lines.push(`${title}:`, ...list.map((m) => `- ${m.name}: ${money(m.from)} -> ${money(m.to)}`), "");
    };
    moveList("Up this week in your decks", moves.up);
    moveList("Down this week in your decks", moves.down);

    const subject = hits.length
      ? `${hits.length === 1 ? hits[0].name : `${hits.length} cards`} hit your target price`
      : "Big price moves in your decks this week";
    const L = legalInfo();
    const unsub = unsubscribeUrl(u.id);
    const footer = `You're getting this as a Premium member with price alerts on. <a href="${esc(unsub)}" style="color:#7a7488">Unsubscribe in one click</a>, or change it on <a href="${esc(SITE.url)}/premium" style="color:#7a7488">your Premium page</a>.<br>${esc(SITE.name)} · ${esc(L.owner)} · ${esc(L.address)}`;
    const ok = await sendEmail({
      to: u.email,
      subject,
      html: emailHtml({ heading: subject, body: sections.join(""), button: { label: "Open price tracker", url: `${SITE.url}/prices` }, footer }),
      text: `${lines.join("\n")}\nPrice tracker: ${SITE.url}/prices\nUnsubscribe: ${unsub}\n\n${SITE.name} · ${L.owner} · ${L.address}`,
      // Gmail / Apple Mail show their own "Unsubscribe" button from these (RFC 8058 one-click).
      headers: { "List-Unsubscribe": `<${unsub.replace("/unsubscribe?", "/api/unsubscribe?")}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    });
    if (!ok) continue;
    emailed++;
    if (hits.length) await db.priceWatch.updateMany({ where: { id: { in: hits.map((h) => h.id) } }, data: { alertedAt: new Date() } });
    if (moves.up.length || moves.down.length) await db.user.update({ where: { id: u.id }, data: { priceDigestAt: new Date() } });
  }
  return { emailed };
}
