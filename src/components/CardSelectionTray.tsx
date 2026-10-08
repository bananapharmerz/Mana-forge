"use client";

import { useState } from "react";
import { useCardSelection } from "./CardSelectionContext";
import { saveSelectedCardsAsDeck } from "@/app/actions/decks";

export default function CardSelectionTray() {
  const { selected, pairs, companionIds, remove, clear } = useCardSelection();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedDeckId, setSavedDeckId] = useState<string | null>(null);

  if (selected.length === 0) return null;

  async function saveAll() {
    setSaving(true);
    setError(null);
    const result = await saveSelectedCardsAsDeck(selected, pairs, companionIds);
    if (result.ok) {
      setSavedDeckId(result.id);
    } else {
      setError(result.error);
    }
    setSaving(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-gold px-5 py-3 text-sm font-semibold text-black shadow-xl transition-transform hover:scale-105 hover:bg-gold-bright"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
        {selected.length} selected
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="card-frame flex max-h-[80vh] w-full max-w-xl flex-col bg-surface p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Selected Cards ({selected.length})</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted hover:text-foreground"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {savedDeckId ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <p className="text-sm text-foreground">Saved to My Decks ✓</p>
                <div className="flex gap-2">
                  <a
                    href={`/deck-builder/${savedDeckId}`}
                    className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold-bright"
                  >
                    Open in Deck Builder
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      clear();
                      setSavedDeckId(null);
                      setOpen(false);
                    }}
                    className="rounded-md border border-border px-4 py-2 text-sm text-muted hover:border-gold hover:text-foreground"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto">
                  <div className="flex flex-col gap-2">
                    {selected.map((card) => (
                      <div
                        key={card.scryfallId}
                        className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-foreground">{card.name}</p>
                          <p className="truncate text-xs text-muted">{card.typeLine}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(card.scryfallId)}
                          className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-muted hover:border-gold hover:text-foreground"
                        >
                          Deselect
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={saveAll}
                    disabled={saving}
                    className="flex-1 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold-bright disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save to My Decks"}
                  </button>
                  <button
                    type="button"
                    onClick={clear}
                    className="rounded-md border border-border px-4 py-2 text-sm text-muted hover:border-gold hover:text-foreground"
                  >
                    Clear All
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
