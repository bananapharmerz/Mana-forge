import type { Instrumentation } from "next";

// Runs once when Mana Forge's server starts: keeps card prices fresh (src/lib/prices.ts).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startPriceTracker } = await import("./lib/prices");
    startPriceTracker();
  }
}

// Every server error is recorded for Nexus's Safety tab (src/lib/errorLog.ts).
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { logServerError } = await import("./lib/errorLog");
    await logServerError(err, request, context.routeType);
  }
};
