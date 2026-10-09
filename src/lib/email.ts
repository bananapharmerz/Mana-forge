// Sends the site's emails (password resets, welcome, contact-form alerts) through Resend's API.
//   RESEND_API_KEY="re_…"                          (Coolify → Environment Variables, runtime only)
//   EMAIL_FROM="Mana Forge <noreply@manaforgehub.com>"  (optional; the domain must be verified in Resend)
// Without a key nothing is sent and the site carries on (the action still succeeds), so a missing
// key never breaks sign-up or the contact form.

import { SITE } from "@/lib/site";

const key = () => process.env.RESEND_API_KEY?.trim() || "";
const from = () => process.env.EMAIL_FROM?.trim() || `${SITE.name} <noreply@${new URL(SITE.url).hostname}>`;
export const emailEnabled = () => key().length > 0;

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** A plain, readable email: logo line, a heading, the body, an optional button and a footer. */
export function emailHtml(opts: { heading: string; body: string; button?: { label: string; url: string }; footer?: string }): string {
  const btn = opts.button
    ? `<p style="margin:28px 0"><a href="${esc(opts.button.url)}" style="background:#e0b252;color:#16120a;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:8px;display:inline-block">${esc(opts.button.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f4f2ee;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1d1a24">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;padding:32px">
<tr><td>
<p style="margin:0 0 24px;font-weight:800;letter-spacing:.2em;color:#b8892e;font-size:13px">MANA FORGE</p>
<h1 style="margin:0 0 16px;font-size:22px">${esc(opts.heading)}</h1>
<div style="font-size:15px;line-height:1.6">${opts.body}</div>
${btn}
<p style="margin:32px 0 0;font-size:12px;color:#7a7488;line-height:1.5">${opts.footer ?? `You're getting this because of your account on <a href="${esc(SITE.url)}" style="color:#7a7488">${esc(new URL(SITE.url).hostname)}</a>.`}</p>
</td></tr></table></td></tr></table></body></html>`;
}

export async function sendEmail(msg: { to: string; subject: string; html: string; text: string; replyTo?: string; headers?: Record<string, string> }): Promise<boolean> {
  if (!emailEnabled()) {
    console.warn(`[email] RESEND_API_KEY isn't set, so this email wasn't sent: "${msg.subject}"`);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: from(), to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text, ...(msg.replyTo ? { reply_to: msg.replyTo } : {}), ...(msg.headers ? { headers: msg.headers } : {}) }),
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    if (!res.ok) {
      // Never log the key or the recipient; the status and Resend's message are enough to debug.
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      console.error(`[email] Resend refused "${msg.subject}": ${res.status} ${body?.message ?? ""}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[email] Sending "${msg.subject}" failed:`, e instanceof Error ? e.message : e);
    return false;
  }
}
