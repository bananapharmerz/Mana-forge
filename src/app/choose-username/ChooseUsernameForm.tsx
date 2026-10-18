"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { claimUsername } from "@/app/actions/account";
import { USERNAME_MAX } from "@/lib/username";

// The gate for accounts that don't have a handle yet (Google sign-ups, older accounts). Picking
// one sets the public handle; it doesn't make the profile public (that stays opt-in on the account).
export default function ChooseUsernameForm({ next }: { next: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await claimUsername(username);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
      <div>
        <label htmlFor="choose-username" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
          Username
        </label>
        <div className="flex items-stretch overflow-hidden rounded-md border border-border bg-surface focus-within:border-gold">
          <span className="flex select-none items-center pl-3 pr-1 text-sm text-muted">/u/</span>
          <input
            id="choose-username"
            required
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={USERNAME_MAX}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="yourname"
            className="w-full bg-transparent py-2 pr-3 text-sm text-foreground focus:outline-none"
          />
        </div>
        <p className="mt-1 text-xs text-muted">Letters, numbers and underscores, 3–{USERNAME_MAX} characters. You can change it later.</p>
      </div>
      {error && <p className="text-sm text-down">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="mt-2 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold-bright disabled:opacity-50"
      >
        {busy ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}
