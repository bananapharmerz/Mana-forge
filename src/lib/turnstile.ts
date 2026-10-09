// Cloudflare Turnstile: an invisible "are you human" check on sign-up, sign-in and the contact form.
// Switched on by setting TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY on the server (Coolify →
// Environment Variables); without them nothing changes. Read at runtime, so no rebuild is needed.

export const turnstileSiteKey = () => process.env.TURNSTILE_SITE_KEY?.trim() || null;
const secret = () => process.env.TURNSTILE_SECRET_KEY?.trim() || "";
export const turnstileOn = () => !!turnstileSiteKey() && !!secret();

/** True when the visitor passed (or Turnstile isn't switched on). If Cloudflare can't be reached,
 *  let them through rather than lock real people out; the rate limits still apply. */
export async function humanCheck(token: unknown, ip?: string): Promise<boolean> {
  if (!turnstileOn()) return true;
  const t = typeof token === "string" ? token.slice(0, 2048) : "";
  if (!t) return false;
  try {
    const body = new URLSearchParams({ secret: secret(), response: t, ...(ip && ip !== "local" ? { remoteip: ip } : {}) });
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body, signal: AbortSignal.timeout(8000), cache: "no-store" });
    const j = (await r.json()) as { success?: boolean };
    return j.success === true;
  } catch {
    return true;
  }
}
