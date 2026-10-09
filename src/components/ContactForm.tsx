"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Turnstile from "@/components/Turnstile";
import { sendContactMessage } from "@/app/actions/contact";

const TOPICS = [
  { value: "general", label: "General question" },
  { value: "bug", label: "Something isn't working" },
  { value: "account", label: "My account" },
  { value: "premium", label: "Premium or payments" },
  { value: "legal", label: "Legal, copyright or privacy" },
];

const field = "rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground";

export default function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", topic: "general", message: "", website: "" });
  // Keep the draft if they go back, reload or switch tabs (this tab only; cleared once sent).
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const d = JSON.parse(sessionStorage.getItem("mf-contact-draft") ?? "null");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring a saved draft once, after mount
      if (d && typeof d === "object") setForm((f) => ({ ...f, ...d, website: "" }));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      if (form.name || form.email || form.message) sessionStorage.setItem("mf-contact-draft", JSON.stringify({ name: form.name, email: form.email, topic: form.topic, message: form.message }));
    } catch {}
  }, [form.name, form.email, form.topic, form.message]);
  const [busy, setBusy] = useState(false);
  const [human, setHuman] = useState("");
  const [humanReset, setHumanReset] = useState(0);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  if (sent) {
    return (
      <div className="card-frame mt-8 p-5">
        <p className="text-sm font-semibold text-foreground">Thanks, your message is on its way.</p>
        <p className="mt-2 text-sm text-muted">We&apos;ll reply to {form.email.trim()} as soon as we can.</p>
        <Link href="/" className="mt-4 inline-block text-sm text-gold-bright underline">Back to the site</Link>
      </div>
    );
  }

  return (
    <form
      className="card-frame mt-8 flex flex-col gap-3 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const r = await sendContactMessage({ ...form, human });
        setBusy(false);
        if (r.ok) {
          setSent(true);
          try {
            sessionStorage.removeItem("mf-contact-draft");
          } catch {}
        }
        else {
          setHumanReset((n) => n + 1);
          setError(r.error);
        }
      }}
    >
      <label className="text-xs text-muted" htmlFor="contact-name">Name (optional)</label>
      <input id="contact-name" value={form.name} onChange={set("name")} maxLength={100} autoComplete="name" className={field} />

      <label className="text-xs text-muted" htmlFor="contact-email">Your email</label>
      <input id="contact-email" type="email" required value={form.email} onChange={set("email")} maxLength={254} autoComplete="email" className={field} />

      <label className="text-xs text-muted" htmlFor="contact-topic">What&apos;s it about?</label>
      <select id="contact-topic" value={form.topic} onChange={set("topic")} className={field}>
        {TOPICS.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      <label className="text-xs text-muted" htmlFor="contact-message">Message</label>
      <textarea id="contact-message" required rows={6} minLength={10} maxLength={4000} value={form.message} onChange={set("message")} className={field} />

      {/* Hidden from people; bots that fill it in are ignored. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="contact-website">Website</label>
        <input id="contact-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
      </div>

      <p className="text-xs text-muted">
        We use your email and message only to answer you. See our{" "}
        <Link href="/legal/privacy" className="underline hover:text-gold-bright">Privacy policy</Link>.
      </p>
      <Turnstile onToken={setHuman} resetKey={humanReset} />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-gold px-6 py-3 text-sm font-semibold text-black hover:bg-gold-bright disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
