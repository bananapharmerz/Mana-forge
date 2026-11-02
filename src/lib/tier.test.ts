// Guards the numbers Premium is sold on. If one of these fails after a change, either the change
// was a mistake or the Premium page, checkout and emails need to say the new number too.
// Run with `npm test` (Node's built-in test runner, no packages needed).
import { test } from "node:test";
import assert from "node:assert/strict";
import { FREE_PRICE_ALERTS, FREE_TIER_DECK_LIMIT, PREMIUM_PLANS, PREMIUM_PRICE_CENTS, TRIAL_DAYS, deckLimitFor, planPrice, premiumPrice } from "./tier.ts";

test("the yearly 'Save X%' note matches the real saving over twelve months", () => {
  const { month, year } = PREMIUM_PLANS;
  const saving = Math.round((1 - year.cents / (month.cents * 12)) * 100);
  assert.ok(year.note, "the yearly plan should carry a saving note");
  assert.equal(year.note, `Save ${saving}%`);
});

test("the yearly plan is cheaper than twelve months", () => {
  assert.ok(PREMIUM_PLANS.year.cents < PREMIUM_PLANS.month.cents * 12);
});

test("the monthly plan and the shown monthly price agree", () => {
  assert.equal(PREMIUM_PLANS.month.cents, PREMIUM_PRICE_CENTS);
  assert.equal(premiumPrice(), `€${(PREMIUM_PRICE_CENTS / 100).toFixed(2)}`);
  assert.equal(planPrice("month"), premiumPrice().replace(/\.00$/, ""));
  assert.equal(planPrice("year"), `€${(PREMIUM_PLANS.year.cents / 100).toFixed(2).replace(/\.00$/, "")}`);
});

test("plans bill on the interval they're named after", () => {
  assert.equal(PREMIUM_PLANS.month.interval, "month");
  assert.equal(PREMIUM_PLANS.year.interval, "year");
});

// These are promised in words on /premium, so a change here has to be a deliberate one.
test("free limits and the trial match what the Premium page promises", () => {
  assert.equal(TRIAL_DAYS, 7);
  assert.equal(FREE_PRICE_ALERTS, 3);
  assert.equal(FREE_TIER_DECK_LIMIT, 10);
});

test("deck limits: Premium is unlimited, everyone else gets the free limit", () => {
  assert.equal(deckLimitFor("premium"), Infinity);
  assert.equal(deckLimitFor("free"), FREE_TIER_DECK_LIMIT);
  assert.equal(deckLimitFor(""), FREE_TIER_DECK_LIMIT);
});
