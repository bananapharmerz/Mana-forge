"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { hit, TOO_MANY } from "@/lib/rateLimit";
import { cleanDeckCard, cleanDeckCards, text } from "@/lib/validate";
import type { DeckCard } from "@/lib/deckTypes";

// Premium: save versions of a deck, compare one with the deck as it is now, and restore it.
// A restore first saves the current state as its own snapshot, so nothing is ever lost.

const MAX_PER_DECK = 30;

export interface SnapshotRow {
  id: string;
  label: string | null;
  cardCount: number;
  createdAt: string;
}
export interface SnapshotDiff {
  added: { name: string; qty: number }[]; // in the deck now, not in the snapshot
  removed: { name: string; qty: number }[]; // in the snapshot, not in the deck now
  commanderChanged: { from: string; to: string } | null;
}
type Fail = { ok: false; error: string; premium?: false };

interface SnapData {
  name: string;
  commander: DeckCard | null;
  partner: DeckCard | null;
  companion: DeckCard | null;
  cards: DeckCard[];
}

async function ownerDeck(deckId: string): Promise<{ uid: string; deck: NonNullable<Awaited<ReturnType<typeof db.deck.findUnique>>> } | Fail> {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) return { ok: false, error: "Sign in first.", premium: false };
  const user = await db.user.findUnique({ where: { id: uid }, select: { tier: true } });
  if (user?.tier !== "premium") return { ok: false, error: "Deck versions are a Premium feature.", premium: false };
  const deck = await db.deck.findUnique({ where: { id: String(deckId) } });
  if (!deck || deck.ownerId !== uid) return { ok: false, error: "Deck not found." };
  return { uid, deck };
}

const parse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

function stateOf(deck: { name: string; commanderData: string; partnerCommanderData: string | null; companionData: string | null; cards: string }): SnapData {
  return {
    name: deck.name,
    commander: parse<DeckCard | null>(deck.commanderData, null),
    partner: parse<DeckCard | null>(deck.partnerCommanderData, null),
    companion: parse<DeckCard | null>(deck.companionData, null),
    cards: parse<DeckCard[]>(deck.cards, []),
  };
}
const count = (s: SnapData) => s.cards.reduce((n, c) => n + (c.category === "Tokens" ? 0 : c.quantity), 0) + (s.commander ? 1 : 0) + (s.partner ? 1 : 0);
const toRow = (s: { id: string; label: string | null; cardCount: number; createdAt: Date }): SnapshotRow => ({ id: s.id, label: s.label, cardCount: s.cardCount, createdAt: s.createdAt.toISOString() });

async function store(deckId: string, data: SnapData, label: string | null) {
  const snap = await db.deckSnapshot.create({ data: { deckId, label, data: JSON.stringify(data), cardCount: count(data) } });
  // Keep the newest MAX_PER_DECK.
  const old = await db.deckSnapshot.findMany({ where: { deckId }, orderBy: { createdAt: "desc" }, skip: MAX_PER_DECK, select: { id: true } });
  if (old.length) await db.deckSnapshot.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
  return snap;
}

export async function listSnapshots(deckId: string): Promise<{ ok: true; snapshots: SnapshotRow[] } | Fail> {
  const o = await ownerDeck(deckId);
  if ("ok" in o) return o;
  const rows = await db.deckSnapshot.findMany({ where: { deckId: o.deck.id }, orderBy: { createdAt: "desc" }, select: { id: true, label: true, cardCount: true, createdAt: true } });
  return { ok: true, snapshots: rows.map(toRow) };
}

export async function saveSnapshot(deckId: string, label: string): Promise<{ ok: true; snapshot: SnapshotRow } | Fail> {
  const o = await ownerDeck(deckId);
  if ("ok" in o) return o;
  if (!hit(`snapshot:${o.uid}`, 60, 60 * 60 * 1000)) return { ok: false, error: TOO_MANY };
  const snap = await store(o.deck.id, stateOf(o.deck), text(label, 60) || null);
  return { ok: true, snapshot: toRow(snap) };
}

async function ownedSnapshot(snapshotId: string) {
  const snap = await db.deckSnapshot.findUnique({ where: { id: String(snapshotId) } });
  if (!snap) return { ok: false, error: "That version is gone." } as Fail;
  const o = await ownerDeck(snap.deckId);
  if ("ok" in o) return o;
  return { ...o, snap };
}

export async function compareSnapshot(snapshotId: string): Promise<{ ok: true; diff: SnapshotDiff } | Fail> {
  const o = await ownedSnapshot(snapshotId);
  if ("ok" in o) return o;
  const then = parse<SnapData>(o.snap.data, { name: "", commander: null, partner: null, companion: null, cards: [] });
  const now = stateOf(o.deck);
  const tally = (s: SnapData) => {
    const m = new Map<string, number>();
    for (const c of s.cards) m.set(c.name, (m.get(c.name) ?? 0) + c.quantity);
    return m;
  };
  const a = tally(then);
  const b = tally(now);
  const added: SnapshotDiff["added"] = [];
  const removed: SnapshotDiff["removed"] = [];
  for (const [name, q] of b) if (q > (a.get(name) ?? 0)) added.push({ name, qty: q - (a.get(name) ?? 0) });
  for (const [name, q] of a) if (q > (b.get(name) ?? 0)) removed.push({ name, qty: q - (b.get(name) ?? 0) });
  const cmd = (s: SnapData) => [s.commander?.name, s.partner?.name].filter(Boolean).join(" & ");
  const commanderChanged = cmd(then) !== cmd(now) ? { from: cmd(then), to: cmd(now) } : null;
  added.sort((x, y) => x.name.localeCompare(y.name));
  removed.sort((x, y) => x.name.localeCompare(y.name));
  return { ok: true, diff: { added, removed, commanderChanged } };
}

export async function restoreSnapshot(snapshotId: string): Promise<{ ok: true } | Fail> {
  const o = await ownedSnapshot(snapshotId);
  if ("ok" in o) return o;
  if (!hit(`snapshot:${o.uid}`, 60, 60 * 60 * 1000)) return { ok: false, error: TOO_MANY };
  const then = parse<SnapData | null>(o.snap.data, null);
  const commander = then?.commander ? cleanDeckCard(then.commander) : null;
  const cards = then ? cleanDeckCards(then.cards) : null;
  if (!then || !commander || !cards) return { ok: false, error: "That version can't be restored." };
  const partner = then.partner ? cleanDeckCard(then.partner) : null;
  const companion = !partner && then.companion ? cleanDeckCard(then.companion) : null;
  await store(o.deck.id, stateOf(o.deck), "Before restoring an older version");
  await db.deck.update({
    where: { id: o.deck.id },
    data: {
      commanderName: commander.name,
      commanderData: JSON.stringify(commander),
      partnerCommanderName: partner?.name ?? null,
      partnerCommanderData: partner ? JSON.stringify(partner) : null,
      companionName: companion?.name ?? null,
      companionData: companion ? JSON.stringify(companion) : null,
      cards: JSON.stringify(cards),
    },
  });
  revalidatePath(`/deck-builder/${o.deck.id}`);
  if (o.deck.isPublic) revalidatePath(`/decks/view/${o.deck.id}`);
  return { ok: true };
}

export async function deleteSnapshot(snapshotId: string): Promise<{ ok: true } | Fail> {
  const o = await ownedSnapshot(snapshotId);
  if ("ok" in o) return o;
  await db.deckSnapshot.delete({ where: { id: o.snap.id } });
  return { ok: true };
}
