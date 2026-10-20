"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  streamAllPrintings,
  printingTags,
  cardImage,
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
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [multilingual, setMultilingual] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customPreview, setCustomPreview] = useState<string | null>(null);
  const [customError, setCustomError] = useState<string | null>(null);

  // Printings arrive a page (175) at a time, so the first ones show straight away while the rest load.
  useEffect(() => {
    const ctrl = new AbortController();
    streamAllPrintings(cardName, { multilingual, signal: ctrl.signal }, (cards, info) => {
      if (ctrl.signal.aborted) return;
      setPrintings((prev) => [...(prev ?? []), ...cards]);
      setTotal(info.total);
      if (info.done) setLoadingMore(false);
    }).catch(() => {
      if (ctrl.signal.aborted) return;
      setLoadError(true);
      setLoadingMore(false);
      setPrintings((prev) => prev ?? []);
    });
    return () => ctrl.abort();
  }, [cardName, multilingual]);

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

  const modal = (
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
            {customError && <p className="text-xs text-down">{customError}</p>}
          </div>
        )}

        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span>
            {printings === null
              ? "Loading printings…"
              : `${printings.length}${loadingMore && total > printings.length ? ` of ${total}` : ""} printing${printings.length !== 1 ? "s" : ""}${loadingMore ? " — loading more…" : ""}`}
          </span>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={multilingual} onChange={(e) => {
                // Start the list over; the effect then reloads it with or without other languages.
                setPrintings(null);
                setTotal(0);
                setLoadingMore(true);
                setLoadError(false);
                setMultilingual(e.target.checked);
              }} />
            Include other languages
          </label>
        </div>
        {loadError && (
          <p className="mb-3 text-xs text-down">Scryfall is busy, so some printings may be missing. Close and reopen to try again.</p>
        )}

        {printings !== null && printings.length === 0 && !loadingMore && (
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
            // The "normal" thumbnail is about a third of the print image's size, and lazy loading
            // means only the options on screen download.
            const img = cardImage(card);
            const details = cardDistinguishingText(card);
            const tags = printingTags(card);
            return (
              <button
                key={card.id}
                onClick={() => onSelect(card)}
                className="flex flex-col gap-1 rounded-md border border-border p-1.5 text-left hover:border-gold"
              >
                <div className="overflow-hidden rounded" style={{ aspectRatio: "2.5 / 3.5" }}>
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={card.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-surface-raised text-[9px] text-muted">
                      No image
                    </div>
                  )}
                </div>
                <p className="line-clamp-1 text-[10px] text-muted">
                  {card.set_name}
                  {card.collector_number ? ` #${card.collector_number}` : ""}
                </p>
                {tags.length > 0 && (
                  <p className="line-clamp-1 text-[9px] font-semibold text-gold-bright">{tags.join(" · ")}</p>
                )}
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

  // Render through a portal on <body> so the fixed overlay centres on the viewport (the screen),
  // not on whatever ancestor in the deck editor creates a containing block (a CSS transform turns
  // `position: fixed` into page-relative, which was dropping the picker at the middle of the page).
  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}
