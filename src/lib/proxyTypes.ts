export interface ProxyCard {
  scryfallId: string;
  name: string;
  setName?: string;
  artist?: string;
  imageUrl?: string;
  quantity: number;
  isCustomArt?: boolean;
}

export const PRICE_PER_CARD_CENTS = 100;
export const DECK_BUNDLE_PRICE_CENTS = 3000;
export const DECK_BUNDLE_MAX_CARDS = 100;
export const CARDS_PER_SHEET = 9; // 3x3 grid on US Letter

export type PricingMode = "per-card" | "bundle";

export function proxyTotalCents(cardCount: number, mode: PricingMode): number {
  if (mode === "bundle") return DECK_BUNDLE_PRICE_CENTS;
  return cardCount * PRICE_PER_CARD_CENTS;
}
