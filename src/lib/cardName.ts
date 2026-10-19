// One normalization function for card-name matching, shared by owned-list import, manual edits
// and deck owned-vs-needed comparison. Using a single function everywhere is what keeps those
// three paths agreeing on what counts as "the same card".
//
// Rules: NFC normalize, collapse internal whitespace, trim, lowercase. Meaningful punctuation
// (apostrophes, commas, hyphens) is PRESERVED so distinct cards stay distinct. For a double-faced
// "Front // Back" name the key is the FRONT face only, so a paper/collection-app list that writes
// just the front face still matches a deck card stored under its full "Front // Back" name.
export function cardNameKey(raw: string): string {
  const s = String(raw ?? "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();
  const front = s.includes("//") ? s.split("//")[0].trim() : s;
  return front.toLowerCase();
}

// Basic lands (and their snow-covered printings) are freely available, so owned-vs-needed treats
// them as always-owned rather than listing them as "missing".
const BASIC_LAND = /^(snow-covered\s+)?(plains|island|swamp|mountain|forest|wastes)$/i;
export function isBasicLandName(name: string): boolean {
  return BASIC_LAND.test(String(name ?? "").trim());
}
