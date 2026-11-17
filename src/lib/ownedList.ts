import { cardNameKey, isBasicLandName } from "./cardName";

// Parsing + comparison for the member's real-world owned-card list. All matching goes through
// cardNameKey (see cardName.ts) so import, manual edits and deck comparison agree.

export const OWNED_MAX_TEXT = 300_000; // characters in one paste
export const OWNED_MAX_LINES = 5000; // non-empty, non-comment lines in one paste
export const OWNED_MAX_QTY = 9999;
const NAME_MAX = 200;

export interface ParsedOwnedEntry {
  name: string; // display name (as entered, tidied)
  nameKey: string; // normalized match key
  quantity: number;
}
export interface ParsedOwned {
  entries: ParsedOwnedEntry[]; // de-duplicated: duplicate names summed into one entry
  rejected: string[]; // sample of lines that couldn't be parsed (for feedback)
  lines: number; // non-empty, non-comment lines seen
}

// Collection exports tack set/collector/foil tags onto the name; strip them so the name matches.
function stripTail(name: string): string {
  return name
    .replace(/\s*\*[a-z]{1,2}\*\s*$/i, "") // *F* / *E* foil/etched markers
    .replace(/\s*[([][a-z0-9]{2,6}[)\]]\s*\d*\s*$/i, "") // "(C21) 263" / "[2X2]"
    .replace(/\s+#?\d{1,5}\s*$/i, "") // trailing collector number
    .replace(/\s+<[^>]*>\s*$/i, "") // <tags>
    .trim();
}

// Split one CSV row into fields. Handles quoted fields with commas inside ("Borrowing 100,000
// Arrows") and doubled quotes. Rows are already split on newlines, so a quoted field can't span
// lines - collection exports don't do that for card names.
function splitCsvRow(row: string): string[] {
  const out: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (quoted) {
      if (ch === '"' && row[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(field);
      field = "";
    } else field += ch;
  }
  out.push(field);
  return out.map((f) => f.trim());
}

// A ManaBox (or other app's) CSV export starts with a header row naming its columns. We only switch
// to CSV mode when that header has both a Name and a Quantity column, so a normal pasted list -
// even one with a comma in a card name - keeps going through the line parser.
function csvColumns(firstLine: string): { name: number; qty: number } | null {
  if (!firstLine.includes(",")) return null;
  const cols = splitCsvRow(firstLine).map((c) => c.toLowerCase());
  const name = cols.indexOf("name");
  const qty = cols.indexOf("quantity");
  return name >= 0 && qty >= 0 ? { name, qty } : null;
}

// Parse a pasted decklist/collection dump. Accepted per line (one card per line):
//   "1 Sol Ring" · "2x Sol Ring" · "Sol Ring x2" · "Sol Ring" · with trailing set/collector tags.
// Blank lines and lines starting with # or // are ignored. Duplicate names are summed.
// A CSV export (e.g. from ManaBox) with a Name and Quantity header is read by those two columns.
export function parseOwnedList(text: string): ParsedOwned {
  const rawLines = String(text ?? "").split(/\r?\n/);
  const firstLine = rawLines.find((l) => l.trim()) ?? "";
  const csv = csvColumns(firstLine.trim());
  if (csv) return parseCsvRows(rawLines, firstLine, csv);

  const summed = new Map<string, { name: string; quantity: number }>();
  const rejected: string[] = [];
  let lines = 0;

  for (const original of rawLines) {
    let line = original.trim();
    if (!line) continue;
    if (/^(#|\/\/)/.test(line)) continue; // comment
    lines++;

    let qty = 1;
    let qtyExplicit = false;
    const lead = line.match(/^(\d+)\s*[xX]?\s+(.+)$/); // "2 X", "2x X"
    if (lead) {
      qty = parseInt(lead[1], 10);
      qtyExplicit = true;
      line = lead[2].trim();
    } else {
      const trail = line.match(/^(.+?)\s*[x×]\s*(\d+)$/i); // "X x2", "X ×2"
      if (trail) {
        line = trail[1].trim();
        qty = parseInt(trail[2], 10);
        qtyExplicit = true;
      }
    }

    // An explicit quantity that's zero or out of range is a mistake: reject the line rather than
    // guessing a quantity or folding a stray number into the card name (e.g. "10000 Sol Ring").
    if (qtyExplicit && (!Number.isFinite(qty) || qty < 1 || qty > OWNED_MAX_QTY)) {
      if (rejected.length < 50) rejected.push(original.trim().slice(0, 120));
      continue;
    }

    const name = stripTail(line).replace(/\s+/g, " ").trim();
    if (!name || !/[a-z]/i.test(name) || name.length > NAME_MAX) {
      if (rejected.length < 50) rejected.push(original.trim().slice(0, 120));
      continue;
    }
    const key = cardNameKey(name);
    if (!key) {
      if (rejected.length < 50) rejected.push(original.trim().slice(0, 120));
      continue;
    }
    if (!Number.isFinite(qty) || qty < 1) qty = 1;
    qty = Math.min(OWNED_MAX_QTY, Math.max(1, Math.floor(qty)));

    const e = summed.get(key);
    if (e) e.quantity = Math.min(OWNED_MAX_QTY, e.quantity + qty);
    else summed.set(key, { name, quantity: qty });
  }

  const entries = [...summed.entries()].map(([nameKey, v]) => ({ nameKey, name: v.name, quantity: v.quantity }));
  return { entries, rejected, lines };
}

// CSV mode: read just the Name and Quantity columns from each row after the header. The same
// name, quantity and de-duplication rules as the line parser apply, and bad rows land in
// `rejected` so the page can show them.
function parseCsvRows(rawLines: string[], header: string, cols: { name: number; qty: number }): ParsedOwned {
  const summed = new Map<string, { name: string; quantity: number }>();
  const rejected: string[] = [];
  let lines = 0;
  let seenHeader = false;

  for (const original of rawLines) {
    const row = original.trim();
    if (!row) continue;
    if (!seenHeader && original === header) {
      seenHeader = true;
      continue;
    }
    lines++;
    const reject = () => {
      if (rejected.length < 50) rejected.push(row.slice(0, 120));
    };

    const fields = splitCsvRow(row);
    const rawQty = fields[cols.qty] ?? "";
    const qty = rawQty === "" ? 1 : Number(rawQty);
    if (!Number.isInteger(qty) || qty < 1 || qty > OWNED_MAX_QTY) {
      reject();
      continue;
    }

    // The Name column is already a clean card name, so no tag stripping: that could cut a real
    // name that ends in a number.
    const name = (fields[cols.name] ?? "").replace(/\s+/g, " ").trim();
    const key = name && /[a-z]/i.test(name) && name.length <= NAME_MAX ? cardNameKey(name) : "";
    if (!key) {
      reject();
      continue;
    }

    const e = summed.get(key);
    if (e) e.quantity = Math.min(OWNED_MAX_QTY, e.quantity + qty);
    else summed.set(key, { name, quantity: qty });
  }

  const entries = [...summed.entries()].map(([nameKey, v]) => ({ nameKey, name: v.name, quantity: v.quantity }));
  return { entries, rejected, lines };
}

// ---- Owned-vs-needed for a deck -------------------------------------------------------------

export interface DeckNeedCard {
  name: string;
  quantity?: number;
  category?: string;
}
export interface NeedResult {
  neededNames: number; // distinct non-basic cards the deck needs
  ownedNames: number; // distinct of those fully owned (have >= need)
  neededCopies: number;
  ownedCopies: number;
  missing: { name: string; need: number; have: number }[]; // not fully owned, A–Z
}

// Aggregate a deck's required cards by normalized name and compare against an owned map
// (nameKey -> quantity). Tokens and basic lands are excluded. Each deck is compared independently
// against the full owned inventory — nothing is "reserved" across decks.
export function computeNeeds(cards: DeckNeedCard[], owned: Map<string, number>): NeedResult {
  const need = new Map<string, { name: string; qty: number }>();
  for (const c of cards) {
    if (!c?.name) continue;
    if ((c.category ?? "") === "Tokens") continue;
    if (isBasicLandName(c.name)) continue;
    const key = cardNameKey(c.name);
    if (!key) continue;
    const q = Math.max(1, Math.floor(c.quantity ?? 1));
    const e = need.get(key);
    if (e) e.qty += q;
    else need.set(key, { name: c.name, qty: q });
  }

  let neededCopies = 0;
  let ownedCopies = 0;
  let ownedNames = 0;
  const missing: { name: string; need: number; have: number }[] = [];
  for (const [key, v] of need) {
    const have = owned.get(key) ?? 0;
    neededCopies += v.qty;
    ownedCopies += Math.min(have, v.qty);
    if (have >= v.qty) ownedNames++;
    else missing.push({ name: v.name, need: v.qty, have });
  }
  missing.sort((a, b) => a.name.localeCompare(b.name));
  return { neededNames: need.size, ownedNames, neededCopies, ownedCopies, missing };
}
