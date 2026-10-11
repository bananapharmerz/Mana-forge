// Reads a pasted decklist in the formats people copy out of other sites: Moxfield (plain text,
// MTGO and Arena exports), Archidekt, MTG Arena, MTGO, or just one card per line.
// Pure text handling, no network, so it is easy to test.

export type ListSection = "commander" | "main" | "companion" | "tail";

export interface ListLine {
  qty: number;
  name: string;
  section: ListSection;
  marked: boolean; // tagged as the commander inline (Archidekt [Commander], Moxfield *CMDR*)
}

export interface ParsedList {
  name?: string;
  lines: ListLine[];
}

export const MAX_IMPORT_CHARS = 30_000;
export const MAX_IMPORT_LINES = 400;

const SKIP_HEADERS = /^(?:\/\/\s*)?(sideboard|side board|maybeboard|maybe board|maybe|considering|tokens?|acquireboard|wishlist)$/i;
const COMMANDER_HEADER = /^(?:\/\/\s*)?(commanders?|command zone)$/i;
const COMPANION_HEADER = /^(?:\/\/\s*)?companions?$/i;
const MAIN_HEADER = /^(?:\/\/\s*)?(deck|main ?deck|mainboard|main)$/i;
// Group headings some exports put between cards ("Creatures (31)", "// Ramp").
const GROUP_HEADER =
  /^(?:\/\/\s*)?(creatures?|instants?|sorcer(?:y|ies)|artifacts?|enchantments?|lands?|planeswalkers?|battles?|spells?|other|ramp|removal|draw|card draw|board wipes?|interaction|protection|tutors?|win ?cons?|utility)\s*(?:\(\d+\))?\s*:?$/i;

function headerKind(line: string): ListSection | "skip" | "group" | null {
  const bare = line.replace(/\s*\(\d+\)\s*:?$/, "").replace(/:$/, "").trim();
  if (/\d/.test(bare.slice(0, 1))) return null; // starts with a quantity: a card
  if (SKIP_HEADERS.test(bare)) return "skip";
  if (COMMANDER_HEADER.test(bare)) return "commander";
  if (COMPANION_HEADER.test(bare)) return "companion";
  if (MAIN_HEADER.test(bare)) return "main";
  if (GROUP_HEADER.test(line)) return "group";
  if (/^\/\//.test(line)) return "group"; // any other comment line
  if (/\(\d+\)\s*$/.test(line)) return "group"; // "Anything (12)"
  return null;
}

// "1x Sol Ring (C21) 263 *F* [Ramp] ^Have^" → { qty: 1, name: "Sol Ring" }
export function cleanCardLine(raw: string): { qty: number; name: string; marked: boolean } | null {
  let line = raw.replace(/^SB:\s*/i, "").trim();
  let qty = 1;
  const m = line.match(/^(\d{1,3})\s*x?\s+(.+)$/i);
  if (m) {
    qty = Number(m[1]);
    line = m[2];
  }
  let marked = false;
  line = line
    .replace(/\s*\^[^^]*\^/g, "")
    .replace(/\s*\[([^\]]*)\]/g, (_s, tags: string) => {
      if (/commander/i.test(tags)) marked = true;
      return "";
    })
    .replace(/\s*\*([A-Z]+)\*/g, (_s, tag: string) => {
      if (tag === "CMDR") marked = true;
      return "";
    })
    .replace(/\s+#.*$/, "")
    .replace(/\s+\([A-Za-z0-9]{2,6}\)(?:\s+[\w★†-]+)?\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!line || line.length > 150 || qty < 1) return null;
  return { qty: Math.min(qty, 99), name: line, marked };
}

export function parseDecklist(text: string): ParsedList {
  const rows = text.slice(0, MAX_IMPORT_CHARS).split(/\r?\n/).slice(0, MAX_IMPORT_LINES);
  let name: string | undefined;
  let section: ListSection | "skip" = "main";
  let explicit = false; // the list said which part is which
  const blocks: ListLine[][] = [[]];
  for (const raw of rows) {
    const line = raw.trim();
    if (!line) {
      if (blocks[blocks.length - 1].length) blocks.push([]);
      continue;
    }
    const nameLine = line.match(/^(?:name|deck name)\s*[:\s]\s*(.+)$/i);
    if (nameLine && !/^\d/.test(line)) {
      name = nameLine[1].trim().slice(0, 80);
      continue;
    }
    if (/^about$/i.test(line)) continue;
    const kind = headerKind(line);
    if (kind === "group") continue;
    if (kind) {
      section = kind;
      explicit = true;
      if (blocks[blocks.length - 1].length) blocks.push([]);
      continue;
    }
    if (section === "skip") continue;
    const card = cleanCardLine(line);
    // MTGO's "SB:" lines are its sideboard, which is where a Commander export puts the commander.
    if (card) blocks[blocks.length - 1].push({ ...card, section: /^SB:/i.test(line) ? "tail" : section });
  }
  const filled = blocks.filter((b) => b.length);
  // MTGO-style exports put the commander(s) in a short last block after a blank line.
  if (!explicit && filled.length > 1) {
    const last = filled[filled.length - 1];
    if (last.length <= 2) for (const l of last) l.section = "tail";
  }
  return { name, lines: filled.flat() };
}
