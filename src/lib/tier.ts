export const FREE_TIER_DECK_LIMIT = 10;
export const PREMIUM_PRICE_CENTS = 399; // the monthly plan (Nexus reads this number for its estimates)
// Premium is charged in euros (a German business). Shown as the final price: as a small business
// (Kleinunternehmer, § 19 UStG) no VAT is added.
export const PREMIUM_CURRENCY = "eur";
export const premiumPrice = () => `€${(PREMIUM_PRICE_CENTS / 100).toFixed(2)}`;

// Two ways to pay: monthly, or yearly at a discount.
export type PremiumPlan = "month" | "year";
export const PREMIUM_PLANS: Record<PremiumPlan, { cents: number; interval: "month" | "year"; label: string; per: string; note?: string }> = {
  month: { cents: PREMIUM_PRICE_CENTS, interval: "month", label: "Monthly", per: "/month" },
  year: { cents: 2900, interval: "year", label: "Yearly", per: "/year", note: "Save 39%" },
};
export const planPrice = (p: PremiumPlan) => `€${(PREMIUM_PLANS[p].cents / 100).toFixed(2).replace(/\.00$/, "")}`;
export const PREMIUM_VAT_NOTE = "Final price. No VAT is charged under § 19 UStG (small business).";

export function deckLimitFor(tier: string): number {
  return tier === "premium" ? Infinity : FREE_TIER_DECK_LIMIT;
}
