import type { Instrumentation } from "next";

// Runs once when Mana Forge's server starts: keeps card prices fresh (src/lib/prices.ts).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startPriceTracker } = await import("./lib/prices");
    startPriceTracker();
    const { startBanSync } = await import("./lib/bans");
    startBanSync();
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
