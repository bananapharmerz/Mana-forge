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
      "Moxfield is a great deck builder. If you want your Commander decks somewhere that also tracks what they're worth and shows what other players run, moving over takes about thirty seconds.",
    steps: [
      "Open your deck on Moxfield.",
      "Click More (top-right) → Export.",
      "Choose “Copy for MTGA” or “Copy as plain text”.",
      "Paste it in the box below — your commander comes across automatically.",
    ],
    note: "You don't have to leave Moxfield behind. Import a deck here, keep the original there, and see which you reach for.",
    title: "Switching from Moxfield? Import your Commander decks free",
    description:
      "Moving from Moxfield? Bring your Commander decks to Mana Forge in seconds — paste your Moxfield export and keep building, with live card prices and deck-value tracking. Free, no account needed to try.",
  },
  archidekt: {
    slug: "archidekt",
    name: "Archidekt",
    intro:
      "Archidekt is a solid, flexible deck builder. If you'd like your Commander decks somewhere that tracks their value over time and is built commander-first, bringing them over is quick.",
    steps: [
      "Open your deck on Archidekt.",
      "Copy the deck's public link, or click Export and copy the text.",
      "Paste the link or the list in the box below.",
      "Pick your commander if we ask — then you're building.",
    ],
    note: "No need to delete anything on Archidekt. Pull a deck in here, keep the original, and compare for yourself.",
    title: "Switching from Archidekt? Import your Commander decks free",
    description:
      "Moving from Archidekt? Bring your Commander decks to Mana Forge in seconds — paste your list or a public Archidekt link and keep building, with live card prices and deck-value tracking. Free, no account needed to try.",
  },
};

export const MIGRATION_SLUGS = Object.keys(MIGRATIONS);

export const getMigration = (slug: string): Migration | undefined => MIGRATIONS[slug];
