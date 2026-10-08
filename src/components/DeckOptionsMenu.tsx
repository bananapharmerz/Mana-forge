"use client";

import { useState } from "react";
import {
  downloadTextFile,
  deckToCockatriceXml,
  deckToArenaText,
  downloadCardImagesZip,
} from "@/lib/deckExport";
import { decklistText, type Deck } from "@/lib/deckTypes";

function safeFilename(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, "_");
}

export default function DeckOptionsMenu({ deck }: { deck: Deck }) {
  const [open, setOpen] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState<{ done: number; total: number } | null>(null);
  const [note, setNote] = useState<string | null>(null);

  function flashNote(text: string) {
    setNote(text);
    setTimeout(() => setNote(null), 2500);
  }

  function handleDownloadDecklist() {
    downloadTextFile(`${safeFilename(deck.name)}.txt`, decklistText(deck));
  }

  function handleDownloadXml() {
    downloadTextFile(`${safeFilename(deck.name)}.xml`, deckToCockatriceXml(deck), "application/xml");
  }

  async function handleDownloadImages() {
    setZipping(true);
    setZipProgress({ done: 0, total: 0 });
    try {
      await downloadCardImagesZip(deck, (done, total) => setZipProgress({ done, total }));
    } finally {
      setZipping(false);
      setZipProgress(null);
    }
  }

  async function handleExportMoxfield() {
    await navigator.clipboard.writeText(decklistText(deck));
    window.open("https://moxfield.com/decks/personal", "_blank", "noopener,noreferrer");
    flashNote("Decklist copied — sign in, then Import/New Deck and paste.");
  }

  async function handleExportArchidekt() {
    await navigator.clipboard.writeText(decklistText(deck));
    window.open("https://archidekt.com/sandbox", "_blank", "noopener,noreferrer");
    flashNote('Decklist copied — click "Import cards" and paste.');
  }

  async function handleExportArena() {
    await navigator.clipboard.writeText(deckToArenaText(deck));
    flashNote("Copied in MTG Arena's import format — paste into Arena's deck import. Cards not in Arena won't be recognized.");
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-gold"
      >
        Options
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="card-frame absolute right-0 top-full z-30 mt-2 w-72 p-3">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Download
            </h4>
            <div className="flex flex-col gap-1">
              <button
                onClick={handleDownloadDecklist}
                className="rounded-md px-2 py-1.5 text-left text-sm text-foreground hover:bg-surface-raised"
              >
                Decklist (.txt)
              </button>
              <button
                onClick={handleDownloadXml}
                className="rounded-md px-2 py-1.5 text-left text-sm text-foreground hover:bg-surface-raised"
              >
                Deck XML (Cockatrice format)
              </button>
              <button
                onClick={handleDownloadImages}
                disabled={zipping}
                className="rounded-md px-2 py-1.5 text-left text-sm text-foreground hover:bg-surface-raised disabled:opacity-50"
              >
                {zipping
                  ? `Zipping images... ${zipProgress?.done ?? 0}/${zipProgress?.total ?? 0}`
                  : "Card Images (.zip)"}
              </button>
            </div>

            <h4 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-muted">
              Export
            </h4>
            <div className="flex flex-col gap-1">
              <button
                onClick={handleExportMoxfield}
                className="rounded-md px-2 py-1.5 text-left text-sm text-foreground hover:bg-surface-raised"
              >
                Moxfield ↗
              </button>
              <button
                onClick={handleExportArchidekt}
                className="rounded-md px-2 py-1.5 text-left text-sm text-foreground hover:bg-surface-raised"
              >
                Archidekt ↗
              </button>
              <button
                onClick={handleExportArena}
                className="rounded-md px-2 py-1.5 text-left text-sm text-foreground hover:bg-surface-raised"
              >
                Copy for MTG Arena
              </button>
            </div>

            {note && <p className="mt-3 text-[10px] text-gold-bright">{note}</p>}
          </div>
        </>
      )}
    </div>
  );
}
