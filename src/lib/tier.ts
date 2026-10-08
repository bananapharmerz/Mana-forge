export const FREE_TIER_DECK_LIMIT = 10;
export const PREMIUM_PRICE_CENTS = 999;
// Premium is charged in euros (a German business). Shown as the final price: as a small business
// (Kleinunternehmer, § 19 UStG) no VAT is added.
export const PREMIUM_CURRENCY = "eur";
export const premiumPrice = () => `€${(PREMIUM_PRICE_CENTS / 100).toFixed(2)}`;
export const PREMIUM_VAT_NOTE = "Final price. No VAT is charged under § 19 UStG (small business).";

export function deckLimitFor(tier: string): number {
  return tier === "premium" ? Infinity : FREE_TIER_DECK_LIMIT;
}
