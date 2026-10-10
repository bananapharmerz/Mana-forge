import { redirect } from "next/navigation";
import EmailConfirmNote from "@/components/EmailConfirmNote";
import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import AccountActions from "./AccountActions";
import InviteFriends from "@/components/InviteFriends";
import { FRIEND_MONTHS, FRIEND_PERCENT, REWARD_CENTS, inviteLink, referralCodeFor } from "@/lib/referral";

export const metadata: Metadata = { title: "Your account", robots: { index: false, follow: false } };

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/account");
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { email: true, name: true, tier: true, createdAt: true, stripeSubscriptionId: true, emailVerifiedAt: true } });
  if (!user) redirect("/login?callbackUrl=/account");
  const [decks, code, joined, paid] = await Promise.all([
    db.deck.count({ where: { ownerId: session.user.id } }),
    referralCodeFor(session.user.id).catch(() => null),
    db.user.count({ where: { referredById: session.user.id } }),
    db.user.count({ where: { referredById: session.user.id, referralRewardedAt: { not: null } } }),
  ]);

  return (
    <>
      <PageHeader title="Your account" description={user.email} width="max-w-3xl" />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {!user.emailVerifiedAt && <EmailConfirmNote email={user.email} />}
        <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 text-sm">
          <dt className="text-muted">Name</dt>
          <dd className="text-foreground">{user.name || "Not set"}</dd>
          <dt className="text-muted">Plan</dt>
          <dd className="text-foreground">
            {user.tier === "premium" ? "Premium" : "Free"} ·{" "}
            <Link href="/premium" className="text-gold-bright underline">
              {user.tier === "premium" ? "Manage billing" : "See Premium"}
            </Link>
          </dd>
          <dt className="text-muted">Decks</dt>
          <dd className="text-foreground">{decks}</dd>
          <dt className="text-muted">Member since</dt>
          <dd className="text-foreground">{user.createdAt.toLocaleDateString("en-GB", { dateStyle: "long" })}</dd>
          <dt className="text-muted">Password</dt>
          <dd>
            <Link href="/forgot-password" className="text-gold-bright underline">
              Change it by email
            </Link>
          </dd>
        </dl>
        {code && <InviteFriends link={inviteLink(code)} joined={joined} paid={paid} percent={FRIEND_PERCENT} months={FRIEND_MONTHS} reward={`€${(REWARD_CENTS / 100).toFixed(2)}`} />}
        <AccountActions premium={user.tier === "premium" && !!user.stripeSubscriptionId} />
      </div>
    </>
  );
}
