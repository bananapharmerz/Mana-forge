// Lightweight automatic moderation for the community feed. It's the first line of defence, not
// the only one: the real safety net is the report button + the admin review in Nexus. This catches
// the obvious stuff before it's ever posted — severe slurs, sexual/NSFW content, link spam and
// shouting — so the feed stays safe for a 16+ audience from the first minute.
//
// Two word lists feed the matcher:
//  - PREFIX terms match the word and its inflections (fuck → fucking, fucked) as long as the word
//    starts at a boundary. Safe when the term isn't the start of an ordinary word.
//  - EXACT terms additionally require a boundary (or a plain inflection) at the END, so they don't
//    swallow innocent words that merely start with them — "cock" must not block "Cockatrice",
//    "anal" must not block "analysis", "spic" must not block "spicy", "paki" not "Pakistan".
// The owner can extend the PREFIX list at runtime via COMMUNITY_BLOCKLIST (comma-separated), so it
// can be tuned without a code change.

// Normalize text for matching: lowercase, strip accents, fold common leetspeak, drop anything
// that isn't a letter or space, and cap runs of a repeated character (so "nooo" ~ "noo").
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[@4]/g, "a")
    .replace(/3/g, "e")
    .replace(/[1!|]/g, "i")
    .replace(/0/g, "o")
    .replace(/[$5]/g, "s")
    .replace(/7/g, "t")
    .replace(/[^a-z ]+/g, " ")
    .replace(/(.)\1{2,}/g, "$1$1")
    .replace(/\s+/g, " ")
    .trim();
}

// Hard-blocked slurs and sexual/NSFW terms that are safe to match as a prefix (their inflections
// should be caught, and no ordinary word begins with them at a word boundary).
const PREFIX_SEED = [
  // slurs
  "nigger", "nigga", "faggot", "retard", "chink", "kike", "tranny", "coon", "dyke",
  "wetback", "beaner", "gook",
  // sexual / NSFW
  "porn", "cumshot", "cumming", "blowjob", "handjob", "rimjob", "creampie", "deepthroat",
  "gangbang", "bukkake", "hentai", "dildo", "buttplug", "dickhead", "jerkoff", "jackoff",
  "masturbat", "ejaculat", "orgasm", "jizz", "whore", "slut", "skank", "bitch", "boob",
  "tits", "titties", "pussy", "cunt", "rape", "molest", "incest", "bestialit", "pedo",
  "pedophile", "paedophile", "zoophil", "dick", "fuck", "motherfuck", "fuk", "shit",
  "bullshit", "asshole", "horny", "wank", "nympho", "clit", "fisting",
];

// Terms that need a trailing boundary too, so they don't block innocent words that start with them.
const EXACT_SEED = ["spic", "paki", "fag", "homo", "cock", "anal", "cum"];

const envExtra = (process.env.COMMUNITY_BLOCKLIST ?? "")
  .split(",")
  .map((w) => normalize(w))
  .filter(Boolean);

// Anti-evasion: each character may be repeated or separated by spaces ("f u c k", "fuuuck").
const spaced = (t: string) => t.split("").join("+\\s*") + "+";

const PREFIX_RES = [...PREFIX_SEED, ...envExtra].map((t) => new RegExp(`(^| )${spaced(t)}`, "i"));
// Allow plain inflections at the end (fags, spics) but not the -y/-e that would catch spicy/spice.
const EXACT_RES = EXACT_SEED.map((t) => new RegExp(`(^| )${spaced(t)}(s|es|ed|ing|er|ers|in)?( |$)`, "i"));

export type ModVerdict = { ok: true } | { ok: false; reason: string };

const FRIENDLY = "Let's keep it friendly — that wording isn't allowed in the community.";

// Screen a post/comment body. Returns ok, or a reason the author sees.
export function screen(raw: string): ModVerdict {
  const body = String(raw ?? "");
  const norm = normalize(body);

  for (const re of PREFIX_RES) if (re.test(norm)) return { ok: false, reason: FRIENDLY };
  for (const re of EXACT_RES) if (re.test(norm)) return { ok: false, reason: FRIENDLY };

  // Link spam: a deck-share post links its own deck; nobody needs to paste three links.
  const links = (body.match(/https?:\/\//gi) ?? []).length;
  if (links > 2) return { ok: false, reason: "That's a lot of links — keep it to one or two." };

  // Shouting: mostly-caps once the text is long enough to tell.
  const letters = body.replace(/[^a-zA-Z]/g, "");
  if (letters.length >= 25) {
    const caps = letters.replace(/[^A-Z]/g, "").length / letters.length;
    if (caps > 0.7) return { ok: false, reason: "Please don't post in all caps." };
  }

  return { ok: true };
}
