// Starter decks: publishes an "Average build" and a "Budget build" for the most popular
// commanders, under the site's own account ("Mana Forge"), so the site has real decks to browse
// and copy from day one. Each list takes the most-played cards for that commander from EDHREC's
// public play data (credited on every deck page) and resolves them through Scryfall.
//
// Safe to run again: commanders that already have their starter decks are skipped.
//
//   node scripts/seed-starter-decks.mjs                      (local dev.db)
//   DATABASE_PATH=/data/manaforge.db node scripts/seed-starter-decks.mjs   (live server)
//   COMMANDERS=200 BUDGET_USD=3 …                             (optional tuning)

import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const DB_PATH =
  process.env.DATABASE_PATH || new URL("../dev.db", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SCRYFALL = "https://api.scryfall.com";
const TARGET = Number(process.env.COMMANDERS || 180);
const BUDGET_USD = Number(process.env.BUDGET_USD || 3); // budget build: no single card above this
const HOUSE_EMAIL = "starter-decks@manaforgehub.com";
const HOUSE_NAME = "Mana Forge";
const UA = { "User-Agent": "ManaForge/1.0 (manaforgehub.com; contact@manaforgehub.com)", Accept: "application/json" };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url, opts = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { ...opts, headers: { ...UA, ...(opts.headers ?? {}) } }).catch(() => null);
    if (res?.ok) return res.json();
    if (res && res.status !== 429 && res.status < 500) return null;
    await sleep(1500 * (attempt + 1));
  }
  return null;
}

async function topCommanders(count) {
  const names = [];
  for (let page = 1; names.length < count + 40; page++) {
    const q = new URLSearchParams({ q: "is:commander -is:funny legal:commander", order: "edhrec", unique: "cards", page: String(page) });
    const json = await fetchJson(`${SCRYFALL}/cards/search?${q}`);
    if (!json?.data) break;
    for (const c of json.data) names.push(c.name);
    if (!json.has_more) break;
    await sleep(120);
  }
  return [...new Set(names)];
}

const slug = (name) => name.split(" // ")[0].toLowerCase().replace(/'/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const SECTIONS = {
  creature: ["creatures"],
  instant: ["instants"],
  sorcery: ["sorceries"],
  artifact: ["manaartifacts", "utilityartifacts"],
  enchantment: ["enchantments"],
  planeswalker: ["planeswalkers"],
  land: ["lands", "utilitylands"],
};

async function edhrec(name) {
  const data = await fetchJson(`https://json.edhrec.com/pages/commanders/${slug(name)}.json`);
  if (!data) return null;
  const lists = data?.container?.json_dict?.cardlists ?? [];
  const pools = {};
  for (const [cat, tags] of Object.entries(SECTIONS)) {
    const seen = new Map();
    for (const tag of tags)
      for (const cv of lists.find((l) => l.tag === tag)?.cardviews ?? []) {
        const share = cv.potential_decks ? (cv.num_decks ?? 0) / cv.potential_decks : cv.inclusion ?? 0;
        if (!seen.has(cv.name) || seen.get(cv.name) < share) seen.set(cv.name, share);
      }
    // Most-played first.
    pools[cat] = [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);
  }
  const counts = {};
  for (const k of ["creature", "instant", "sorcery", "artifact", "enchantment", "planeswalker", "land"]) counts[k] = Number(data[k] ?? 0);
  return { pools, counts };
}

async function scryfallCards(names) {
  const out = new Map();
  const unique = [...new Set(names)];
  for (let i = 0; i < unique.length; i += 75) {
    const json = await fetchJson(`${SCRYFALL}/cards/collection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifiers: unique.slice(i, i + 75).map((name) => ({ name })) }),
    });
    for (const c of json?.data ?? []) {
      out.set(c.name, c);
      if (c.name.includes(" // ")) out.set(c.name.split(" // ")[0], c);
    }
    await sleep(120);
  }
  return out;
}

const category = (t = "") =>
  [["Creatures", /creature/i], ["Planeswalkers", /planeswalker/i], ["Battles", /battle/i], ["Instants", /instant/i], ["Sorceries", /sorcery/i], ["Artifacts", /artifact/i], ["Enchantments", /enchantment/i], ["Lands", /land/i]].find(([, re]) => re.test(t))?.[0] ?? "Other";
const usd = (c) => {
  const n = Number(c.prices?.usd ?? c.prices?.usd_foil);
  return Number.isFinite(n) ? n : null;
};
const deckCard = (c, quantity = 1) => ({
  name: c.name,
  scryfallId: c.id,
  imageUrl: c.image_uris?.normal ?? c.card_faces?.[0]?.image_uris?.normal,
  typeLine: c.type_line,
  manaCost: c.mana_cost ?? c.card_faces?.[0]?.mana_cost,
  cmc: c.cmc,
  colorIdentity: c.color_identity ?? [],
  quantity,
  category: category(c.type_line),
  priceUsd: usd(c),
});

const BASICS = { W: "Plains", U: "Island", B: "Swamp", R: "Mountain", G: "Forest" };

function build(commander, { pools, counts }, cards, budget) {
  const nonland = ["creature", "instant", "sorcery", "artifact", "enchantment", "planeswalker"];
  const lands = Math.max(33, Math.min(40, Math.round(counts.land || 37)));
  const spells = 99 - lands;
  const total = nonland.reduce((n, k) => n + counts[k], 0) || 1;
  const want = Object.fromEntries(nonland.map((k) => [k, Math.round((counts[k] / total) * spells)]));
  want.creature += spells - nonland.reduce((n, k) => n + want[k], 0);

  const used = new Set([commander.name]);
  const chosen = [];
  const ok = (name) => {
    const c = cards.get(name);
    if (!c || used.has(c.name)) return false;
    const ci = c.color_identity ?? [];
    if (!ci.every((x) => (commander.color_identity ?? []).includes(x))) return false;
    if (budget && (usd(c) ?? 0) > BUDGET_USD) return false;
    return true;
  };
  const take = (pool, n) => {
    for (const name of pool) {
      if (n <= 0) break;
      if (!ok(name)) continue;
      const c = cards.get(name);
      used.add(c.name);
      chosen.push(deckCard(c));
      n--;
    }
    return n;
  };
  let left = 0;
  for (const k of nonland) left += take(pools[k] ?? [], want[k]);
  // Fill spell slots another category couldn't, from the most-played remaining spells.
  if (left > 0) left = take(nonland.flatMap((k) => pools[k] ?? []), left);
  take(pools.land ?? [], lands + left);

  // Top up with basics in the commander's colours.
  let need = 99 - chosen.reduce((n, c) => n + c.quantity, 0);
  const colours = commander.color_identity?.length ? commander.color_identity : ["C"];
  for (let i = 0; need > 0; i++, need--) {
    const name = BASICS[colours[i % colours.length]] ?? "Wastes";
    const basic = cards.get(name);
    if (!basic) break;
    const have = chosen.find((c) => c.name === name);
    if (have) have.quantity++;
    else chosen.push(deckCard(basic));
  }
  return chosen;
}

async function main() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  console.log(`Starter decks → ${DB_PATH}`);

  let house = db.prepare(`SELECT id FROM User WHERE email = ?`).get(HOUSE_EMAIL);
  if (!house) {
    // Nobody can log in as the house account: its password is random and never stored.
    const hash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);
    house = { id: `house_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}` };
    db.prepare(`INSERT INTO User (id, email, passwordHash, name, tier, createdAt) VALUES (?, ?, ?, ?, 'free', ?)`).run(
      house.id, HOUSE_EMAIL, hash, HOUSE_NAME, new Date().toISOString()
    );
    console.log("Created the Mana Forge house account.");
  }
  const has = db.prepare(`SELECT 1 FROM Deck WHERE ownerId = ? AND name = ?`);
  const insert = db.prepare(
    `INSERT INTO Deck (id, name, commanderName, commanderData, cards, isPublic, ownerId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`
  );

  const basics = await scryfallCards([...Object.values(BASICS), "Wastes"]);
  const names = await topCommanders(TARGET);
  console.log(`${names.length} candidate commanders`);

  let done = 0;
  let decks = 0;
  for (const name of names) {
    if (done >= TARGET) break;
    const avgName = `${name}: Average Build`;
    const budName = `${name}: Budget Build`;
    if (has.get(house.id, avgName)) {
      done++;
      continue;
    }
    const data = await edhrec(name);
    await sleep(250);
    if (!data) {
      console.log(`- ${name}: no play data, skipped`);
      continue;
    }
    const cards = await scryfallCards([name, ...Object.values(data.pools).flat()]);
    for (const [k, v] of basics) if (!cards.has(k)) cards.set(k, v);
    const commander = cards.get(name);
    if (!commander || cards.size < 80) {
      console.log(`- ${name}: not enough card data, skipped`);
      continue;
    }
    const now = new Date().toISOString();
    const rows = [];
    const avg = build(commander, data, cards, false);
    // A real deck: plenty of different non-basic cards, not mostly basic lands.
    if (avg.filter((c) => !Object.values(BASICS).includes(c.name)).length >= 60) rows.push([avgName, avg]);
    const bud = build(commander, data, cards, true);
    const avgCost = avg.reduce((n, c) => n + (c.priceUsd ?? 0) * c.quantity, 0);
    const budCost = bud.reduce((n, c) => n + (c.priceUsd ?? 0) * c.quantity, 0);
    if (bud.filter((c) => !Object.values(BASICS).includes(c.name)).length >= 55 && budCost < avgCost * 0.75) rows.push([budName, bud]);
    if (!rows.length) {
      console.log(`- ${name}: couldn't build a full list, skipped`);
      continue;
    }
    db.transaction(() => {
      for (const [deckName, list] of rows)
        insert.run(`starter_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`, deckName, name, JSON.stringify(deckCard(commander)), JSON.stringify(list), house.id, now, now);
    })();
    done++;
    decks += rows.length;
    console.log(`✓ ${name}: ${rows.length} deck(s) (avg $${avgCost.toFixed(0)}, budget $${budCost.toFixed(0)}) — ${done}/${TARGET}, ${decks} new decks`);
  }
  console.log(`\nDone: ${decks} new starter decks for ${done} commanders.`);
  db.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
