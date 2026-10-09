"use client";

import { useState } from "react";
import { resendVerification } from "@/app/actions/account";

// A gentle note for members who haven't confirmed their email yet, with a "send again" button.
export default function EmailConfirmNote({ email }: { email: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm">
      <span className="min-w-0 flex-1 text-foreground">
        Please confirm your email: we sent a link to <strong>{email}</strong>. Until then, price alerts are paused.
      </span>
      {msg ? (
        <span className="text-xs text-muted">{msg}</span>
      ) : (
        <button
          type="button"
          disabled={busy}
          data-track="email confirm: send again"
          onClick={async () => {
            setBusy(true);
            const r = await resendVerification().catch(() => ({ ok: false, message: "Couldn't send it. Try again later." }));
            setMsg(r.message);
            setBusy(false);
          }}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:border-gold disabled:opacity-50"
        >
          {busy ? "Sending…" : "Send the link again"}
        </button>
      )}
    </div>
  );
}
