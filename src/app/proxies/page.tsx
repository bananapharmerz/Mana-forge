"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CardSearchBox from "@/components/CardSearchBox";
import PrintingPicker from "@/components/PrintingPicker";
import { useProxyProject } from "@/components/ProxyProjectProvider";
import {
  autocompleteCardNames,
  autocompleteTokenNames,
  cardBackImage,
  cardImageForPrint,
  cardArtist,
  type ScryfallCard,
} from "@/lib/scryfall";
import { getDeckProxyCards, getProxyAccess, type ProxyAccess } from "@/app/actions/proxyDecks";
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

function saveFile(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const PROXY_BACK_URL = "/proxy/manaforge-proxy-back.jpg";

type PreviewCard = { key: string; name: string; imageUrl?: string; artist?: string; flip?: boolean };

export default function ProxiesPage() {
  const { cards, addCard, addCards, updateQuantity, removeCard, totalCount } = useProxyProject();
  const [searchMode, setSearchMode] = useState<"cards" | "tokens">("cards");
  const [access, setAccess] = useState<ProxyAccess | null>(null);
  const [deckId, setDeckId] = useState("");
  const [deckTokens, setDeckTokens] = useState(true);
  const [deckStatus, setDeckStatus] = useState<string | null>(null);
  const [deckBusy, setDeckBusy] = useState(false);
  const [includeBacks, setIncludeBacks] = useState(true);
  // Card back for double-sided printing: our "PROXY" back by default, your own image, or none.
  const [backChoice, setBackChoice] = useState<"proxy" | "custom" | "none">("proxy");
  const [customBack, setCustomBack] = useState<string | null>(null);
  const [backError, setBackError] = useState<string | null>(null);
  const premium = access?.premium === true;
  const showFlips = premium && includeBacks;
  const cardBack =
    backChoice === "proxy"
      ? { url: PROXY_BACK_URL, custom: false }
      : backChoice === "custom" && customBack
        ? { url: customBack, custom: true }
        : null;

  function handleBackFile(file: File | undefined) {
    setBackError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) return setBackError("Please choose an image file.");
    if (file.size > 5 * 1024 * 1024) return setBackError("Image is too large — please use one under 5MB.");
    const reader = new FileReader();
    reader.onload = () => setCustomBack(reader.result as string);
    reader.readAsDataURL(file);
  }

  useEffect(() => {
    getProxyAccess()
      .then(setAccess)
      .catch(() => setAccess({ signedIn: false, premium: false, decks: [] }));
  }, []);

  async function addDeck() {
    if (!deckId || deckBusy) return;
    setDeckBusy(true);
    setDeckStatus(null);
    try {
      const res = await getDeckProxyCards(deckId);
      if (!res.ok) {
        setDeckStatus(res.error);
        return;
      }
      const list = deckTokens ? res.cards : res.cards.filter((c) => !c.isToken);
      addCards(list);
      const n = list.reduce((sum, c) => sum + c.quantity, 0);
      setDeckStatus(`Added ${n} card${n !== 1 ? "s" : ""} from ${res.name}.`);
    } catch {
      setDeckStatus("Couldn't load that deck. Try again.");
    } finally {
      setDeckBusy(false);
    }
  }
  const [pickerCardName, setPickerCardName] = useState<string | null>(null);
  const [pricingMode, setPricingMode] = useState<PricingMode>("per-card");
  const [paper, setPaper] = useState<PaperSize>("a4");
  const [spacing, setSpacing] = useState<CardSpacing>("none");
  const [pdfStatus, setPdfStatus] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  function readyNote(pages: number, failed: string[]) {
    const p = `${pages} page${pages !== 1 ? "s" : ""}`;
    return failed.length
      ? `${p}. ${failed.length} image${failed.length !== 1 ? "s" : ""} couldn't load and printed as a labelled blank: ${failed.slice(0, 3).join(", ")}${failed.length > 3 ? "…" : ""}`
      : `${p}. Print at 100% / "Actual size", not "Fit to page".`;
  }

  // Builds the real-size sheets, then either opens the printer window ("print") or saves the PDF.
  async function makeSheets(mode: "print" | "download") {
    if (pdfBusy || cards.length === 0) return;
    setPdfBusy(true);
    setPdfStatus("Loading card images…");
    try {
      const result = await buildProxyPdf(cards, {
        paper,
        spacing,
        includeBacks: showFlips,
        cardBack,
        onProgress: (done, total) => setPdfStatus(`Loading card images… ${done}/${total}`),
      });
      const blob = new Blob([result.bytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      if (mode === "download") {
        saveFile(url, `manaforge-proxies-${result.cards}-cards.pdf`);
        setPdfStatus(`PDF saved — ${readyNote(result.pages, result.failed)}`);
        return;
      }
      // Print from a hidden frame so the browser's print window opens right on this page. If the
      // browser won't print a PDF from a frame (some Safari versions), open it in a new tab instead.
      const frame = document.createElement("iframe");
      frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
      frame.src = url;
      frame.onload = () => {
        try {
          frame.contentWindow?.focus();
          frame.contentWindow?.print();
        } catch {
          window.open(url, "_blank", "noopener");
        }
        setTimeout(() => {
          frame.remove();
          URL.revokeObjectURL(url);
        }, 60_000);
      };
      document.body.appendChild(frame);
      setPdfStatus(`Opening the print window — ${readyNote(result.pages, result.failed)}`);
    } catch {
      setPdfStatus("Couldn't build the sheets. Check your connection and try again.");
    } finally {
      setPdfBusy(false);
    }
  }

  async function downloadImages() {
    if (pdfBusy || cards.length === 0) return;
    setPdfBusy(true);
    setPdfStatus("Loading card images…");
    try {
      const { buildProxyZip } = await import("@/lib/proxyZip");
      const result = await buildProxyZip(cards, {
        includeBacks: showFlips,
        cardBack,
        onProgress: (done, total) => setPdfStatus(`Loading card images… ${done}/${total}`),
      });
      saveFile(URL.createObjectURL(result.blob), "manaforge-proxy-images.zip");
      setPdfStatus(
        result.failed.length
          ? `ZIP saved with ${result.files} images. ${result.failed.length} couldn't load: ${result.failed.slice(0, 3).join(", ")}${result.failed.length > 3 ? "…" : ""}`
          : `ZIP saved with ${result.files} image${result.files !== 1 ? "s" : ""}. File names start with how many copies to print.`
      );
    } catch {
      setPdfStatus("Couldn't build the ZIP. Check your connection and try again.");
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
      backImageUrl: cardBackImage(card),
      isToken: (card.type_line ?? "").includes("Token"),
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

  // Mirrors what the PDF prints (src/lib/proxyPdf.ts): double-sided puts flip art or the card back
  // on each card's reverse; single-sided prints flip art as its own card after the front.
  const flat: { front: PreviewCard; reverse?: PreviewCard }[] = [];
  const backPreview: PreviewCard | undefined = cardBack ? { key: "card-back", name: "Card back", imageUrl: cardBack.url } : undefined;
  for (const c of cards) {
    const front: PreviewCard = { key: c.scryfallId, name: c.name, imageUrl: c.imageUrl, artist: c.artist };
    const flipCard: PreviewCard | undefined =
      showFlips && c.backImageUrl && !c.isCustomArt
        ? { key: `${c.scryfallId}:back`, name: `${c.name} (back)`, imageUrl: c.backImageUrl, artist: c.artist, flip: true }
        : undefined;
    for (let i = 0; i < c.quantity; i++) {
      if (backPreview) flat.push({ front, reverse: flipCard ?? backPreview });
      else {
        flat.push({ front });
        if (flipCard) flat.push({ front: flipCard });
      }
    }
  }
  const sheets: (typeof flat)[] = [];
  for (let i = 0; i < flat.length; i += CARDS_PER_SHEET) {
    sheets.push(flat.slice(i, i + CARDS_PER_SHEET));
  }
  // Reverse side of a sheet as printed: columns mirrored for a long-edge flip.
  const mirrored = (sheet: (typeof flat)) => {
    const out: (PreviewCard | null)[] = Array(CARDS_PER_SHEET).fill(null);
    sheet.forEach((pc, i) => {
      const row = Math.floor(i / 3);
      out[row * 3 + (2 - (i % 3))] = pc.reverse ?? null;
    });
    return out;
  };

  const bundleEligible = totalCount > 0 && totalCount <= DECK_BUNDLE_MAX_CARDS;
  const effectiveMode: PricingMode = bundleEligible ? pricingMode : "per-card";
  const totalCents = proxyTotalCents(totalCount, effectiveMode);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-foreground">Proxy Builder</h1>
      <p className="mt-1 text-muted">
        Playtest a card before you buy it. Pick the exact printing you want, preview the sheets,
        and print free real-size sheets with cut marks at home
        {SHOP_ENABLED ? " — or order printed proxies shipped to you" : ""}.
      </p>

      <div className="mt-6 flex max-w-xl flex-col gap-2 sm:flex-row sm:items-center">
        <div role="tablist" aria-label="Search for" className="flex shrink-0 rounded-md border border-border p-0.5 text-xs">
          {(["cards", "tokens"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={searchMode === m}
              onClick={() => setSearchMode(m)}
              className={`rounded px-3 py-1.5 font-semibold capitalize ${
                searchMode === m ? "bg-gold text-black" : "text-muted hover:text-foreground"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="flex-1">
          <CardSearchBox
            key={searchMode}
            placeholder={searchMode === "tokens" ? "Search for a token (Treasure, Zombie…)" : "Search for a card to add..."}
            fetchSuggestions={searchMode === "tokens" ? autocompleteTokenNames : autocompleteCardNames}
            onSelect={(name) => setPickerCardName(name)}
          />
        </div>
      </div>

      <div className="card-frame mt-4 max-w-xl p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Add a whole deck</h2>
          <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold-bright">
            Premium
          </span>
        </div>
        {access === null ? (
          <p className="mt-2 text-xs text-muted">Checking your account…</p>
        ) : premium ? (
          access.decks.length === 0 ? (
            <p className="mt-2 text-xs text-muted">
              You don&apos;t have any saved decks yet. <Link href="/deck-builder" className="text-gold-bright hover:underline">Build one</Link>.
            </p>
          ) : (
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                value={deckId}
                onChange={(e) => setDeckId(e.target.value)}
                className="flex-1 rounded border border-border bg-surface px-2 py-1.5 text-xs text-foreground"
              >
                <option value="">Choose one of your decks…</option>
                {access.decks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {d.commanderName}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1.5 text-xs text-foreground">
                <input type="checkbox" checked={deckTokens} onChange={(e) => setDeckTokens(e.target.checked)} />
                Include tokens
              </label>
              <button
                onClick={addDeck}
                disabled={!deckId || deckBusy}
                className="rounded-md bg-gold px-3 py-1.5 text-xs font-semibold text-black hover:bg-gold-bright disabled:opacity-50"
              >
                {deckBusy ? "Adding…" : "Add deck"}
              </button>
            </div>
          )
        ) : (
          <p className="mt-2 text-xs text-muted">
            Add every card in one of your saved decks with one click, and print the back faces of
            double-faced cards.{" "}
            <Link href={access.signedIn ? "/premium" : "/login?callbackUrl=/proxies"} className="font-semibold text-gold-bright hover:underline">
              {access.signedIn ? "Get Premium" : "Sign in"}
            </Link>
          </p>
        )}
        {deckStatus && <p className="mt-2 text-[11px] text-muted" aria-live="polite">{deckStatus}</p>}
      </div>

      {pickerCardName && (
        <PrintingPicker
          key={pickerCardName}
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
                Print at home
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
                <label
                  className={`flex items-center gap-1.5 ${premium ? "" : "opacity-50"}`}
                  title={premium ? undefined : "Premium feature"}
                >
                  <input
                    type="checkbox"
                    checked={premium && includeBacks}
                    disabled={!premium}
                    onChange={(e) => setIncludeBacks(e.target.checked)}
                  />
                  Print flip side of double-faced cards
                  {!premium && <span className="text-[10px] font-semibold uppercase text-gold-bright">Premium</span>}
                </label>
                <label className="flex items-center justify-between gap-2">
                  Card back
                  <select
                    value={backChoice}
                    onChange={(e) => setBackChoice(e.target.value as "proxy" | "custom" | "none")}
                    className="rounded border border-border bg-surface px-2 py-1"
                  >
                    <option value="proxy">Mana Forge proxy back</option>
                    <option value="custom">Upload my own</option>
                    <option value="none">None (single-sided)</option>
                  </select>
                </label>
                {backChoice !== "none" && (
                  <div className="flex items-center gap-3">
                    <div className="w-12 shrink-0 overflow-hidden rounded border border-border bg-surface-raised" style={{ aspectRatio: "2.5 / 3.5" }}>
                      {cardBack && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cardBack.url} alt="Card back" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="flex flex-col gap-1 text-[10px] text-muted">
                      {backChoice === "custom" && (
                        <input type="file" accept="image/*" onChange={(e) => handleBackFile(e.target.files?.[0])} className="text-[10px]" />
                      )}
                      {backError && <span className="text-down">{backError}</span>}
                      {backChoice === "custom" && !customBack ? (
                        <span>Choose an image for the back of every card.</span>
                      ) : (
                        <span>Prints on the reverse of every sheet. Print double-sided and flip on the long edge.{showFlips ? " Double-faced cards get their flip side there instead." : ""}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => makeSheets("print")}
                disabled={pdfBusy}
                className="mt-3 w-full rounded-lg bg-gold px-4 py-2.5 text-center text-sm font-semibold text-black hover:bg-gold-bright disabled:opacity-60"
              >
                {pdfBusy ? "Preparing…" : "Print"}
              </button>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={downloadImages}
                  disabled={pdfBusy}
                  className="flex-1 rounded-md border border-border px-2 py-1.5 text-[11px] text-foreground hover:border-gold disabled:opacity-60"
                >
                  Download card images (ZIP)
                </button>
                <button
                  onClick={() => makeSheets("download")}
                  disabled={pdfBusy}
                  className="rounded-md border border-border px-2 py-1.5 text-[11px] text-foreground hover:border-gold disabled:opacity-60"
                >
                  Save as PDF
                </button>
              </div>
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
              className="mt-3 text-[11px] text-muted underline-offset-2 hover:text-foreground hover:underline"
            >
              Export card list (CSV)
            </button>
          </div>

          <div className="flex-1">
            <h2 className="mb-2 text-sm font-semibold text-gold-bright">
              Print Preview ({sheets.length} sheet{sheets.length !== 1 ? "s" : ""})
            </h2>
            <div className="flex flex-col gap-6">
              {sheets.map((sheet, i) => (
                <div key={i} className="flex flex-col gap-3">
                  <PreviewSheet label={`Sheet ${i + 1}${cardBack ? " — front" : ""}`} cards={sheet.map((pc) => pc.front)} />
                  {cardBack && (
                    <PreviewSheet
                      label={`Sheet ${i + 1} — back (mirrored to line up when you flip the page)`}
                      cards={mirrored(sheet)}
                    />
                  )}
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

function PreviewSheet({ label, cards }: { label: string; cards: (PreviewCard | null)[] }) {
  return (
    <div className="card-frame p-4">
      <p className="mb-2 text-xs text-muted">{label}</p>
      <div className="grid grid-cols-3 gap-2">
        {cards.map((c, j) => (
          <div key={`${c?.key ?? "empty"}-${j}`} className="flex flex-col gap-0.5">
            <div className="overflow-hidden rounded" style={{ aspectRatio: "2.5 / 3.5" }}>
              {c?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.imageUrl} alt={c.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
              ) : c ? (
                <div className="flex h-full items-center justify-center bg-surface-raised text-[10px] text-muted">{c.name}</div>
              ) : (
                <div className="h-full w-full rounded border border-dashed border-border/50" />
              )}
            </div>
            {c?.flip ? (
              <p className="truncate text-center text-[8px] font-semibold text-gold-bright">Flip side</p>
            ) : c?.artist ? (
              <p className="truncate text-center text-[8px] text-muted">Art: {c.artist}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
