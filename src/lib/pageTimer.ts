// Step timings for slow server renders, written to the server log only.
//
// /commanders and the commander pages (/decks/[commander]) typically take 8-10s to answer, but
// timing their outside calls by hand (EDHREC ~0.6s, Scryfall searches 0.2-0.9s, card batches
// ~1.2s) doesn't add up to that. So each step is timed on the real server, and a render that
// takes this long or longer leaves one line in the log. Fix the step those lines point at.
// Nothing reaches the visitor, and no names, ids, search text or user data are logged.
const SLOW_RENDER_MS = 1500;

export function pageTimer(page: string) {
  const start = performance.now();
  let last = start;
  const steps: string[] = [];
  return {
    lap(step: string) {
      const now = performance.now();
      steps.push(`${step}=${Math.round(now - last)}ms`);
      last = now;
    },
    // For calls that run side by side: each one's own time, so the slow one stands out.
    async time<T>(step: string, p: Promise<T>): Promise<T> {
      const s = performance.now();
      try {
        return await p;
      } finally {
        steps.push(`${step}=${Math.round(performance.now() - s)}ms`);
      }
    },
    report(kind?: string) {
      const total = Math.round(performance.now() - start);
      if (total < SLOW_RENDER_MS) return;
      console.warn(`[${page}] slow: ${total}ms${kind ? ` (${kind})` : ""} ${steps.join(" ")}`);
    },
  };
}
