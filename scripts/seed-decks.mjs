// One-time seed script: populates the site with a large number of real, full public decklists
// so /decks and each commander page look active from day one instead of empty.
//
// For each commander in POPULAR_COMMANDERS, this pulls EDHREC's real per-card play-rate lists
// (creatures/instants/sorceries/artifacts/enchantments/planeswalkers/lands), resolves every
// candidate card through Scryfall once, then samples many distinct 99-card variants from that
// pool so each deck is a plausible, real decklist rather than placeholder data.
//
// Run with: node scripts/seed-decks.mjs

import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const DB_PATH = new URL("../dev.db", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SCRYFALL_API = "https://api.scryfall.com";
const DECKS_PER_COMMANDER = 4;
const TARGET_COMMANDER_COUNT = 200;

// Pulls real, legal commanders straight from Scryfall ordered by EDHREC popularity (excluding
// Un-set jokes), rather than a small hand-curated list — this naturally spans every color
// identity, tribe, and theme so the category filter tabs all have real results behind them.
async function getTopCommanderNames(targetCount) {
  const names = [];
  let page = 1;
  let hasMore = true;
  while (hasMore && names.length < targetCount + 40) {
    const params = new URLSearchParams({
      q: "is:commander -is:funny",
      order: "edhrec",
      dir: "asc",
      unique: "cards",
      page: String(page),
    });
    const json = await fetchJson(`${SCRYFALL_API}/cards/search?${params}`);
    if (!json || !json.data) break;
    for (const c of json.data) names.push(c.name);
    hasMore = json.has_more ?? false;
    page += 1;
    await sleep(120);
  }
  return Array.from(new Set(names)).slice(0, targetCount + 40);
}

const NAME_TEMPLATES = [
  (c) => `${c} Commander Deck`,
  (c) => `${c} Value Engine`,
  (c) => `${c} Aristocrats`,
  (c) => `${c} Voltron`,
  (c) => `${c} Stax Build`,
  (c) => `${c} Budget Brew`,
  (c) => `${c} Competitive List`,
  (c) => `${c} Casual Pile`,
  (c) => `${c} Midrange Goodstuff`,
  (c) => `${c} Combo Lines`,
  (c) => `${c} Control Shell`,
  (c) => `${c} Tempo Build`,
  (c) => `${c} Ramp Package`,
  (c) => `${c} Tokens Swarm`,
  (c) => `${c} Reanimator`,
];

const SEED_USERNAMES = [
  "GoblinKing77", "GraveyardGoblin", "GruulStomper", "GoodStuffGary", "ManaDorkMike",
  "SpikeySpellslinger", "CascadeChris", "TokenTina", "VoltronVince", "ControlCarl",
  "AristocratAmy", "StaxStacy", "RampRandy", "ComboKyle", "MidrangeMax",
  "BudgetBrewer", "CompetitiveCory", "CasualCaleb", "TempoTaylor", "ReanimatorRae",
  "SultaiSamantha", "BorosBrandon", "JundJesse", "AzoriusAlex", "SimicSasha",
  "GruulGrace", "OrzhovOwen", "IzzetIvy", "GolgariGreg", "SelesnyaSean",
  "MonoRedMorgan", "MonoBlackBella", "FiveColorFinn", "PillowFortPia", "GroupHugGwen",
  "SpellslingerSage", "EquipmentEli", "GraveyardGabe", "CounterspellCory", "ArtifactAsher",
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function edhrecSlug(name) {
  return name
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function defaultCategory(typeLine) {
  const rules = [
    ["Creatures", /creature/i],
    ["Planeswalkers", /planeswalker/i],
    ["Battles", /battle/i],
    ["Instants", /instant/i],
    ["Sorceries", /sorcery/i],
    ["Artifacts", /artifact/i],
    ["Enchantments", /enchantment/i],
    ["Lands", /land/i],
  ];
  for (const [label, re] of rules) if (re.test(typeLine)) return label;
  return "Other";
}

function cardImage(card) {
  return card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal;
}

function cardPriceUsd(card) {
  const raw = card.prices?.usd ?? card.prices?.usd_foil;
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, {
    headers: { "User-Agent": "mtg-hub/1.0", Accept: "application/json", ...(opts.headers ?? {}) },
    ...opts,
  });
  if (!res.ok) return null;
  return res.json();
}

async function getEdhrecCommanderData(name) {
  const slug = edhrecSlug(name);
  const data = await fetchJson(`https://json.edhrec.com/pages/commanders/${slug}.json`);
  if (!data) return null;
  const cardlists = data?.container?.json_dict?.cardlists ?? [];
  return {
    typeCounts: {
      creature: data.creature ?? 0,
      instant: data.instant ?? 0,
      sorcery: data.sorcery ?? 0,
      artifact: data.artifact ?? 0,
      enchantment: data.enchantment ?? 0,
      planeswalker: data.planeswalker ?? 0,
      land: data.land ?? 0,
    },
    cardlists,
  };
}

const SECTION_TAGS = {
  creature: ["creatures"],
  instant: ["instants"],
  sorcery: ["sorceries"],
  artifact: ["manaartifacts", "utilityartifacts"],
  enchantment: ["enchantments"],
  planeswalker: ["planeswalkers"],
  land: ["lands", "utilitylands"],
};

function namesFromTags(cardlists, tags) {
  const seen = new Map();
  for (const tag of tags) {
    const list = cardlists.find((l) => l.tag === tag);
    if (!list) continue;
    for (const cv of list.cardviews) {
      if (!seen.has(cv.name)) seen.set(cv.name, cv);
    }
  }
  return Array.from(seen.values());
}

async function getCardsByNames(names) {
  const results = new Map();
  const unique = Array.from(new Set(names));
  for (let i = 0; i < unique.length; i += 75) {
    const batch = unique.slice(i, i + 75);
    const res = await fetch(`${SCRYFALL_API}/cards/collection`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "mtg-hub/1.0",
      },
      body: JSON.stringify({ identifiers: batch.map((name) => ({ name })) }),
    });
    if (res.ok) {
      const json = await res.json();
      for (const card of json.data ?? []) results.set(card.name, card);
    }
    await sleep(120);
  }
  return results;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function pickRandom(pool, count, rng) {
  const windowSize = Math.max(count * 3, 20);
  const window = pool.slice(0, Math.min(pool.length, windowSize));
  const shuffled = window.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function toDeckCard(card, quantity) {
  return {
    name: card.name,
    scryfallId: card.id,
    imageUrl: cardImage(card),
    typeLine: card.type_line,
    manaCost: card.mana_cost,
    cmc: card.cmc,
    colorIdentity: card.color_identity ?? [],
    quantity,
    category: defaultCategory(card.type_line),
    priceUsd: cardPriceUsd(card),
  };
}

const BASIC_BY_COLOR = { W: "Plains", U: "Island", B: "Swamp", R: "Mountain", G: "Forest" };

function buildDeckCards(commanderCard, typeCounts, pools, cardMap, rng) {
  const nonlandCategories = ["creature", "instant", "sorcery", "artifact", "enchantment", "planeswalker"];
  const rawTargets = {};
  for (const cat of nonlandCategories) rawTargets[cat] = Math.max(0, typeCounts[cat] ?? 0);
  const rawNonlandTotal = Object.values(rawTargets).reduce((a, b) => a + b, 0) || 60;

  const landTarget = clamp(typeCounts.land || 37, 33, 40);
  const nonlandBudget = 99 - landTarget;

  const targets = {};
  let assigned = 0;
  for (const cat of nonlandCategories) {
    const t = Math.round((rawTargets[cat] / rawNonlandTotal) * nonlandBudget);
    targets[cat] = t;
    assigned += t;
  }
  targets.creature += nonlandBudget - assigned; // fix rounding drift on the most flexible bucket
  if (targets.creature < 0) targets.creature = 0;

  const chosen = [];
  const usedNames = new Set([commanderCard.name]);

  for (const cat of nonlandCategories) {
    const pool = (pools[cat] ?? []).filter((n) => cardMap.has(n) && !usedNames.has(n));
    const picks = pickRandom(pool, targets[cat], rng);
    for (const name of picks) {
      usedNames.add(name);
      chosen.push(toDeckCard(cardMap.get(name), 1));
    }
  }

  const landPool = (pools.land ?? []).filter((n) => cardMap.has(n) && !usedNames.has(n));
  const landPicks = pickRandom(landPool, landTarget, rng);
  let landCount = 0;
  for (const name of landPicks) {
    usedNames.add(name);
    chosen.push(toDeckCard(cardMap.get(name), 1));
    landCount += 1;
  }

  // Pad any shortfall (or category rounding slack) with basics matching the commander's colors.
  let shortfall = 99 - chosen.reduce((s, c) => s + c.quantity, 0);
  if (shortfall > 0) {
    const colors = commanderCard.color_identity?.length ? commanderCard.color_identity : ["W"];
    let idx = 0;
    while (shortfall > 0) {
      const color = colors[idx % colors.length];
      const basicName = BASIC_BY_COLOR[color] ?? "Wastes";
      const basicCard = cardMap.get(basicName);
      if (basicCard) {
        const existing = chosen.find((c) => c.name === basicName);
        if (existing) existing.quantity += 1;
        else chosen.push(toDeckCard(basicCard, 1));
      }
      shortfall -= 1;
      idx += 1;
    }
  }

  return chosen;
}

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomRecentTimestamp() {
  const offsetDays = Math.pow(Math.random(), 2) * 45;
  const ms = Date.now() - offsetDays * 24 * 60 * 60 * 1000 - Math.random() * 24 * 60 * 60 * 1000;
  return new Date(ms).toISOString();
}

async function main() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  console.log(`Seeding into ${DB_PATH}`);

  const passwordHash = await bcrypt.hash(`seed-${Date.now()}`, 10);
  const insertUser = db.prepare(
    `INSERT INTO User (id, email, passwordHash, name, tier, createdAt) VALUES (?, ?, ?, ?, 'free', ?)`
  );
  const now = new Date().toISOString();
  const userIds = [];
  const insertUsers = db.transaction(() => {
    for (const username of SEED_USERNAMES) {
      const id = `seeduser_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
      insertUser.run(id, `${username.toLowerCase()}@seed.manaforge.local`, passwordHash, username, now);
      userIds.push(id);
    }
  });
  insertUsers();
  console.log(`Created ${userIds.length} seed builder accounts.`);

  const basicNames = Object.values(BASIC_BY_COLOR).concat(["Wastes"]);
  const basicsMap = await getCardsByNames(basicNames);

  const insertDeck = db.prepare(
    `INSERT INTO Deck (id, name, commanderName, commanderData, cards, isPublic, ownerId, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`
  );

  console.log(`Fetching top ${TARGET_COMMANDER_COUNT}+ commanders from Scryfall by EDHREC rank...`);
  const candidateNames = await getTopCommanderNames(TARGET_COMMANDER_COUNT);
  console.log(`Got ${candidateNames.length} candidate commanders.`);

  let totalDecks = 0;
  let commandersUsed = 0;
  let commanderIndex = 0;

  for (const commanderName of candidateNames) {
    if (commandersUsed >= TARGET_COMMANDER_COUNT) break;
    commanderIndex += 1;
    console.log(`\n[${commanderIndex}/${candidateNames.length}, used ${commandersUsed}/${TARGET_COMMANDER_COUNT}] ${commanderName}`);

    const data = await getEdhrecCommanderData(commanderName);
    await sleep(150);
    if (!data) {
      console.log("  skipped (no EDHREC data)");
      continue;
    }

    const pools = {};
    const allNames = new Set([commanderName, ...basicNames]);
    for (const [cat, tags] of Object.entries(SECTION_TAGS)) {
      const views = namesFromTags(data.cardlists, tags);
      pools[cat] = views.map((v) => v.name);
      for (const n of pools[cat]) allNames.add(n);
    }

    const cardMap = await getCardsByNames(Array.from(allNames));
    for (const [name, card] of basicsMap) if (!cardMap.has(name)) cardMap.set(name, card);

    const commanderCard = cardMap.get(commanderName);
    if (!commanderCard) {
      console.log("  skipped (commander not found on Scryfall)");
      continue;
    }
    if (cardMap.size < 60) {
      console.log(`  skipped (only ${cardMap.size} cards resolved, not enough for a real decklist)`);
      continue;
    }
    const commanderDeckCard = toDeckCard(commanderCard, 1);

    console.log(`  resolved ${cardMap.size} cards, generating ${DECKS_PER_COMMANDER} decks...`);

    // Pick DECKS_PER_COMMANDER distinct name templates so the same commander's decks read as
    // different real builds (Aristocrats vs Voltron vs Budget) rather than identical copies.
    const shuffledTemplates = NAME_TEMPLATES.slice();
    for (let i = shuffledTemplates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledTemplates[i], shuffledTemplates[j]] = [shuffledTemplates[j], shuffledTemplates[i]];
    }

    const rows = [];
    for (let i = 0; i < DECKS_PER_COMMANDER; i++) {
      const rng = mulberry32(Date.now() ^ (i * 2654435761) ^ commanderIndex * 40503);
      const cards = buildDeckCards(commanderCard, data.typeCounts, pools, cardMap, rng);
      if (cards.length < 80) continue; // not enough real card data to make a believable deck

      const deckName = shuffledTemplates[i % shuffledTemplates.length](commanderName);
      const ownerId = userIds[Math.floor(Math.random() * userIds.length)];
      const timestamp = randomRecentTimestamp();
      const id = `seeddeck_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;

      rows.push([
        id,
        deckName,
        commanderName,
        JSON.stringify(commanderDeckCard),
        JSON.stringify(cards),
        ownerId,
        timestamp,
        timestamp,
      ]);
    }

    if (rows.length === 0) {
      console.log("  skipped (couldn't build a full decklist)");
      continue;
    }

    const insertBatch = db.transaction((batchRows) => {
      for (const row of batchRows) insertDeck.run(...row);
    });
    insertBatch(rows);
    totalDecks += rows.length;
    commandersUsed += 1;
    console.log(`  inserted ${rows.length} decks (running total: ${totalDecks} decks, ${commandersUsed} commanders)`);
  }

  console.log(`\nDone. Seeded ${totalDecks} public decks across ${userIds.length} builder accounts.`);
  db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
