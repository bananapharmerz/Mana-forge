"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

// A quiet "sign up to save it" link for signed-out visitors only. It's its own client piece so the
// commander page around it stays cached for an hour instead of reading cookies on every visit.
// Sign-up sends people back to `callbackUrl` (only ever a page on this site).
export default function SignupToSaveLink({ next }: { next: string }) {
  const { status } = useSession();
  if (status !== "unauthenticated") return null;
  return (
    <Link href={`/signup?callbackUrl=${encodeURIComponent(next)}`} className="text-sm text-muted underline hover:text-gold-bright">
      Sign up free to save it
    </Link>
  );
}
