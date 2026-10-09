"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { deleteMyAccount, exportMyData, signOutEverywhere } from "@/app/actions/account";

export default function AccountActions({ premium }: { premium: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");

  async function download() {
    setBusy("export");
    const r = await exportMyData();
    setBusy(null);
    if (!r.ok) return setMsg(r.error);
    const url = URL.createObjectURL(new Blob([r.json], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `manaforge-my-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function everywhere() {
    setBusy("everywhere");
    await signOutEverywhere();
    await signOut({ callbackUrl: "/login" });
  }

  async function remove(e: React.FormEvent) {
    e.preventDefault();
    setBusy("delete");
    const r = await deleteMyAccount(password);
    if (!r.ok) {
      setBusy(null);
      return setMsg(r.error);
    }
    await signOut({ callbackUrl: "/" });
  }

  const row = "flex flex-col gap-3 border-t border-border py-5 sm:flex-row sm:items-center sm:justify-between";
  const btn = "shrink-0 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-gold disabled:opacity-50";

  return (
    <div className="mt-10 border-b border-border">
      <div className={row}>
        <div>
          <p className="font-semibold text-foreground">Download your data</p>
          <p className="text-sm text-muted">Your account details, decks, favourites and watchlist as a JSON file.</p>
        </div>
        <button type="button" onClick={download} disabled={!!busy} className={btn}>
          {busy === "export" ? "Preparing…" : "Download"}
        </button>
      </div>
      <div className={row}>
        <div>
          <p className="font-semibold text-foreground">Sign out of all devices</p>
          <p className="text-sm text-muted">Ends every session, here and on your other phones and computers.</p>
        </div>
        <button type="button" onClick={everywhere} disabled={!!busy} className={btn}>
          {busy === "everywhere" ? "Signing out…" : "Sign out everywhere"}
        </button>
      </div>
      <div className={row}>
        <div>
          <p className="font-semibold text-foreground">Delete your account</p>
          <p className="text-sm text-muted">
            Removes the account with its decks, favourites and watchlist. This can&apos;t be undone.
            {premium && (
              <>
                {" "}
                <Link href="/cancel" className="underline hover:text-gold-bright">
                  Cancel Premium
                </Link>{" "}
                first.
              </>
            )}
          </p>
        </div>
        {!confirming ? (
          <button type="button" onClick={() => setConfirming(true)} disabled={!!busy} className={`${btn} hover:border-red-600 hover:text-red-700`}>
            Delete account
          </button>
        ) : (
          <form onSubmit={remove} className="flex shrink-0 gap-2">
            <input
              type="password"
              required
              autoFocus
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-40 rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-gold focus:outline-none"
            />
            <button type="submit" disabled={!!busy} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {busy === "delete" ? "Deleting…" : "Delete for good"}
            </button>
          </form>
        )}
      </div>
      {msg && <p className="pb-4 text-sm text-red-700">{msg}</p>}
    </div>
  );
}
