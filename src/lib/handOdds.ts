// Exact draw odds for a fresh shuffle, using the hypergeometric formula (no simulation, so the
// numbers are the same every time and cost nothing to work out in the browser).

// n choose k, built up as a running product so 99-card decks never overflow.
function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}

// Chance of exactly `hits` successes when drawing `draws` cards from a library of `size` cards
// that holds `successes` of the cards we care about.
export function exactly(size: number, successes: number, draws: number, hits: number): number {
  const total = choose(size, draws);
  if (!total) return 0;
  return (choose(successes, hits) * choose(size - successes, draws - hits)) / total;
}

// Chance of at least one success in `draws` cards.
export function atLeastOne(size: number, successes: number, draws: number): number {
  if (size <= 0 || draws <= 0 || successes <= 0) return 0;
  return 1 - exactly(size, successes, Math.min(draws, size), 0);
}

// Chance the opening hand holds between `min` and `max` lands (inclusive).
export function landsBetween(size: number, lands: number, min: number, max: number, hand = 7): number {
  let p = 0;
  for (let k = min; k <= max; k++) p += exactly(size, lands, Math.min(hand, size), k);
  return p;
}

// Cards seen by a given turn on the play: the opening 7, then one draw a turn from turn 2.
export const seenByTurnOnPlay = (turn: number) => 7 + Math.max(0, turn - 1);
