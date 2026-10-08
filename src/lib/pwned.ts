// Checks a password against Have I Been Pwned's list of passwords leaked in real data breaches.
// Uses their k-anonymity range API: only the first 5 characters of the password's SHA-1 hash leave
// the server, so neither HIBP nor anyone watching ever sees the password (or even its full hash).
// Free, no API key. If the service is slow or down we let the signup through rather than block it.

import { createHash } from "node:crypto";

const API = process.env.HIBP_API_URL || "https://api.pwnedpasswords.com"; // override only for testing

/** How many times this password appears in known breaches (0 = not found, null = couldn't check). */
export async function breachCount(password: string): Promise<number | null> {
  const hash = createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);
  try {
    const res = await fetch(`${API}/range/${prefix}`, {
      headers: { "Add-Padding": "true", "User-Agent": "ManaForge-signup-check" },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    for (const line of (await res.text()).split("\n")) {
      const [s, n] = line.trim().split(":");
      if (s === suffix) return Number(n) || 0; // padding rows have a count of 0
    }
    return 0;
  } catch {
    return null;
  }
}
