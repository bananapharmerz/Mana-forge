"use client";

import { useState } from "react";
import Link from "next/link";
import CardSearchBox from "@/components/CardSearchBox";
import PrintingPicker from "@/components/PrintingPicker";
import { useProxyProject } from "@/components/ProxyProjectProvider";
import { autocompleteCardNames, cardImageForPrint, cardArtist, type ScryfallCard } from "@/lib/scryfall";
import {
  CARDS_PER_SHEET,
  DECK_BUNDLE_MAX_CARDS,
  DECK_BUNDLE_PRICE_CENTS,
  PRICE_PER_CARD_CENTS,
  proxyTotalCents,
  type PricingMode,
} from "@/lib/proxyTypes";
import { formatCents } from "@/lib/money";
import { SHOP_ENABLED } from "@/lib/features";
import { buildProxyPdf, type CardSpacing, type PaperSize } from "@/lib/proxyPdf";

export default function ProxiesPage() {
  const { cards, addCard, updateQuantity, removeCard, totalCount } = useProxyProject();
  const [pickerCardName, setPickerCardName] = useState<string | null>(null);
  const [pricingMode, setPricingMode] = useState<PricingMode>("per-card");
  const [paper, setPaper] = useState<PaperSize>("a4");
  const [spacing, setSpacing] = useState<CardSpacing>("none");
  const [pdfStatus, setPdfStatus] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  async function downloadPdf() {
    if (pdfBusy || cards.length === 0) return;
    setPdfBusy(true);
    setPdfStatus("Loading card images…");
    try {
      const result = await buildProxyPdf(cards, {
        paper,
        spacing,
        onProgress: (done, total) => setPdfStatus(`Loading card images… ${done}/${total}`),
      });
      const blob = new Blob([result.bytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `manaforge-proxies-${result.cards}-cards.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setPdfStatus(
        result.failed.length
          ? `PDF ready (${result.pages} page${result.pages !== 1 ? "s" : ""}). ${result.failed.length} image${result.failed.length !== 1 ? "s" : ""} couldn't load and printed as a labelled blank: ${result.failed.slice(0, 3).join(", ")}${result.failed.length > 3 ? "…" : ""}`
          : `PDF ready — ${result.pages} page${result.pages !== 1 ? "s" : ""}. Print at 100% / "Actual size", not "Fit to page".`
      );
    } catch {
      setPdfStatus("Couldn't build the PDF. Check your connection and try again.");
    } finally {
      setPdfBusy(false);
    }
  }

  function handlePrintingSelected(card: ScryfallCard) {
    addCard({
      scryfallId: card.id,
      name: card.name,
      setName: card.set_name,
      artist: cardArtist(card),
      imageUrl: cardImageForPrint(card),
    });
    setPickerCardName(null);
  }

  function handleCustomArtSelected(art: { imageUrl: string; artist?: string }) {
    if (!pickerCardName) return;
    addCard({
      scryfallId: `custom-${crypto.randomUUID()}`,
      name: pickerCardName,
      setName: "Custom Art",
      artist: art.artist,
      imageUrl: art.imageUrl,
      isCustomArt: true,
    });
    setPickerCardName(null);
  }

  function downloadProject() {
    const rows = [
      ["Quantity", "Name", "Set", "Artist"],
      ...cards.map((c) => [String(c.quantity), c.name, c.setName ?? "", c.artist ?? ""]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "proxy-project.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const flat: { scryfallId: string; name: string; imageUrl?: string; artist?: string }[] = [];
  for (const c of cards) {
    for (let i = 0; i < c.quantity; i++) {
      flat.push({ scryfallId: c.scryfallId, name: c.name, imageUrl: c.imageUrl, artist: c.artist });
    }
  }
  const sheets: (typeof flat)[] = [];
  for (let i = 0; i < flat.length; i += CARDS_PER_SHEET) {
    sheets.push(flat.slice(i, i + CARDS_PER_SHEET));
  }

  const bundleEligible = totalCount > 0 && totalCount <= DECK_BUNDLE_MAX_CARDS;
  const effectiveMode: PricingMode = bundleEligible ? pricingMode : "per-card";
  const totalCents = proxyTotalCents(totalCount, effectiveMode);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-foreground">Proxy Builder</h1>
      <p className="mt-1 text-muted">
        Playtest a card before you buy it. Pick the exact printing you want, preview the sheets,
        and download a free print-at-home PDF with real-size cards and cut marks
        {SHOP_ENABLED ? " — or order printed proxies shipped to you" : ""}.
      </p>

      <div className="mt-6 max-w-md">
        <CardSearchBox
          placeholder="Search for a card to add..."
          fetchSuggestions={autocompleteCardNames}
          onSelect={(name) => setPickerCardName(name)}
        />
      </div>

      {pickerCardName && (
        <PrintingPicker
          cardName={pickerCardName}
          onSelect={handlePrintingSelected}
          onSelectCustom={handleCustomArtSelected}
          onClose={() => setPickerCardName(null)}
        />
      )}

      {cards.length === 0 ? (
        <p className="mt-6 text-sm text-muted">
          No cards in your project yet — search above to add some.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-6 lg:flex-row">
          <div className="w-full lg:w-80 shrink-0">
            <h2 className="mb-2 text-sm font-semibold text-gold-bright">
              Project ({totalCount} cards)
            </h2>
            <div className="flex flex-col gap-1">
              {cards.map((c) => (
                <div
                  key={c.scryfallId}
                  className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2"
                >
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm text-foreground">{c.name}</p>
                    {c.setName && <p className="truncate text-[10px] text-muted">{c.setName}</p>}
                    {c.artist && (
                      <p className="truncate text-[10px] text-muted/70">Art: {c.artist}</p>
                    )}
                  </div>
                  <button
                    onClick={() => updateQuantity(c.scryfallId, c.quantity - 1)}
                    className="rounded border border-border px-1.5 text-xs text-muted hover:text-foreground"
                  >
                    −
                  </button>
                  <span className="w-5 text-center text-xs text-foreground">{c.quantity}</span>
                  <button
                    onClick={() => updateQuantity(c.scryfallId, c.quantity + 1)}
                    className="rounded border border-border px-1.5 text-xs text-muted hover:text-foreground"
                  >
                    +
                  </button>
                  <button
                    onClick={() => removeCard(c.scryfallId)}
                    className="text-xs text-muted hover:text-down"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

<div className="card-frame mt-4 p-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Print at home — free
              </h3>
              <div className="flex flex-col gap-2 text-xs text-foreground">
                <label className="flex items-center justify-between gap-2">
                  Paper
                  <select
                    value={paper}
                    onChange={(e) => setPaper(e.target.value as PaperSize)}
                    className="rounded border border-border bg-surface px-2 py-1"
                  >
                    <option value="a4">A4</option>
                    <option value="letter">US Letter</option>
                  </select>
                </label>
                <label className="flex items-center justify-between gap-2">
                  Spacing
                  <select
                    value={spacing}
                    onChange={(e) => setSpacing(e.target.value as CardSpacing)}
                    className="rounded border border-border bg-surface px-2 py-1"
                  >
                    <option value="none">No gaps (fastest cutting)</option>
                    <option value="gap">2 mm gaps</option>
                  </select>
                </label>
              </div>
              <button
                onClick={downloadPdf}
                disabled={pdfBusy}
                className="mt-3 w-full rounded-lg bg-gold px-4 py-2.5 text-center text-sm font-semibold text-black hover:bg-gold-bright disabled:opacity-60"
              >
                {pdfBusy ? "Building PDF…" : "Download PDF"}
              </button>
              {pdfStatus && <p className="mt-2 text-[11px] text-muted" aria-live="polite">{pdfStatus}</p>}
              <p className="mt-2 text-[10px] text-muted/80">
                Real card size (63 × 88 mm), 9 per page, fits standard sleeves. Print at 100% and
                sleeve them in front of a real card for the best feel.
              </p>
            </div>

{SHOP_ENABLED ? (
              <>
                <div className="card-frame mt-4 p-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Pricing
              </h3>
              <label className="flex items-center gap-2 py-1 text-xs text-foreground">
                <input
                  type="radio"
                  checked={effectiveMode === "per-card"}
                  onChange={() => setPricingMode("per-card")}
                />
                Per card — {formatCents(PRICE_PER_CARD_CENTS)} each
              </label>
              <label
                className={`flex items-center gap-2 py-1 text-xs ${
                  bundleEligible ? "text-foreground" : "text-muted opacity-50"
                }`}
              >
                <input
                  type="radio"
                  checked={effectiveMode === "bundle"}
                  disabled={!bundleEligible}
                  onChange={() => setPricingMode("bundle")}
                />
                Whole deck bundle — {formatCents(DECK_BUNDLE_PRICE_CENTS)} flat (up to{" "}
                {DECK_BUNDLE_MAX_CARDS} cards)
              </label>
              <div className="mt-3 flex justify-between border-t border-border pt-2 text-sm font-bold">
                <span className="text-foreground">Total</span>
                <span className="text-gold-bright">{formatCents(totalCents)}</span>
              </div>
            </div>
                <Link
              href={`/proxies/checkout?mode=${effectiveMode}`}
              className="mt-2 block w-full rounded-lg border border-gold px-4 py-2.5 text-center text-sm font-semibold text-gold-bright hover:bg-gold hover:text-black"
            >
              Order Printed Proxies
            </Link>
              </>
            ) : (
              <p className="mt-4 rounded-md border border-border bg-surface px-3 py-2 text-[11px] text-muted">
                Printed &amp; shipped proxies are coming soon.
              </p>
            )}

            <button
              onClick={downloadProject}
              className="mt-3 w-full rounded-md border border-border px-4 py-2 text-sm text-foreground hover:border-gold"
            >
              Download Project (CSV)
            </button>
          </div>

          <div className="flex-1">
            <h2 className="mb-2 text-sm font-semibold text-gold-bright">
              Print Preview ({sheets.length} sheet{sheets.length !== 1 ? "s" : ""})
            </h2>
            <div className="flex flex-col gap-6">
              {sheets.map((sheet, i) => (
                <div key={i} className="card-frame p-4">
                  <p className="mb-2 text-xs text-muted">Sheet {i + 1}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {sheet.map((c, j) => (
                      <div key={`${c.scryfallId}-${j}`} className="flex flex-col gap-0.5">
                        <div
                          className="overflow-hidden rounded"
                          style={{ aspectRatio: "2.5 / 3.5" }}
                        >
                          {c.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={c.imageUrl}
                              alt={c.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-surface-raised text-[10px] text-muted">
                              {c.name}
                            </div>
                          )}
                        </div>
                        {c.artist && (
                          <p className="truncate text-center text-[8px] text-muted">
                            Art: {c.artist}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-muted">
              Card images via Scryfall. Art © respective artist; Magic: The Gathering is ©
              Wizards of the Coast. This site is unofficial and unaffiliated with Wizards of
              the Coast.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
