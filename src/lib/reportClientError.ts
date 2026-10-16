// Tells the server when a page crashes in the visitor's browser, so a crash that only happens
// there (say, checkout on Safari) shows up in Nexus's Repair Yard like a server error does.
// Sends only: the error's digest, the page path (no query string), the first 300 characters of
// the message with emails and long token-like strings masked, and the browser family. No user
// id, no full user agent, nothing stored in the browser.

const BROWSERS: [RegExp, string][] = [
  [/SamsungBrowser/i, "Samsung"],
  [/OPR\/|Opera/i, "Opera"],
  [/Edg\//i, "Edge"],
  [/Firefox\/|FxiOS/i, "Firefox"],
  [/Chrome\/|CriOS/i, "Chrome"],
  [/Safari\//i, "Safari"],
];

function browserFamily(): string {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  return BROWSERS.find(([test]) => test.test(ua))?.[1] ?? "Other";
}

export function maskMessage(message: string): string {
  return message
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "[email]")
    .replace(/[A-Za-z0-9_\-]{24,}/g, "[token]")
    .slice(0, 300);
}

// One report per error object: React can render the error page more than once.
const sent = new WeakSet<object>();

export function reportClientError(error: Error & { digest?: string }) {
  try {
    if (typeof window === "undefined" || sent.has(error)) return;
    // An error with a digest came from the server, which has already logged it (instrumentation.ts).
    if (error.digest) return;
    sent.add(error);
    const body = JSON.stringify({
      d: error.digest ?? "",
      p: window.location.pathname,
      m: maskMessage(String(error.message || error.name || "Unknown error")),
      b: browserFamily(),
    });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/client-error", new Blob([body], { type: "text/plain" }));
    else void fetch("/api/client-error", { method: "POST", body, keepalive: true, headers: { "Content-Type": "text/plain" } });
  } catch {
    // Reporting a crash must never cause another one.
  }
}
