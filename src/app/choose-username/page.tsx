import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import ChooseUsernameForm from "./ChooseUsernameForm";

export const metadata: Metadata = { title: "Choose your username", robots: { index: false, follow: false } };

// Accounts without a handle land here (Google sign-ups and older accounts). Once set, they go on
// to wherever they were headed.
export default async function ChooseUsernamePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/choose-username");
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { username: true } });
  if (!user) redirect("/login?callbackUrl=/choose-username");

  const { next } = await searchParams;
  const dest = next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/deck-builder";
  if (user.username) redirect(dest); // already has one — nothing to do here

  return (
    <div className="forge-band relative flex min-h-[calc(100vh-9rem)] items-start justify-center px-4 py-14 sm:items-center">
      <div className="relative w-full max-w-sm rounded-2xl border border-[#3a2f1c] bg-surface px-6 py-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] sm:px-8">
        <h1 className="font-display text-3xl font-semibold text-foreground">Pick your username</h1>
        <p className="mt-1 text-sm text-muted">
          This is your public handle on Mana Forge — it&apos;s how people find your profile at
          manaforgehub.com/u/your-name. Every account has one.
        </p>
        <ChooseUsernameForm next={dest} />
      </div>
    </div>
  );
}
