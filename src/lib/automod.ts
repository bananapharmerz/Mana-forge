// Lightweight automatic moderation for the community feed. It's the first line of defence, not
// the only one: the real safety net is the report button + the admin review in Nexus. This just
// catches the obvious stuff before it's ever posted — severe slurs, link spam and shouting.
//
// The hard-block word list is intentionally small and is extended by the site owner through the
// COMMUNITY_BLOCKLIST env var (comma-separated), so it can be tuned without a code change. The
// seed below covers the worst slurs so the feed is safe from the first minute.

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

// Seed of hard-blocked slurs (normalized). Kept minimal; the owner extends it via the env var.
const SEED = ["nigger", "nigga", "faggot", "retard", "chink", "spic", "kike", "tranny", "coon"];

const BLOCK: string[] = [
  ...SEED,
  ...((process.env.COMMUNITY_BLOCKLIST ?? "")
    .split(",")
    .map((w) => normalize(w))
    .filter(Boolean)),
];

// Each term becomes a word-boundary-ish regex that tolerates spaces/repeats inserted to dodge it.
const BLOCK_RES = BLOCK.map((t) => new RegExp(`(^| )${t.split("").join("+\\s*")}+`, "i"));

export type ModVerdict = { ok: true } | { ok: false; reason: string };

const FRIENDLY = "Let's keep it friendly — that wording isn't allowed in the community.";

// Screen a post/comment body. Returns ok, or a reason the author sees.
export function screen(raw: string): ModVerdict {
  const body = String(raw ?? "");
  const norm = normalize(body);

  for (const re of BLOCK_RES) {
    if (re.test(norm)) return { ok: false, reason: FRIENDLY };
  }

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
