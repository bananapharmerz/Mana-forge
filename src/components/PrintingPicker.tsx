"use client";

import { useEffect, useState } from "react";
import {
  getAllPrintings,
  cardImageForPrint,
  cardArtist,
  cardDistinguishingText,
  type ScryfallCard,
} from "@/lib/scryfall";

const MAX_CUSTOM_ART_BYTES = 5 * 1024 * 1024;

export default function PrintingPicker({
  cardName,
  onSelect,
  onSelectCustom,
  onClose,
}: {
  cardName: string;
  onSelect: (card: ScryfallCard) => void;
  onSelectCustom: (art: { imageUrl: string; artist?: string }) => void;
  onClose: () => void;
}) {
  const [printings, setPrintings] = useState<ScryfallCard[] | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customPreview, setCustomPreview] = useState<string | null>(null);
  const [customError, setCustomError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAllPrintings(cardName).then((cards) => {
      if (!cancelled) setPrintings(cards);
    });
    return () => {
      cancelled = true;
    };
  }, [cardName]);

  function handleFile(file: File | undefined) {
    setCustomError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setCustomError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_CUSTOM_ART_BYTES) {
      setCustomError("Image is too large — please use one under 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCustomPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function addCustomArt() {
    if (!customPreview) return;
    onSelectCustom({ imageUrl: customPreview });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="card-frame max-h-[80vh] w-full max-w-3xl overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Choose art for {cardName}</h3>
          <button onClick={onClose} className="text-sm text-muted hover:text-foreground">
            ✕
          </button>
        </div>

        <p className="mb-3 text-[10px] text-muted">
          Card images via Scryfall. Art © respective artist; Magic: The Gathering is © Wizards
          of the Coast.
        </p>

        <button
          onClick={() => setShowCustom((s) => !s)}
          className="mb-4 w-full rounded-md border border-dashed border-gold px-3 py-2 text-xs font-semibold text-gold-bright hover:bg-surface-raised"
        >
          {showCustom ? "Hide custom art" : "Use custom art instead"}
        </button>

        {showCustom && (
          <div className="card-frame mb-5 flex flex-col gap-2 p-3">
            <p className="text-xs text-muted">Upload your own image for {cardName}.</p>
            <div className="flex gap-3">
              {customPreview && (
                <div
                  className="w-20 shrink-0 overflow-hidden rounded"
                  style={{ aspectRatio: "2.5 / 3.5" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={customPreview} alt="Custom art preview" className="h-full w-full object-cover" />
                </div>
              )}
              <div className="flex flex-1 flex-col gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                  className="text-xs text-muted"
                />
                <button
                  onClick={addCustomArt}
                  disabled={!customPreview}
                  className="w-fit rounded-md bg-gold px-3 py-1.5 text-xs font-semibold text-black hover:bg-gold-bright disabled:opacity-50"
                >
                  Add Custom Art
                </button>
              </div>
            </div>
            {customError && <p className="text-xs text-red-600">{customError}</p>}
          </div>
        )}

        {printings === null && <p className="text-sm text-muted">Loading printings...</p>}

        {printings !== null && printings.length === 0 && (
          <p className="text-sm text-muted">No printings found.</p>
        )}

        {/* Some names (mostly tokens) cover several functionally different cards — e.g. a dozen
            different "Zombie" tokens with different power/toughness or keywords — so once that
            ambiguity shows up, surface the actual game text instead of just art/set. */}
        {printings && new Set(printings.map(cardDistinguishingText)).size > 1 && (
          <p className="mb-3 text-xs text-gold-bright">
            Multiple different cards share this name — check the details below each option.
          </p>
        )}

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {printings?.map((card) => {
            const img = cardImageForPrint(card);
            const details = cardDistinguishingText(card);
            return (
              <button
                key={card.id}
                onClick={() => onSelect(card)}
                className="flex flex-col gap-1 rounded-md border border-border p-1.5 text-left hover:border-gold"
              >
                <div className="overflow-hidden rounded" style={{ aspectRatio: "2.5 / 3.5" }}>
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={card.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-surface-raised text-[9px] text-muted">
                      No image
                    </div>
                  )}
                </div>
                <p className="line-clamp-1 text-[10px] text-muted">{card.set_name}</p>
                {cardArtist(card) && (
                  <p className="line-clamp-1 text-[9px] text-muted/70">Art by {cardArtist(card)}</p>
                )}
                {details && (
                  <p className="line-clamp-3 text-[9px] text-foreground/80">{details}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
