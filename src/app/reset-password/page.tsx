"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { resetPassword } from "@/app/actions/password";

const field = "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-gold focus:outline-none";

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [pass, setPass] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="mt-6 text-sm text-muted">
        <p className="text-foreground">Your password has been changed.</p>
        <p className="mt-2">For safety, every device that was signed in has been signed out.</p>
        <Link href="/login" className="mt-6 inline-block rounded-lg bg-gold px-4 py-2 font-semibold text-black hover:bg-gold-bright">Sign in</Link>
      </div>
    );
  }
  if (!token) {
    return (
      <p className="mt-6 text-sm text-muted">
        This page needs the link from your reset email. <Link href="/forgot-password" className="text-gold-bright underline">Ask for a new link</Link>.
      </p>
    );
  }
  return (
    <form
      className="mt-6 flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (pass !== again) return setError("The two passwords don't match.");
        setBusy(true);
        setError(null);
        const r = await resetPassword(token, pass);
        setBusy(false);
        if (r.ok) setDone(true);
        else setError(r.error);
      }}
    >
      <p className="text-sm text-muted">At least 8 characters, with a letter and a number.</p>
      <div>
        <label htmlFor="rp-pass" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">New password</label>
        <input id="rp-pass" type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} className={field} />
      </div>
      <div>
        <label htmlFor="rp-again" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Type it again</label>
        <input id="rp-again" type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} className={field} />
      </div>
      {error && (
        <p className="text-sm text-red-600">
          {error} {error.includes("new one") && <Link href="/forgot-password" className="underline">Get a new link</Link>}
        </p>
      )}
      <button type="submit" disabled={busy} className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold-bright disabled:opacity-50">
        {busy ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold text-foreground">Choose a new password</h1>
      <Suspense fallback={null}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
