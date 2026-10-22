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
  year: { cents: 2999, interval: "year", label: "Yearly", per: "/year", note: "Save 37%" },
};
export const planPrice = (p: PremiumPlan) => `€${(PREMIUM_PLANS[p].cents / 100).toFixed(2).replace(/\.00$/, "")}`;
// First-time subscribers get a free trial. Stripe takes the card at checkout and charges only when
// the trial ends; cancelling before then costs nothing.
export const TRIAL_DAYS = 7;
export const PREMIUM_VAT_NOTE = "Final price. No VAT is charged under § 19 UStG (small business).";

// Free members get a taste of price alerts: an email when one of their first few watchlist targets
// is hit. Premium gets every target plus the weekly "big moves in your decks" digest.
export const FREE_PRICE_ALERTS = 3;

export function deckLimitFor(tier: string): number {
  return tier === "premium" ? Infinity : FREE_TIER_DECK_LIMIT;
}

// Open Packs: how many virtual booster packs you can rip per day, by tier. Guests can rip without
// an account (nothing saved); an account saves pulls to your collection and raises the daily limit.
export const GUEST_PACK_RIPS = 1;
export const FREE_PACK_RIPS = 3;
export const PREMIUM_PACK_RIPS = 5;
// Premium: one full booster box (36 packs) a week, on top of the daily packs. Pulls save to the
// collection like any other rip.
export const BOX_PACKS = 36;

export function packRipLimitFor(tier: string): number {
  if (tier === "premium") return PREMIUM_PACK_RIPS;
  if (tier === "guest") return GUEST_PACK_RIPS;
  return FREE_PACK_RIPS;
}
