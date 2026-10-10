"use client";

import PasswordInput from "@/components/PasswordInput";
import { useState, Suspense } from "react";
import Turnstile from "@/components/Turnstile";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import GoogleButton from "@/components/GoogleButton";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Only ever send people back to a page on this site (never to another website).
  const wanted = searchParams.get("callbackUrl") || "";
  const callbackUrl = wanted.startsWith("/") && !wanted.startsWith("//") && !wanted.startsWith("/\\") ? wanted : "/deck-builder";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(searchParams.get("error") === "google" ? "Google didn't confirm that email address, so we couldn't sign you in with it." : null);
  const [loading, setLoading] = useState(false);
  const [human, setHuman] = useState("");
  const [humanReset, setHumanReset] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signIn("credentials", {
      email,
      password,
      turnstile: human,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setHumanReset((n) => n + 1); // a Turnstile token works once
      setError(
        res.code === "too_many"
          ? "Too many sign-in attempts. Please wait 15 minutes and try again."
          : res.code === "human_check"
            ? "Please confirm you're human (the check below the form), then try again."
            : "Incorrect email or password."
      );
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="forge-band relative flex min-h-[calc(100vh-9rem)] items-start justify-center px-4 py-14 sm:items-center">
      <div className="relative w-full max-w-sm rounded-2xl border border-[#3a2f1c] bg-surface px-6 py-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] sm:px-8">
      <h1 className="font-display text-3xl font-semibold text-foreground">Sign in</h1>
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div>
          <label htmlFor="login-email" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="login-password" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            Password
          </label>
          <PasswordInput
            id="login-password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-gold focus:outline-none"
          />
        </div>
        <Link href="/forgot-password" className="-mt-2 self-end text-xs text-muted underline hover:text-gold-bright">
          Forgot your password?
        </Link>
        <Turnstile onToken={setHuman} resetKey={humanReset} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold-bright disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
      <GoogleButton callbackUrl={callbackUrl} />
      <p className="mt-6 text-sm text-muted">
        No account yet?{" "}
        <Link href="/signup" className="text-gold-bright underline">
          Sign up
        </Link>
      </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
