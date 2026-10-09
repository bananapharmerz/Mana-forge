import type { Deck } from "./deckTypes";

// A visitor without an account can build one deck. It is kept in this browser's localStorage
// (strictly necessary for the feature they asked for, so no consent banner is needed) until
// they sign up or log in and save it to their account.
const KEY = "mf-guest-deck";
export { GUEST_DECK_ID } from "./guestDeckId";

export function loadGuestDeck(): Deck | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Deck;
    return d && typeof d === "object" && Array.isArray(d.cards) ? d : null;
  } catch {
    return null;
  }
}

export function saveGuestDeck(deck: Deck) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...deck, updatedAt: new Date().toISOString() }));
  } catch {
    // Storage full or blocked: the deck still works for this visit.
  }
}

export function clearGuestDeck() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {}
}
