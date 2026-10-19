import type { Instrumentation } from "next";

// Runs once when Mana Forge's server starts: keeps card prices fresh (src/lib/prices.ts).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startPriceTracker } = await import("./lib/prices");
    startPriceTracker();
    const { startBanSync } = await import("./lib/bans");
    startBanSync();
    // Submit the sitemap's evergreen + busiest pages to IndexNow once a day (no-op off a public
    // https host). New decks are pinged live on publish; this covers the landing pages too.
    const { startIndexNowDaily } = await import("./lib/indexnowDaily");
    startIndexNowDaily();
    // Build the full commander list for the sitemap in the background.
    const { commanderNames } = await import("./lib/commanderIndex");
    commanderNames();
  }
}

// Every server error is recorded for Nexus's Safety tab (src/lib/errorLog.ts).
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { logServerError } = await import("./lib/errorLog");
    await logServerError(err, request, context.routeType);
  }
};
