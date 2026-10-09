"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import CardSearchBox from "@/components/CardSearchBox";
import DeckOptionsMenu from "@/components/DeckOptionsMenu";
import CardNameZoom from "@/components/CardNameZoom";
import PrintingPicker from "@/components/PrintingPicker";
import CardBackPicker from "@/components/CardBackPicker";
import BuyDeckPanel from "@/components/BuyDeckPanel";
import PartnerCardStack from "@/components/PartnerCardStack";
import DeckValuePanel from "@/components/DeckValuePanel";
import { useLivePrices } from "@/components/useLivePrices";
import { currentPrice, deckValue, signedPct, weekChange } from "@/lib/livePrice";
import {
  autocompleteCardNames,
  autocompleteTokenNames,
  getCardByName,
  cardImage,
  cardBackImage,
  cardPriceUsd,
  type ScryfallCard,
} from "@/lib/scryfall";
import {
  updateDeckCards,
  updateDeckName,
  updateDeckCardBack,
  updateDeckPartner,
  updateDeckCompanion,
  setDeckPublic,
} from "@/app/actions/decks";
import { hasSecondCommanderMechanic } from "@/lib/partnerMechanics";
import { saveGuestDeck } from "@/lib/guestDeck";
import GuestSaveBanner from "@/components/GuestSaveBanner";
import BudgetUpgradesPanel from "@/components/BudgetUpgradesPanel";
import {
  CATEGORY_ORDER,
  defaultCategory,
  deckSize,
  manaCurve,
  type Deck,
  type DeckCard,
} from "@/lib/deckTypes";

const BASIC_LANDS = ["Plains", "Island", "Swamp", "Mountain", "Forest", "Wastes"];

export default function DeckEditor({ initialDeck, guest = false }: { initialDeck: Deck; guest?: boolean }) {
  const [deck, setDeck] = useState<Deck>(initialDeck);
  // A guest deck lives only in this browser until the visitor signs up and saves it.
  useEffect(() => {
    if (guest) saveGuestDeck(deck);
  }, [guest, deck]);
  const [addError, setAddError] = useState<string | null>(null);
  const [pickerCardName, setPickerCardName] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState(initialDeck.name);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [publicBusy, setPublicBusy] = useState(false);
  const [tokensOnly, setTokensOnly] = useState(false);
  const [showPartnerSearch, setShowPartnerSearch] = useState(false);
  const [showCompanionSearch, setShowCompanionSearch] = useState(false);
  const [partnerBusy, setPartnerBusy] = useState(false);
  // Unlike Companion (any deck can carry one), a partner commander only makes sense if the
  // current commander actually has a second-commander mechanic — Partner, Partner with X,
  // Friends forever, Choose a Background, or Doctor's companion. Checked once per commander.
  const [commanderHasPartner, setCommanderHasPartner] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (!initialDeck.commander?.name) return;
    getCardByName(initialDeck.commander.name).then((card) => {
      if (cancelled || !card) return;
      setCommanderHasPartner(hasSecondCommanderMechanic(card));
    });
    return () => {
      cancelled = true;
    };
  }, [initialDeck.commander?.name]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSave = useRef(true);

  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!guest) await updateDeckCards(deck.id, deck.cards);
      setSaveState("saved");
    }, 600);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck.cards]);

  async function saveNow() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState("saving");
    if (!guest) await updateDeckCards(deck.id, deck.cards);
    setSaveState("saved");
  }

  function updateCards(cards: DeckCard[]) {
    setDeck((d) => ({ ...d, cards }));
  }

  // True if `name` can actually be added right now (handles the basic-land stacking rule and
  // the singleton-format duplicate check) — shared by the quick-add buttons and the search box
  // so neither one has to fetch Scryfall data just to find out the add would be rejected anyway.
  function tryStackOrReject(name: string): boolean {
    const isBasic = BASIC_LANDS.includes(name);
    const existing = deck.cards.find((c) => c.name === name);

    if (existing && isBasic) {
      updateCards(
        deck.cards.map((c) => (c.name === name ? { ...c, quantity: c.quantity + 1 } : c))
      );
      return true;
    }

    if (existing && !isBasic) {
      setAddError(`${name} is already in the deck (singleton format).`);
      return true;
    }

    return false;
  }

  async function addCard(name: string) {
    setAddError(null);
    if (tryStackOrReject(name)) return;

    const card = await getCardByName(name);
    if (!card) {
      setAddError(`Couldn't find "${name}" on Scryfall.`);
      return;
    }

    updateCards([...deck.cards, cardToDeckCard(card)]);
  }

  function cardToDeckCard(card: ScryfallCard, imageOverride?: string): DeckCard {
    return {
      name: card.name,
      scryfallId: card.id,
      imageUrl: imageOverride ?? cardImage(card),
      // A custom-art front doesn't have a matching custom back, so only flippable when using
      // the card's own real printing.
      backImageUrl: imageOverride ? undefined : cardBackImage(card),
      typeLine: card.type_line,
      manaCost: card.mana_cost,
      cmc: card.cmc,
      colorIdentity: card.color_identity,
      quantity: 1,
      category: defaultCategory(card.type_line),
      priceUsd: cardPriceUsd(card),
    };
  }

  async function addPartner(name: string) {
    setAddError(null);
    setPartnerBusy(true);
    const card = await getCardByName(name);
    setPartnerBusy(false);
    if (!card) {
      setAddError(`Couldn't find "${name}" on Scryfall.`);
      return;
    }
    const partner = cardToDeckCard(card);
    setDeck((d) => ({ ...d, partner, companion: undefined }));
    setShowPartnerSearch(false);
    if (!guest) await updateDeckPartner(deck.id, partner);
  }

  async function removePartner() {
    setDeck((d) => ({ ...d, partner: undefined }));
    if (!guest) await updateDeckPartner(deck.id, null);
  }

  async function addCompanion(name: string) {
    setAddError(null);
    setPartnerBusy(true);
    const card = await getCardByName(name);
    setPartnerBusy(false);
    if (!card) {
      setAddError(`Couldn't find "${name}" on Scryfall.`);
      return;
    }
    const companion = cardToDeckCard(card);
    setDeck((d) => ({ ...d, companion, partner: undefined }));
    setShowCompanionSearch(false);
    if (!guest) await updateDeckCompanion(deck.id, companion);
  }

  async function removeCompanion() {
    setDeck((d) => ({ ...d, companion: undefined }));
    if (!guest) await updateDeckCompanion(deck.id, null);
  }

  // Search box goes through the printing/art picker instead of adding the default printing
  // outright, so players can pick which set's art (or their own custom art) ends up in the deck.
  function searchSelectCard(name: string) {
    setAddError(null);
    if (tryStackOrReject(name)) return;
    setPickerCardName(name);
  }

  function handlePrintingSelected(card: ScryfallCard) {
    updateCards([...deck.cards, cardToDeckCard(card)]);
    setPickerCardName(null);
  }

  function handleCustomArtSelected(art: { imageUrl: string; artist?: string }) {
    if (!pickerCardName) return;
    const name = pickerCardName;
    setPickerCardName(null);
    getCardByName(name).then((card) => {
      if (!card) {
        setAddError(`Couldn't find "${name}" on Scryfall.`);
        return;
      }
      updateCards([...deck.cards, cardToDeckCard(card, art.imageUrl)]);
    });
  }

  function updateQuantity(name: string, delta: number) {
    const next = deck.cards
      .map((c) => (c.name === name ? { ...c, quantity: c.quantity + delta } : c))
      .filter((c) => c.quantity > 0);
    updateCards(next);
  }

  function removeCard(name: string) {
    updateCards(deck.cards.filter((c) => c.name !== name));
  }

  function updateCategory(name: string, category: string) {
    updateCards(deck.cards.map((c) => (c.name === name ? { ...c, category } : c)));
  }

  async function commitName() {
    const name = nameDraft.trim() || deck.name;
    setDeck((d) => ({ ...d, name }));
    if (!guest) await updateDeckName(deck.id, name);
  }

  async function changeCardBack(next: string) {
    setDeck((d) => ({ ...d, cardBackUrl: next }));
    if (!guest) await updateDeckCardBack(deck.id, next);
  }

  async function togglePublic() {
    setPublicBusy(true);
    const next = !deck.isPublic;
    await setDeckPublic(deck.id, next);
    setDeck((d) => ({ ...d, isPublic: next }));
    setPublicBusy(false);
  }

  const size = deckSize(deck);
  const live = useLivePrices(
    [deck.commander, deck.partner, deck.companion, ...deck.cards].flatMap((c) => (c?.scryfallId ? [c.scryfallId] : []))
  );
  const value = deckValue(deck, live);
  const curve = manaCurve(deck);
  const maxCurve = Math.max(1, ...curve.map((c) => c.count));

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    cards: deck.cards.filter((c) => c.category === cat),
  })).filter((g) => g.cards.length > 0);

  const usedCategories = Array.from(new Set(deck.cards.map((c) => c.category)));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between">
        <Link href="/deck-builder" className="text-xs text-muted underline hover:text-gold-bright">
          {guest ? "← Deck builder" : "← All decks"}
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">
            {saveState === "saving" ? "Saving..." : saveState === "saved" ? (guest ? "Saved in this browser" : "Saved") : ""}
          </span>
          <button
            onClick={saveNow}
            disabled={saveState === "saving"}
            className="rounded-md bg-gold px-3 py-1.5 text-xs font-semibold text-black hover:bg-gold-bright disabled:opacity-50"
          >
            Save Changes
          </button>
          <DeckOptionsMenu deck={deck} />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-6 lg:flex-row">
        <div className="w-full lg:w-64 shrink-0">
          {/* Partnered commanders share one stacked tile, like the commanders grid — hover the
              back card (or use the swap button) to bring the other forward. */}
          {deck.commander?.imageUrl && deck.partner?.imageUrl ? (
            <div className="card-frame relative aspect-[5/7] w-full overflow-hidden bg-surface-raised">
              <PartnerCardStack
                cardName={deck.commander.name}
                cardImg={deck.commander.imageUrl}
                partnerName={deck.partner.name}
                partnerImg={deck.partner.imageUrl}
                sizes="256px"
              />
            </div>
          ) : (
            deck.commander?.imageUrl && (
              <div className="card-frame overflow-hidden">
                <Image
                  src={deck.commander.imageUrl}
                  alt={deck.commander.name}
                  width={480}
                  height={670}
                  className="w-full"
                />
              </div>
            )
          )}
          <p className="mt-2 text-center text-sm font-medium text-gold-bright">
            {deck.commander?.name}
            {deck.partner && ` & ${deck.partner.name}`}
          </p>
          {deck.partner && (
            <p className="text-center">
              <button onClick={removePartner} className="text-[11px] text-muted underline hover:text-red-600">
                Remove partner
              </button>
            </p>
          )}

          {deck.companion?.imageUrl && (
            <div className="mt-2 card-frame overflow-hidden">
              <Image
                src={deck.companion.imageUrl}
                alt={deck.companion.name}
                width={480}
                height={670}
                className="w-full"
              />
            </div>
          )}
          {deck.companion && (
            <>
              <p className="mt-1 text-center text-xs font-medium text-gold-bright">
                Companion: {deck.companion.name}
              </p>
              <p className="text-center">
                <button
                  onClick={removeCompanion}
                  className="text-[11px] text-muted underline hover:text-red-600"
                >
                  Remove companion
                </button>
              </p>
            </>
          )}

          {!deck.partner && !deck.companion && (
            <div className="mt-2 flex flex-col gap-1">
              {/* Only shown when the commander itself has a second-commander mechanic
                  (Partner, Partner with X, Friends forever, Choose a Background, Doctor's
                  companion) — unlike Companion, which any deck can carry regardless of its
                  commander. */}
              {commanderHasPartner &&
                (showPartnerSearch ? (
                  <CardSearchBox
                    placeholder="Search for a partner commander..."
                    fetchSuggestions={autocompleteCardNames}
                    onSelect={addPartner}
                  />
                ) : (
                  <button
                    onClick={() => {
                      setShowCompanionSearch(false);
                      setShowPartnerSearch(true);
                    }}
                    className="w-full rounded-md border border-dashed border-border px-3 py-1.5 text-xs text-muted hover:border-gold hover:text-foreground"
                  >
                    + Partner Commander
                  </button>
                ))}
              {showCompanionSearch ? (
                <CardSearchBox
                  placeholder="Search for a companion..."
                  fetchSuggestions={autocompleteCardNames}
                  onSelect={addCompanion}
                />
              ) : (
                <button
                  onClick={() => {
                    setShowPartnerSearch(false);
                    setShowCompanionSearch(true);
                  }}
                  className="w-full rounded-md border border-dashed border-border px-3 py-1.5 text-xs text-muted hover:border-gold hover:text-foreground"
                >
                  + Companion
                </button>
              )}
              {partnerBusy && <p className="text-center text-[11px] text-muted">Adding...</p>}
            </div>
          )}

          {guest ? (
            <GuestSaveBanner />
          ) : (
          <button
            onClick={togglePublic}
            disabled={publicBusy}
            className={`mt-3 w-full rounded-md border px-3 py-2 text-xs font-semibold ${
              deck.isPublic
                ? "border-gold bg-gold text-black"
                : "border-border text-muted hover:border-gold hover:text-foreground"
            } disabled:opacity-50`}
          >
            {deck.isPublic ? "Public — visible on commander page" : "Make Public"}
          </button>
          )}

          <div className="card-frame mt-6 p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Mana Curve
            </h3>
            <div className="flex gap-1">
              {curve.map((b) => (
                <div key={b.cmc} className="flex flex-1 flex-col items-center gap-1">
                  <div className="relative h-20 w-full">
                    <div
                      className="absolute bottom-0 w-full rounded-t bg-gold"
                      style={{ height: `${(b.count / maxCurve) * 100}%`, minHeight: b.count > 0 ? 4 : 0 }}
                    />
                  </div>
                  <span className="text-[10px] text-muted">{b.cmc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card-frame mt-4 p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{size}/100</p>
            <p className="text-xs text-muted">cards in deck</p>
          </div>

          <DeckValuePanel value={value} />

          <BudgetUpgradesPanel deckId={deck.id} guest={guest} onAdd={addCard} />

          <div className="mt-4">
            <CardBackPicker value={deck.cardBackUrl} onChange={changeCardBack} />
          </div>

          <BuyDeckPanel deck={deck} />
        </div>

        <div className="flex-1">
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitName}
            className="w-full border-b border-border bg-transparent pb-1 text-2xl font-bold text-foreground focus:border-gold focus:outline-none"
          />

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <div className="flex-1">
              <CardSearchBox
                key={tokensOnly ? "tokens" : "all"}
                placeholder={tokensOnly ? "Search for a token to add..." : "Search for a card to add..."}
                fetchSuggestions={tokensOnly ? autocompleteTokenNames : autocompleteCardNames}
                onSelect={searchSelectCard}
              />
              <label className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
                <input
                  type="checkbox"
                  checked={tokensOnly}
                  onChange={(e) => setTokensOnly(e.target.checked)}
                  className="h-3 w-3"
                />
                Tokens only
              </label>
              {pickerCardName && (
                <PrintingPicker
                  cardName={pickerCardName}
                  onSelect={handlePrintingSelected}
                  onSelectCustom={handleCustomArtSelected}
                  onClose={() => setPickerCardName(null)}
                />
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {BASIC_LANDS.map((land) => (
                <button
                  key={land}
                  onClick={() => addCard(land)}
                  className="rounded-md border border-border px-2.5 py-1.5 text-xs text-muted hover:border-gold hover:text-foreground"
                >
                  +{land}
                </button>
              ))}
            </div>
          </div>
          {addError && <p className="mt-2 text-sm text-red-600">{addError}</p>}

          <div className="mt-8 flex flex-col gap-6">
            {grouped.length === 0 && (
              <p className="text-sm text-muted">No cards yet — search above to add some.</p>
            )}
            {grouped.map((group) => (
              <div key={group.category}>
                <h3 className="mb-2 text-sm font-semibold text-gold-bright">
                  {group.category} ({group.cards.reduce((s, c) => s + c.quantity, 0)})
                </h3>
                <div className="flex flex-col gap-1">
                  {group.cards.map((c) => (
                    <div
                      key={c.name}
                      className="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2"
                    >
                      <span className="w-6 text-right text-xs text-muted">{c.quantity}x</span>
                      <CardNameZoom name={c.name} imageUrl={c.imageUrl} />
                      <span className="hidden text-xs text-muted sm:block">{c.manaCost}</span>
                      <CardPriceCell price={currentPrice(c, live)} quantity={c.quantity} change={weekChange(c, live)} />
                      <select
                        value={c.category}
                        onChange={(e) => updateCategory(c.name, e.target.value)}
                        className="rounded-md border border-border bg-surface-raised px-2 py-1 text-xs text-foreground"
                      >
                        {Array.from(new Set([...CATEGORY_ORDER, ...usedCategories])).map(
                          (cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          )
                        )}
                      </select>
                      {BASIC_LANDS.includes(c.name) && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(c.name, -1)}
                            className="rounded border border-border px-1.5 text-xs text-muted hover:text-foreground"
                          >
                            −
                          </button>
                          <button
                            onClick={() => updateQuantity(c.name, 1)}
                            className="rounded border border-border px-1.5 text-xs text-muted hover:text-foreground"
                          >
                            +
                          </button>
                        </div>
                      )}
                      <button
                        onClick={() => removeCard(c.name)}
                        className="text-xs text-muted hover:text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// A card's price in the list, with a small arrow when it moved 5% or more this week.
function CardPriceCell({ price, quantity, change }: { price: number | null; quantity: number; change: { change: number; pct: number } | null }) {
  const big = change && Math.abs(change.pct) >= 0.05 && Math.abs(change.change) >= 0.1;
  return (
    <span className="flex w-24 shrink-0 items-center justify-end gap-1 text-right text-xs text-muted" title={change ? `${signedPct(change.pct)} this week` : undefined}>
      {big && <span className={change!.change > 0 ? "text-emerald-600" : "text-red-600"}>{change!.change > 0 ? "▲" : "▼"}</span>}
      {price === null ? "—" : `$${(price * quantity).toFixed(2)}`}
    </span>
  );
}
