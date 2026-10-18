// Migration / "switching from X" landing pages. Each entry powers a page at
// /import/from/<slug> that ranks for people searching to move off another deck
// builder, and walks them through bringing their decks over with the normal
// paste-import. The sitemap reads MIGRATION_SLUGS so every page gets indexed.
//
// Keep the tone helpful, not combative: a migration guide, not a takedown. State
// only what's true of the other tool (it's a real, well-liked deck builder) and
// sell Mana Forge on what it actually does, which anyone can verify on the site.

export type Migration = {
  slug: string;
  // The other tool, as people write it.
  name: string;
  // Optional H1 override. Defaults to "Switching from <name>?" — fine for a rival deck
  // builder, but a game client like Arena/MTGO reads better as "Import your <name> deck".
  heading?: string;
  // One line under the title.
  intro: string;
  // How to get a decklist out of that tool, step by step.
  steps: string[];
  // A short, honest note on who it's for / what it's like, so the page reads as fair.
  note: string;
  // SEO
  title: string;
  description: string;
};

export const MIGRATIONS: Record<string, Migration> = {
  moxfield: {
    slug: "moxfield",
    name: "Moxfield",
    intro:
      "Moxfield is a great deck builder. If you want a free, commander-first alternative that also tracks what your decks are worth and shows what other players run, moving over takes about thirty seconds.",
    steps: [
      "Open your deck on Moxfield.",
      "Click More (top-right) → Export.",
      "Choose “Copy for MTGA” or “Copy as plain text”.",
      "Paste it in the box below — your commander comes across automatically.",
    ],
    note: "You don't have to leave Moxfield behind. Import a deck here, keep the original there, and see which you reach for.",
    title: "Free Moxfield alternative — import your Commander decks",
    description:
      "Looking for a free Moxfield alternative? Mana Forge is a commander-first deck builder with live card prices and deck-value tracking. Bring your Moxfield decks over in seconds — paste your export.",
  },
  archidekt: {
    slug: "archidekt",
    name: "Archidekt",
    intro:
      "Archidekt is a solid, flexible deck builder. If you'd like a free, commander-first alternative that also tracks deck value over time, bringing your decks over is quick.",
    steps: [
      "Open your deck on Archidekt.",
      "Copy the deck's public link, or click Export and copy the text.",
      "Paste the link or the list in the box below.",
      "Pick your commander if we ask — then you're building.",
    ],
    note: "No need to delete anything on Archidekt. Pull a deck in here, keep the original, and compare for yourself.",
    title: "Free Archidekt alternative — import your Commander decks",
    description:
      "Looking for a free Archidekt alternative? Mana Forge is a commander-first deck builder with live card prices and deck-value tracking. Bring your Archidekt decks over in seconds — paste a list or public link.",
  },
  arena: {
    slug: "arena",
    name: "MTG Arena",
    heading: "Import your MTG Arena deck",
    intro:
      "Exported a deck from MTG Arena? Bring the list into Mana Forge to build it out, see what it's worth and share it — set codes and all.",
    steps: [
      "Open your deck in MTG Arena.",
      "Click Export (top-right of the deck view).",
      "The list is copied to your clipboard — there's no file to save.",
      "Paste it in the box below.",
    ],
    note: "Arena's export uses set codes and collector numbers; Mana Forge reads them and matches each card.",
    title: "Import an MTG Arena deck to Mana Forge — free",
    description:
      "Exported a deck from MTG Arena? Paste the list into Mana Forge to build, price and share it — free, with Commander prices and deck-value tracking.",
  },
  mtgo: {
    slug: "mtgo",
    name: "MTGO",
    heading: "Import your MTGO deck",
    intro:
      "Have a decklist from Magic Online? Bring it into Mana Forge to build it out, track what it's worth and share it.",
    steps: [
      "In MTGO, open the deck in the Deck Editor.",
      "Right-click the deck → Export (or use the deck's Export button).",
      "Open the saved .txt list and copy its contents.",
      "Paste it in the box below — one card per line.",
    ],
    note: "A plain “1 Card Name” per line is all Mana Forge needs, so any MTGO text export works.",
    title: "Import an MTGO (Magic Online) deck to Mana Forge — free",
    description:
      "Bring a Magic Online decklist into Mana Forge — paste your MTGO text export and build, price and share your deck. Free.",
  },
  tappedout: {
    slug: "tappedout",
    name: "TappedOut",
    intro:
      "TappedOut has been around forever. If you'd like your Commander decks somewhere with live price and value tracking and commander-first browsing, moving a deck over is quick.",
    steps: [
      "Open your deck on TappedOut.",
      "Use Export (the download / ▼ menu) and pick a plain-text or MTGO format.",
      "Copy the list.",
      "Paste it in the box below — pick your commander if we ask.",
    ],
    note: "No need to take anything down on TappedOut. Pull a deck in here and keep the original.",
    title: "Free TappedOut alternative — import your Commander decks",
    description:
      "Looking for a free TappedOut alternative? Mana Forge is a commander-first deck builder with live card prices and deck-value tracking. Bring your TappedOut decks over in seconds — paste a text or MTGO export.",
  },
  deckstats: {
    slug: "deckstats",
    name: "Deckstats",
    intro:
      "Deckstats is a capable, long-running builder. If you'd like your Commander decks somewhere with live price and value tracking and commander-first browsing, bringing them over is quick.",
    steps: [
      "Open your deck on Deckstats.",
      "Click Export and choose a plain-text, one-card-per-line format.",
      "Copy the list (keep your commander under a Commander line).",
      "Paste it in the box below.",
    ],
    note: "Keep your Deckstats copy — just pull a deck in here and compare.",
    title: "Free Deckstats alternative — import your Commander decks",
    description:
      "Looking for a free Deckstats alternative? Mana Forge is a commander-first deck builder with live card prices and deck-value tracking. Bring your Deckstats decks over in seconds — paste your export.",
  },
  mtggoldfish: {
    slug: "mtggoldfish",
    name: "MTGGoldfish",
    heading: "Import your MTGGoldfish deck",
    intro:
      "Have a decklist on MTGGoldfish? Bring it into Mana Forge to build it out, track what it's worth and share it.",
    steps: [
      "Open the deck on MTGGoldfish.",
      "Use the download / arrow and pick a plain-text (.txt) export, or copy the list.",
      "Paste it in the box below — one card per line.",
      "Pick your commander if we ask.",
    ],
    note: "MTGGoldfish is great for prices; Mana Forge keeps the price view attached to the deck you're building.",
    title: "Import an MTGGoldfish deck to Mana Forge — free",
    description:
      "Bring a MTGGoldfish decklist into Mana Forge — paste the export and build, price and share your Commander deck. Free.",
  },
  deckbox: {
    slug: "deckbox",
    name: "Deckbox",
    intro:
      "Deckbox has been a staple for collections and decks for years. If you'd like your Commander decks somewhere with live value tracking and commander-first browsing, moving one over is quick.",
    steps: [
      "Open your deck on Deckbox.",
      "Use Export / copy to clipboard and choose a plain-text list.",
      "Copy the list.",
      "Paste it in the box below — pick your commander if we ask.",
    ],
    note: "No need to change anything on Deckbox — pull a deck in and keep the original.",
    title: "Free Deckbox alternative — import your Commander decks",
    description:
      "Looking for a free Deckbox alternative? Mana Forge is a commander-first deck builder with live card prices and deck-value tracking. Bring your Deckbox decks over in seconds — paste your export.",
  },
};

export const MIGRATION_SLUGS = Object.keys(MIGRATIONS);

export const getMigration = (slug: string): Migration | undefined => MIGRATIONS[slug];
