"use client";

import Ember from "@/components/Ember";
import type React from "react";
import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TrialNudge from "@/components/TrialNudge";
import CardSearchBox from "@/components/CardSearchBox";
import AdSlot from "@/components/AdSlot";
import PageHeader from "@/components/PageHeader";
import { autocompleteCommanderNames, getCardByName, cardImage, cardPriceUsd } from "@/lib/scryfall";
import { createDeck, deleteDeckAction, duplicateDeck } from "@/app/actions/decks";
import { trackGoal } from "@/components/SiteTracker";
import { defaultCategory, deckSize, type Deck, type DeckCard } from "@/lib/deckTypes";
import { GUEST_DECK_ID, loadGuestDeck, saveGuestDeck } from "@/lib/guestDeck";
import GuestSaveBanner from "@/components/GuestSaveBanner";

const noopSubscribe = () => () => {};

// Well-loved commanders across all five colours, for starting a deck in one click.
const STARTER_COMMANDERS = [
  "Atraxa, Praetors' Voice",
  "Edgar Markov",
  "The Ur-Dragon",
  "Krenko, Mob Boss",
  "Lathril, Blade of the Elves",
  "Talrand, Sky Summoner",
];

// The popular-commander picker shown to guests and to new members with no decks yet.
function StartGrid() {
  return (
    <section aria-label="Start from a popular commander">
            <h2 className="font-display text-2xl font-semibold text-foreground">Start from a popular commander</h2>
            <p className="mt-1 text-sm text-muted">Pick one to start a deck with it, or use New deck to search any commander.</p>
            <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
              {STARTER_COMMANDERS.map((name) => (
                <li key={name}>
                  <a href={`/deck-builder?commander=${encodeURIComponent(name)}`} className="group block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}&format=image&version=normal`}
                      alt={name}
                      loading="lazy"
                      className="aspect-[5/7] w-full rounded-[4.5%] shadow-sm transition-transform group-hover:-translate-y-1"
                    />
                    <span className="mt-2 block text-xs font-medium text-foreground group-hover:text-gold-bright">{name}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
  );
}

export default function DeckBuilderIndexClient({
  initialDecks,
  deckLimit,
  tier,
  guest = false,
  starter,
}: {
  initialDecks: Deck[];
  deckLimit: number | null;
  tier: string;
  guest?: boolean;
  starter?: React.ReactNode; // "copy a ready-made deck", rendered on the server (new members only)
}) {
  const router = useRouter();
  const [decks, setDecks] = useState(initialDecks);
  // Arriving with ?commander=… opens the new-deck form with that commander filled in.
  const urlCommander = useSyncExternalStore(
    noopSubscribe,
    () => new URLSearchParams(window.location.search).get("commander"),
    () => null
  );
  const [showNewChoice, setShowNew] = useState<boolean | null>(null);
  const showNew = showNewChoice ?? !!urlCommander;
  const [deckName, setDeckName] = useState("");
  const [commanderChoice, setCommanderName] = useState<string | null>(null);
  const commanderName = commanderChoice ?? urlCommander ?? "";
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const atLimit = deckLimit !== null && decks.length >= deckLimit;
  // A deck built before signing up, still waiting in this browser.
  const draft = useSyncExternalStore(noopSubscribe, () => guestDraftKey(), () => "");
  const draftDeck = draft ? loadGuestDeck() : null;


  async function handleCreate() {
    if (!commanderName) {
      setError("Pick a commander first.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const card = await getCardByName(commanderName);
      if (!card) {
        setError("Couldn't find that commander on Scryfall.");
        return;
      }
      const commander: DeckCard = {
          name: card.name,
          scryfallId: card.id,
          imageUrl: cardImage(card),
          typeLine: card.type_line,
          manaCost: card.mana_cost,
          cmc: card.cmc,
          colorIdentity: card.color_identity,
          quantity: 1,
          category: defaultCategory(card.type_line),
          priceUsd: cardPriceUsd(card),
      };
      if (guest) {
        if (draftDeck && !window.confirm("Start a new deck? Your current guest draft will be replaced.")) return;
        const now = new Date().toISOString();
        saveGuestDeck({
          id: GUEST_DECK_ID,
          name: deckName.trim() || `${card.name} Commander Deck`,
          commander,
          cards: [],
          cardBackUrl: null,
          isPublic: false,
          createdAt: now,
          updatedAt: now,
        });
        router.push(`/deck-builder/${GUEST_DECK_ID}`);
        return;
      }
      const result = await createDeck(commander, deckName);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      trackGoal("deck");
      router.push(`/deck-builder/${result.id}`);
    } finally {
      setCreating(false);
    }
  }

  // Delete takes two taps (the second within 4s), then the deck goes from the list at once and
  // comes back with a message if the server says no.
  const [armed, setArmed] = useState<string | null>(null);
  const [copying, setCopying] = useState<string | null>(null);
  async function handleDelete(id: string) {
    if (armed !== id) {
      setArmed(id);
      setTimeout(() => setArmed((a) => (a === id ? null : a)), 4000);
      return;
    }
    setArmed(null);
    setError(null);
    const before = decks;
    setDecks((prev) => prev.filter((d) => d.id !== id));
    try {
      await deleteDeckAction(id);
      router.refresh();
    } catch {
      setDecks(before);
      setError("Couldn't delete that deck. Check your connection and try again.");
    }
  }

  async function handleCopy(id: string) {
    if (copying) return;
    setError(null);
    setCopying(id);
    try {
      const result = await duplicateDeck(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/deck-builder/${result.id}`);
    } catch {
      setError("Couldn't copy that deck. Check your connection and try again.");
    } finally {
      setCopying(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Deck builder"
        description={
          guest
            ? "Pick a commander and start adding cards. No account needed; sign up any time to keep the deck."
            : deckLimit !== null
            ? `${decks.length} of ${deckLimit} decks used on your ${tier} account.`
            : `${decks.length} decks on your ${tier} account.`
        }
        width="max-w-5xl"
      >
        <button
          onClick={() => setShowNew((s) => !s)}
          disabled={atLimit}
          className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-black hover:bg-[#d4a23e] disabled:cursor-not-allowed disabled:opacity-50"
        >
          New deck
        </button>
      </PageHeader>
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="empty:hidden mb-8">
        <AdSlot tier={tier} />
      </div>

      {!guest && deckLimit !== null && decks.length >= deckLimit - 2 && (
        <div className="mb-8">
          <TrialNudge>
            {atLimit
              ? `You've used all ${deckLimit} free deck slots. Premium gives you unlimited decks, price alerts and budget upgrade picks.`
              : `${deckLimit - decks.length} free deck slot${deckLimit - decks.length === 1 ? "" : "s"} left. Premium gives you unlimited decks.`}
          </TrialNudge>
        </div>
      )}

      {showNew && !atLimit && (
        <div className="card-frame mb-8 flex flex-col gap-3 p-5">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">
            Deck name (optional)
          </label>
          <input
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            placeholder="My Deck"
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-gold focus:outline-none"
          />
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">
            Commander
          </label>
          <CardSearchBox
            placeholder="Search for a commander..."
            fetchSuggestions={autocompleteCommanderNames}
            onSelect={(name) => setCommanderName(name)}
            clearOnSelect={false}
          />
          {commanderName && (
            <p className="text-sm text-gold-bright">Selected: {commanderName}</p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            onClick={handleCreate}
            disabled={creating}
            className="mt-2 w-fit rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold-bright disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create Deck"}
          </button>
        </div>
      )}

      {draftDeck && (
        <div className="card-frame mb-8 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-bright">Unsaved draft</p>
            <Link href={`/deck-builder/${GUEST_DECK_ID}`} className="font-semibold text-foreground hover:text-gold-bright">
              {draftDeck.name}
            </Link>
            <p className="text-xs text-muted">
              {draftDeck.commander?.name} · {deckSize(draftDeck)} / 100 cards
            </p>
            <Link
              href={`/deck-builder/${GUEST_DECK_ID}`}
              className="mt-2 inline-block rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:border-gold"
            >
              Keep building
            </Link>
          </div>
          <div className="sm:w-72">
            <GuestSaveBanner compact />
          </div>
        </div>
      )}

      {guest ? (
        !draftDeck && (
          <StartGrid />
        )
      ) : decks.length === 0 ? (
        // A brand-new member: a real starting point instead of an empty page.
        <section aria-label="Build your first deck" className="space-y-10">
          <div className="card-frame relative overflow-hidden p-5 sm:p-6 sm:pr-48">
            {/* Ember greets new members (the mascot turns up in the same spots across the site). */}
            <Ember mood="hyped" size={150} className="pointer-events-none absolute -bottom-3 right-4 hidden sm:block" title="Ember, cheering you on" />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-bright">Welcome to Mana Forge</p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-foreground sm:text-3xl">Let&apos;s build your first deck</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Tap a popular commander below to start a deck with it, or search for any commander. While you build, you&apos;ll see the cards other players run with it.
            </p>
            <button
              type="button"
              data-track="onboarding: search any commander"
              onClick={() => {
                setShowNew(true);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="mt-4 rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-black hover:bg-gold-bright"
            >
              Search any commander
            </button>
          </div>
          <StartGrid />
          {starter}
        </section>
      ) : (
        <>
          {error && !showNew && <p className="mb-4 text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {decks.map((deck) => (
              <div key={deck.id} className="card-frame flex flex-col gap-2 p-4">
                <Link href={`/deck-builder/${deck.id}`} className="hover:text-gold-bright">
                  <h2 className="font-semibold text-foreground">{deck.name}</h2>
                </Link>
                <p className="text-xs text-muted">{deck.commander?.name ?? "No commander"}</p>
                <p className="text-xs text-muted">
                  {deckSize(deck)} / 100 cards {deck.isPublic && "· Public"}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link
                    href={`/deck-builder/${deck.id}`}
                    className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:border-gold"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleCopy(deck.id)}
                    disabled={copying !== null}
                    className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:border-gold disabled:opacity-50"
                  >
                    {copying === deck.id ? "Copying…" : "Copy Deck"}
                  </button>
                  <button
                    onClick={() => handleDelete(deck.id)}
                    aria-live="polite"
                    className={`rounded-md border px-3 py-1.5 text-xs ${armed === deck.id ? "border-red-600 bg-red-600 text-white" : "border-border text-muted hover:border-red-600 hover:text-red-600"}`}
                  >
                    {armed === deck.id ? "Tap again to delete" : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
    </>
  );
}

function guestDraftKey(): string {
  const d = loadGuestDeck();
  return d ? `${d.updatedAt}|${d.cards.length}` : "";
}
