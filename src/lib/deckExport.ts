import type { Deck } from "./deckTypes";

function allCardsFlat(deck: Deck) {
  return deck.commander ? [deck.commander, ...deck.cards] : deck.cards;
}

export function downloadTextFile(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Cockatrice's standard deck XML format.
export function deckToCockatriceXml(deck: Deck): string {
  const cards = allCardsFlat(deck);
  const lines = cards.map(
    (c) => `    <card number="${c.quantity}" name="${xmlEscape(c.name)}"/>`
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<cockatrice_deck version="1">',
    `  <deckname>${xmlEscape(deck.name)}</deckname>`,
    "  <comments></comments>",
    '  <zone name="main">',
    ...lines,
    "  </zone>",
    '  <zone name="side">',
    "  </zone>",
    "</cockatrice_deck>",
  ].join("\n");
}

// MTG Arena's clipboard-import format is the same "qty name" list our decklistText already
// produces, so this just adds a heads-up about cards Arena won't recognize.
export function deckToArenaText(deck: Deck): string {
  const cards = allCardsFlat(deck);
  return cards.map((c) => `${c.quantity} ${c.name}`).join("\n");
}

export async function downloadCardImagesZip(deck: Deck, onProgress?: (done: number, total: number) => void) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const cards = allCardsFlat(deck).filter((c) => c.imageUrl);

  let done = 0;
  await Promise.all(
    cards.map(async (c) => {
      try {
        const res = await fetch(c.imageUrl!);
        if (res.ok) {
          const blob = await res.blob();
          const safeName = c.name.replace(/[\\/:*?"<>|]/g, "_");
          zip.file(`${safeName}.jpg`, blob);
        }
      } catch {
        // skip cards whose image fails to fetch
      } finally {
        done++;
        onProgress?.(done, cards.length);
      }
    })
  );

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${deck.name.replace(/[\\/:*?"<>|]/g, "_")}-images.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

const PRINT_GROUPS: [string, RegExp][] = [
  ["Creatures", /creature/i],
  ["Planeswalkers", /planeswalker/i],
  ["Instants", /instant/i],
  ["Sorceries", /sorcery/i],
  ["Artifacts", /artifact/i],
  ["Enchantments", /enchantment/i],
  ["Lands", /land/i],
];

/** Opens a clean, printable decklist (grouped by card type, two columns) and the print dialog. */
export function printDecklist(deck: Deck, site = "Mana Forge"): boolean {
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
  const groups = new Map<string, { q: number; n: string }[]>();
  let total = 0;
  for (const c of deck.cards) {
    if (c.category === "Tokens") continue;
    const g = PRINT_GROUPS.find(([, re]) => re.test(c.typeLine))?.[0] ?? "Other";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push({ q: c.quantity, n: c.name });
    total += c.quantity;
  }
  const command = [deck.commander, deck.partner, deck.companion].filter((c): c is NonNullable<typeof c> => !!c);
  total += command.length;
  const order = [...PRINT_GROUPS.map(([g]) => g), "Other"].filter((g) => groups.has(g));
  const section = (title: string, rows: { q: number; n: string }[]) =>
    `<section><h2>${esc(title)} <span>(${rows.reduce((a, r) => a + r.q, 0)})</span></h2><ul>${rows
      .sort((a, b) => a.n.localeCompare(b.n))
      .map((r) => `<li><b>${r.q}</b> ${esc(r.n)}</li>`)
      .join("")}</ul></section>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(deck.name)} · decklist</title><style>
    body{font:12px/1.35 Georgia,serif;color:#111;margin:24px}
    h1{font-size:20px;margin:0 0 2px}p.meta{margin:0 0 14px;color:#555}
    .cols{columns:2;column-gap:28px}section{break-inside:avoid;margin:0 0 12px}
    h2{font-size:13px;margin:0 0 4px;border-bottom:1px solid #999;padding-bottom:2px}h2 span{font-weight:normal;color:#666}
    ul{list-style:none;margin:0;padding:0}li{padding:1px 0}li b{display:inline-block;width:22px}
    footer{margin-top:16px;color:#777;font-size:10px}@page{margin:14mm}
  </style></head><body>
    <h1>${esc(deck.name)}</h1>
    <p class="meta">${command.length ? `Commander: ${command.map((c) => esc(c.name)).join(" + ")} · ` : ""}${total} cards</p>
    <div class="cols">${command.length ? section("Command zone", command.map((c) => ({ q: 1, n: c.name }))) : ""}${order.map((g) => section(g, groups.get(g)!)).join("")}</div>
    <footer>Printed from ${esc(site)}</footer>
  </body></html>`;
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 250);
  return true;
}
