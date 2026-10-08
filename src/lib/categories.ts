import { searchCards } from "./scryfall";
import { db } from "./db";

export interface CommanderCategory {
  slug: string;
  label: string;
  query: string;
  colors?: string[];
}

export const colorIdentityCategories: CommanderCategory[] = [
  { slug: "mono-w", label: "Mono White", query: "is:commander identity=w", colors: ["W"] },
  { slug: "mono-u", label: "Mono Blue", query: "is:commander identity=u", colors: ["U"] },
  { slug: "mono-b", label: "Mono Black", query: "is:commander identity=b", colors: ["B"] },
  { slug: "mono-r", label: "Mono Red", query: "is:commander identity=r", colors: ["R"] },
  { slug: "mono-g", label: "Mono Green", query: "is:commander identity=g", colors: ["G"] },
  { slug: "colorless", label: "Colorless", query: "is:commander identity=c", colors: [] },
  { slug: "azorius", label: "Azorius (WU)", query: "is:commander identity=wu", colors: ["W", "U"] },
  { slug: "dimir", label: "Dimir (UB)", query: "is:commander identity=ub", colors: ["U", "B"] },
  { slug: "rakdos", label: "Rakdos (BR)", query: "is:commander identity=br", colors: ["B", "R"] },
  { slug: "gruul", label: "Gruul (RG)", query: "is:commander identity=rg", colors: ["R", "G"] },
  { slug: "selesnya", label: "Selesnya (GW)", query: "is:commander identity=gw", colors: ["G", "W"] },
  { slug: "orzhov", label: "Orzhov (WB)", query: "is:commander identity=wb", colors: ["W", "B"] },
  { slug: "izzet", label: "Izzet (UR)", query: "is:commander identity=ur", colors: ["U", "R"] },
  { slug: "golgari", label: "Golgari (BG)", query: "is:commander identity=bg", colors: ["B", "G"] },
  { slug: "boros", label: "Boros (RW)", query: "is:commander identity=rw", colors: ["R", "W"] },
  { slug: "simic", label: "Simic (GU)", query: "is:commander identity=gu", colors: ["G", "U"] },
  { slug: "jeskai", label: "Jeskai (WUR)", query: "is:commander identity=wur", colors: ["W", "U", "R"] },
  { slug: "sultai", label: "Sultai (BGU)", query: "is:commander identity=bgu", colors: ["B", "G", "U"] },
  { slug: "mardu", label: "Mardu (RWB)", query: "is:commander identity=rwb", colors: ["R", "W", "B"] },
  { slug: "temur", label: "Temur (GUR)", query: "is:commander identity=gur", colors: ["G", "U", "R"] },
  { slug: "abzan", label: "Abzan (WBG)", query: "is:commander identity=wbg", colors: ["W", "B", "G"] },
  { slug: "four-plus", label: "Four & Five Color", query: "is:commander identity>=4", colors: ["W", "U", "B", "R", "G"] },
];

// Mirrors EDHREC's "Typal" tab, ordered by their real all-time deck-count popularity.
export const typalCategories: CommanderCategory[] = [
  { slug: "dragons", label: "Dragons", query: "is:commander t:dragon" },
  { slug: "elves", label: "Elves", query: "is:commander t:elf" },
  { slug: "zombies", label: "Zombies", query: "is:commander t:zombie" },
  { slug: "vampires", label: "Vampires", query: "is:commander t:vampire" },
  { slug: "humans", label: "Humans", query: "is:commander t:human" },
  { slug: "eldrazi", label: "Eldrazi", query: "is:commander t:eldrazi" },
  { slug: "angels", label: "Angels", query: "is:commander t:angel" },
  { slug: "goblins", label: "Goblins", query: "is:commander t:goblin" },
  { slug: "dinosaurs", label: "Dinosaurs", query: "is:commander t:dinosaur" },
  { slug: "wizards", label: "Wizards", query: "is:commander t:wizard" },
  { slug: "pirates", label: "Pirates", query: "is:commander t:pirate" },
  { slug: "demons", label: "Demons", query: "is:commander t:demon" },
  { slug: "cats", label: "Cats", query: "is:commander t:cat" },
  { slug: "merfolk", label: "Merfolk", query: "is:commander t:merfolk" },
  { slug: "faeries", label: "Faeries", query: "is:commander t:faerie" },
  { slug: "assassins", label: "Assassins", query: "is:commander t:assassin" },
  { slug: "slivers", label: "Slivers", query: "is:commander t:sliver" },
  { slug: "knights", label: "Knights", query: "is:commander t:knight" },
  { slug: "rats", label: "Rats", query: "is:commander t:rat" },
  { slug: "phyrexians", label: "Phyrexians", query: "is:commander t:phyrexian" },
  { slug: "birds", label: "Birds", query: "is:commander t:bird" },
  { slug: "spirits", label: "Spirits", query: "is:commander t:spirit" },
  { slug: "hydras", label: "Hydras", query: "is:commander t:hydra" },
  { slug: "soldiers", label: "Soldiers", query: "is:commander t:soldier" },
  { slug: "ninjas", label: "Ninjas", query: "is:commander t:ninja" },
  { slug: "elementals", label: "Elementals", query: "is:commander t:elemental" },
  { slug: "horrors", label: "Horrors", query: "is:commander t:horror" },
  { slug: "saprolings", label: "Saprolings", query: "is:commander t:saproling" },
  { slug: "shapeshifters", label: "Shapeshifters", query: "is:commander t:shapeshifter" },
  { slug: "warriors", label: "Warriors", query: "is:commander t:warrior" },
  { slug: "frogs", label: "Frogs", query: "is:commander t:frog" },
  { slug: "insects", label: "Insects", query: "is:commander t:insect" },
  { slug: "spiders", label: "Spiders", query: "is:commander t:spider" },
  { slug: "squirrels", label: "Squirrels", query: "is:commander t:squirrel" },
  { slug: "rogues", label: "Rogues", query: "is:commander t:rogue" },
  { slug: "myr", label: "Myr", query: "is:commander t:myr" },
  { slug: "allies", label: "Allies", query: "is:commander t:ally" },
  { slug: "werewolves", label: "Werewolves", query: "is:commander t:werewolf" },
  { slug: "mutants", label: "Mutants", query: "is:commander t:mutant" },
  { slug: "clerics", label: "Clerics", query: "is:commander t:cleric" },
  { slug: "rabbits", label: "Rabbits", query: "is:commander t:rabbit" },
  { slug: "dwarves", label: "Dwarves", query: "is:commander t:dwarf" },
  { slug: "dogs", label: "Dogs", query: "is:commander t:dog" },
  { slug: "snakes", label: "Snakes", query: "is:commander t:snake" },
  { slug: "bears", label: "Bears", query: "is:commander t:bear" },
  { slug: "gods", label: "Gods", query: "is:commander t:god" },
  { slug: "beasts", label: "Beasts", query: "is:commander t:beast" },
  { slug: "otters", label: "Otters", query: "is:commander t:otter" },
  { slug: "wolves", label: "Wolves", query: "is:commander t:wolf" },
  { slug: "treefolk", label: "Treefolk", query: "is:commander t:treefolk" },
  { slug: "lizards", label: "Lizards", query: "is:commander t:lizard" },
  { slug: "wraiths", label: "Wraiths", query: "is:commander t:wraith" },
  { slug: "artificers", label: "Artificers", query: "is:commander t:artificer" },
  { slug: "bats", label: "Bats", query: "is:commander t:bat" },
  { slug: "mice", label: "Mice", query: "is:commander t:mouse" },
  { slug: "fungi", label: "Fungi", query: "is:commander t:fungus" },
  { slug: "tyranids", label: "Tyranids", query: "is:commander t:tyranid" },
  { slug: "oozes", label: "Oozes", query: "is:commander t:ooze" },
  { slug: "samurai", label: "Samurai", query: "is:commander t:samurai" },
  { slug: "giants", label: "Giants", query: "is:commander t:giant" },
  { slug: "heroes", label: "Heroes", query: "is:commander t:hero" },
  { slug: "thopters", label: "Thopters", query: "is:commander t:thopter" },
  { slug: "halflings", label: "Halflings", query: "is:commander t:halfling" },
  { slug: "wurms", label: "Wurms", query: "is:commander t:wurm" },
  { slug: "apes", label: "Apes", query: "is:commander t:ape" },
  { slug: "orcs", label: "Orcs", query: "is:commander t:orc" },
  { slug: "villains", label: "Villains", query: "is:commander t:villain" },
  { slug: "constructs", label: "Constructs", query: "is:commander t:construct" },
  { slug: "scarecrows", label: "Scarecrows", query: "is:commander t:scarecrow" },
  { slug: "golems", label: "Golems", query: "is:commander t:golem" },
  { slug: "raccoons", label: "Raccoons", query: "is:commander t:raccoon" },
  { slug: "sphinxes", label: "Sphinxes", query: "is:commander t:sphinx" },
];

// Mirrors EDHREC's "Themes" tab, ordered by their real all-time deck-count popularity,
// approximated with Scryfall oracle-text/keyword search since Scryfall has no native theme tags.
// Purely strategic labels EDHREC has (Combo, Aggro, Control, Midrange, cEDH, Good Stuff, Tempo,
// Chaos, Historic, Toolbox, Hatebears, Topdeck, Stompy, Pillow Fort, Big Mana, Cantrips) are
// left out because they have no reliable textual signal to search on.
export const themeCategories: CommanderCategory[] = [
  { slug: "tokens", label: "Tokens", query: "is:commander o:create o:token" },
  { slug: "counters", label: "+1/+1 Counters", query: 'is:commander o:"+1/+1 counter"' },
  { slug: "artifacts", label: "Artifacts", query: "is:commander (t:artifact or o:artifact)" },
  { slug: "lifegain", label: "Lifegain", query: 'is:commander o:"gain life"' },
  {
    slug: "spellslinger",
    label: "Spellslinger",
    query:
      'is:commander (keyword:magecraft or o:"cast an instant or sorcery spell" or o:"cast your first instant or sorcery" or o:"cast an instant or sorcery")',
  },
  { slug: "reanimator", label: "Reanimator", query: "is:commander (o:graveyard o:battlefield)" },
  { slug: "aristocrats", label: "Aristocrats", query: "is:commander (o:sacrifice o:dies)" },
  { slug: "lands-matter", label: "Lands Matter", query: 'is:commander (o:landfall or o:"additional land")' },
  { slug: "burn", label: "Burn", query: 'is:commander o:damage o:"any target"' },
  { slug: "ramp", label: "Ramp", query: 'is:commander (o:"search your library for a land" or o:"additional land")' },
  { slug: "equipment", label: "Equipment", query: "is:commander (o:equip or t:equipment)" },
  { slug: "enchantress", label: "Enchantress", query: "is:commander (o:enchantment o:draw)" },
  { slug: "voltron", label: "Voltron", query: 'is:commander (o:equip or o:"aura you control")' },
  { slug: "mill", label: "Mill", query: "is:commander o:mill" },
  { slug: "treasure", label: "Treasure", query: "is:commander o:treasure" },
  { slug: "sacrifice", label: "Sacrifice", query: "is:commander o:sacrifice" },
  { slug: "blink", label: "Blink", query: 'is:commander o:exile o:"return"' },
  { slug: "auras", label: "Auras", query: "is:commander (t:aura or o:aura)" },
  { slug: "wheels", label: "Wheels", query: 'is:commander (o:"draw seven" or o:"discards their hand and draws")' },
  { slug: "legends", label: "Legends", query: "is:commander o:legendary" },
  { slug: "discard", label: "Discard", query: "is:commander o:discard" },
  { slug: "graveyard", label: "Graveyard", query: "is:commander o:graveyard" },
  { slug: "clones", label: "Clones", query: 'is:commander o:"copy of"' },
  { slug: "flying", label: "Flying", query: "is:commander keyword:flying" },
  { slug: "card-draw", label: "Card Draw", query: 'is:commander o:"draw a card"' },
  { slug: "landfall", label: "Landfall", query: "is:commander o:landfall" },
  { slug: "stax", label: "Stax", query: 'is:commander (o:"can\'t" o:opponent)' },
  { slug: "storm", label: "Storm", query: "is:commander o:storm" },
  { slug: "infect", label: "Infect", query: "is:commander keyword:infect" },
  { slug: "extra-combats", label: "Extra Combats", query: 'is:commander o:"additional combat phase"' },
  { slug: "theft", label: "Theft", query: 'is:commander o:"gain control"' },
  { slug: "group-hug", label: "Group Hug", query: 'is:commander (o:"each player" o:draw)' },
  { slug: "planeswalkers", label: "Planeswalkers", query: "is:commander (t:planeswalker or o:planeswalker)" },
  { slug: "vehicles", label: "Vehicles", query: "is:commander (t:vehicle or o:vehicle)" },
  { slug: "commander-matters", label: "Commander Matters", query: 'is:commander o:"your commander"' },
  { slug: "exile", label: "Exile", query: "is:commander o:exile" },
  { slug: "counters-minus", label: "-1/-1 Counters", query: 'is:commander o:"-1/-1 counter"' },
  { slug: "toughness-matters", label: "Toughness Matters", query: "is:commander o:toughness" },
  { slug: "extra-turns", label: "Extra Turns", query: 'is:commander o:"extra turn"' },
  { slug: "spell-copy", label: "Spell Copy", query: "is:commander o:copy o:instant" },
  { slug: "dredge", label: "Dredge", query: "is:commander keyword:dredge" },
  { slug: "etb", label: "ETB", query: 'is:commander o:"enters the battlefield"' },
  { slug: "energy", label: "Energy", query: 'is:commander o:"energy counter"' },
  { slug: "ninjutsu", label: "Ninjutsu", query: "is:commander keyword:ninjutsu" },
  { slug: "proliferate", label: "Proliferate", query: "is:commander o:proliferate" },
  { slug: "populate", label: "Populate", query: "is:commander o:populate" },
  { slug: "sagas", label: "Sagas", query: "is:commander (t:saga or o:saga)" },
  { slug: "land-destruction", label: "Land Destruction", query: 'is:commander o:"destroy target land"' },
  { slug: "affinity", label: "Affinity", query: "is:commander keyword:affinity" },
  { slug: "food", label: "Food", query: "is:commander o:food" },
  { slug: "monarch", label: "Monarch", query: "is:commander o:monarch" },
  { slug: "clues", label: "Clues", query: "is:commander o:clue" },
  { slug: "morph", label: "Morph", query: "is:commander keyword:morph" },
  { slug: "cycling", label: "Cycling", query: "is:commander keyword:cycling" },
  { slug: "counterspells", label: "Counterspells", query: 'is:commander o:"counter target spell"' },
];

// Every mechanic that lets a commander share the command zone with a second commander. "Partner"
// is the broad bucket — it covers plain Partner, Partner with X, and Friends forever all at once,
// since Scryfall tags all three with the plain "Partner" keyword, so those two don't need to be
// split into separate chips. Choose a Background and Doctor's companion each also pull in the
// *other half* of their pairing (Background enchantments; the Doctor incarnation cards) so both
// sides of the pairing are browsable from the one chip.
export const multiCommanderCategories: CommanderCategory[] = [
  { slug: "partner", label: "Partner", query: "is:commander keyword:partner" },
  { slug: "friends-forever", label: "Friends Forever", query: 'is:commander o:"friends forever"' },
  {
    slug: "choose-a-background",
    label: "Choose a Background",
    query: 'is:commander (keyword:"choose a background" or t:background)',
  },
  {
    slug: "doctors-companion",
    label: "Doctor's Companion",
    query: 'is:commander (keyword:"doctor\'s companion" or t:"time lord doctor")',
  },
];

// The ten Ikoria companions. Browsable alongside the multi-commander mechanics on the Commanders
// page, but kept out of the shared list: filtering *decks* by it would never match (a deck's
// commander isn't its companion), so the Public Decks page doesn't offer it.
export const companionCategories: CommanderCategory[] = [
  { slug: "companion", label: "Companion", query: "is:companion" },
];

// Secret Lair Drop and its spin-off sub-series (Countdown, Ultimate Edition, Promo, Showcase
// Planes) — a product line rather than a mechanic, kept as its own small group.
export const productCategories: CommanderCategory[] = [
  {
    slug: "secret-lair",
    label: "Secret Lair",
    query: "is:commander (e:sld or e:slc or e:slu or e:slp or e:pssc)",
  },
];

export const allCategories = [
  ...colorIdentityCategories,
  ...typalCategories,
  ...themeCategories,
  ...multiCommanderCategories,
  ...companionCategories,
  ...productCategories,
];

export function findCategory(slug: string): CommanderCategory | undefined {
  return allCategories.find((c) => c.slug === slug);
}

// Short-lived per-process cache so a burst of requests on the same server instance doesn't each
// pay a database round trip. The real durable cache is the CategoryMatch table below.
const hotCache = new Map<string, { names: Set<string>; expires: number }>();
const HOT_CACHE_TTL_MS = 5 * 60 * 1000;
const DB_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CATEGORY_MATCH_PAGE_CAP = 10;

async function refreshCategoryMatchesFromScryfall(category: CommanderCategory): Promise<Set<string>> {
  const matched = new Set<string>();
  let page = 1;
  let hasMore = true;
  try {
    while (hasMore && page <= CATEGORY_MATCH_PAGE_CAP) {
      const result = await searchCards(category.query, { unique: "cards", page });
      for (const c of result.data ?? []) matched.add(c.name);
      hasMore = result.has_more ?? false;
      page += 1;
    }
  } catch {
    // Handled by the caller: an empty set here means "fall back to whatever's in the DB."
  }
  return matched;
}

// Runs a category's own Scryfall query in isolation (paginated, no name list attached) and
// persists the full, authoritative set of matching commander names to the CategoryMatch table.
// Earlier this attached every candidate name directly onto the query (`category.query AND
// (name1 OR name2 OR ...)`), which silently broke once the site had enough distinct commanders
// (~200) to push the query past Scryfall's length limit — it started 400ing, and the failure was
// swallowed, so every category filter quietly excluded all real site decks. Running the plain
// category query instead scales independently of how many commanders the site has, and storing
// the result in the DB (rather than only an in-process Map) means it survives restarts, is
// shared across server instances, and a spike of concurrent requests for the same category never
// has to wait on a live Scryfall round trip beyond the first one.
async function allCommandersMatchingCategory(category: CommanderCategory): Promise<Set<string>> {
  const hot = hotCache.get(category.slug);
  if (hot && hot.expires > Date.now()) return hot.names;

  const rows = await db.categoryMatch.findMany({ where: { categorySlug: category.slug } });
  const freshEnough =
    rows.length > 0 && Date.now() - rows[0].updatedAt.getTime() < DB_CACHE_TTL_MS;

  if (freshEnough) {
    const names = new Set(rows.map((r) => r.commanderName));
    hotCache.set(category.slug, { names, expires: Date.now() + HOT_CACHE_TTL_MS });
    return names;
  }

  const fresh = await refreshCategoryMatchesFromScryfall(category);

  if (fresh.size > 0) {
    await db.$transaction([
      db.categoryMatch.deleteMany({ where: { categorySlug: category.slug } }),
      db.categoryMatch.createMany({
        data: Array.from(fresh).map((commanderName) => ({ categorySlug: category.slug, commanderName })),
      }),
    ]);
    hotCache.set(category.slug, { names: fresh, expires: Date.now() + HOT_CACHE_TTL_MS });
    return fresh;
  }

  // Scryfall failed or returned nothing this time — prefer stale DB data over showing zero
  // results, if we have any.
  const fallback = new Set(rows.map((r) => r.commanderName));
  hotCache.set(category.slug, { names: fallback, expires: Date.now() + HOT_CACHE_TTL_MS });
  return fallback;
}

// Checks a list of commander names against a category's Scryfall query, so deck-feed filtering
// can reuse the exact same category definitions as the commanders page without re-fetching
// every commander that has ever been printed.
export async function commandersMatchingCategory(
  names: string[],
  category: CommanderCategory
): Promise<Set<string>> {
  if (names.length === 0) return new Set();
  const allMatches = await allCommandersMatchingCategory(category);
  return new Set(names.filter((n) => allMatches.has(n)));
}
