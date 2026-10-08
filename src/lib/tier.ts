export const FREE_TIER_DECK_LIMIT = 10;
export const PREMIUM_PRICE_CENTS = 999;

export function deckLimitFor(tier: string): number {
  return tier === "premium" ? Infinity : FREE_TIER_DECK_LIMIT;
}
