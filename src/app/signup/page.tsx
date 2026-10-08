"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { signup } from "@/app/actions/auth";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signup(email, password, name);
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);

    if (res?.error) {
      setError("Account created, but sign-in failed. Try signing in manually.");
      return;
    }
    router.push("/deck-builder");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
      <p className="mt-1 text-sm text-muted">
        Free accounts can save up to 10 decks. Premium (unlimited decks) is coming soon.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            Name (optional)
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            Password
          </label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-gold focus:outline-none"
          />
          <p className="mt-1 text-xs text-muted">At least 8 characters, with a letter and a number. Passwords found in data breaches are refused.</p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold-bright disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>
        <p className="text-xs text-muted">
          By creating an account you agree to the{" "}
          <Link href="/legal/terms" className="underline hover:text-gold-bright">Terms</Link> and{" "}
          <Link href="/legal/privacy" className="underline hover:text-gold-bright">Privacy policy</Link>.
        </p>
      </form>
      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-gold-bright underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
