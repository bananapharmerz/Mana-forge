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
