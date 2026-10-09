"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/password";

const field = "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-gold focus:outline-none";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  return (
    <div className="forge-band relative flex min-h-[calc(100vh-9rem)] items-start justify-center px-4 py-14 sm:items-center">
      <div className="relative w-full max-w-sm rounded-2xl border border-[#3a2f1c] bg-surface px-6 py-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] sm:px-8">
      <h1 className="font-display text-3xl font-semibold text-foreground">Forgot your password?</h1>
      {sent ? (
        <div className="mt-6 text-sm text-muted">
          <p className="text-foreground">Check your inbox.</p>
          <p className="mt-2">
            If <span className="text-foreground">{email.trim()}</span> has an account, we&apos;ve sent it a link to choose a new
            password. The link works once and expires in an hour. Nothing there? Check your spam folder.
          </p>
          <Link href="/login" className="mt-6 inline-block text-gold-bright underline">Back to sign in</Link>
        </div>
      ) : (
        <form
          className="mt-6 flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            const r = await requestPasswordReset(email);
            setBusy(false);
            if (r.ok) setSent(true);
            else setError(r.error);
          }}
        >
          <p className="text-sm text-muted">Enter your account&apos;s email and we&apos;ll send you a link to choose a new password.</p>
          <div>
            <label htmlFor="fp-email" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Email</label>
            <input id="fp-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={busy} className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold-bright disabled:opacity-50">
            {busy ? "Sending…" : "Send reset link"}
          </button>
          <Link href="/login" className="text-sm text-muted underline hover:text-gold-bright">Back to sign in</Link>
        </form>
      )}
      </div>
    </div>
  );
}
