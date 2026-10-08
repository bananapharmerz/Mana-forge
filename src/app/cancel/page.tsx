"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cancelMySubscription, getMySubscription, requestCancellation, type MySubscription } from "@/app/actions/premium";

// The cancel button German law asks for (§ 312k BGB): always reachable from the footer, one
// confirmation step, and a clear confirmation of when Premium ends.
export default function CancelPage() {
  const [sub, setSub] = useState<MySubscription | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    getMySubscription().then(setSub);
  }, []);

  const box = "mx-auto max-w-lg px-4 py-16 sm:px-6";
  const primary = "rounded-lg bg-gold px-6 py-3 text-sm font-semibold text-black hover:bg-gold-bright disabled:opacity-50";

  if (done) {
    return (
      <div className={box}>
        <h1 className="text-3xl font-bold text-foreground">Cancellation received</h1>
        <p className="mt-3 text-muted">{done}</p>
        <p className="mt-2 text-xs text-muted">Please keep this page or take a screenshot as your confirmation ({new Date().toLocaleString()}).</p>
        <Link href="/" className="mt-8 inline-block text-sm text-gold-bright underline">Back to the site</Link>
      </div>
    );
  }

  return (
    <div className={box}>
      <h1 className="text-3xl font-bold text-foreground">Cancel subscription</h1>
      <p className="mt-2 text-sm text-muted">
        Cancelling stops the next renewal. You keep Premium until the end of the period you&apos;ve
        already paid for, then your account goes back to free. Your decks stay.
      </p>

      {!sub && <p className="mt-8 text-sm text-muted">Checking your account…</p>}

      {sub?.state === "active" && (
        <div className="card-frame mt-8 p-5">
          <p className="text-sm text-foreground">
            You&apos;re on Premium{sub.renewsOn ? `, renewing on ${sub.renewsOn}` : ""}.
          </p>
          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
          <button
            type="button"
            disabled={busy}
            className={`${primary} mt-4`}
            onClick={async () => {
              setBusy(true);
              setError("");
              const r = await cancelMySubscription();
              setBusy(false);
              if (r.ok) setDone(`Your Premium subscription is cancelled. ${r.endsOn ? `You keep Premium until ${r.endsOn}` : "You keep Premium until the end of the current period"}, and you won't be charged again.`);
              else setError(r.error);
            }}
          >
            {busy ? "Cancelling…" : "Cancel now"}
          </button>
        </div>
      )}

      {sub?.state === "cancelling" && (
        <div className="card-frame mt-8 p-5 text-sm text-foreground">
          Your subscription is already cancelled. {sub.endsOn ? `Premium stays on until ${sub.endsOn}.` : "Premium stays on until the end of the current period."}
        </div>
      )}

      {sub?.state === "none" && (
        <div className="card-frame mt-8 p-5 text-sm text-muted">
          This account doesn&apos;t have an active subscription. If you pay for Premium on another
          account, sign in with that one — or use the form below.
        </div>
      )}

      {sub && sub.state !== "active" && sub.state !== "cancelling" && (
        <form
          className="card-frame mt-8 flex flex-col gap-3 p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const r = await requestCancellation(email, note);
            setBusy(false);
            if (r.ok) setDone(`We've received your request to cancel the subscription for ${email.trim()}. It will be cancelled so it doesn't renew; you keep Premium until the end of the period you've paid for.`);
            else setError(r.error);
          }}
        >
          <p className="text-sm text-foreground">
            {sub.state === "signed_out" ? (
              <>
                <Link href="/login?callbackUrl=/cancel" className="text-gold-bright underline">Sign in</Link> to cancel instantly, or send us a cancellation request:
              </>
            ) : (
              "Cancel a subscription on another account:"
            )}
          </p>
          <label className="text-xs text-muted" htmlFor="cancel-email">Email address of the account</label>
          <input
            id="cancel-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
          <label className="text-xs text-muted" htmlFor="cancel-note">Anything else? (optional)</label>
          <textarea
            id="cancel-note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 500))}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={busy} className={primary}>
            {busy ? "Sending…" : "Cancel now"}
          </button>
        </form>
      )}
    </div>
  );
}
