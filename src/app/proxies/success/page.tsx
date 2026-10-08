import Link from "next/link";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/money";
import ClearProxyProjectOnMount from "@/components/ClearProxyProjectOnMount";
import { maskEmail } from "@/lib/author";

export default async function ProxySuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderId } = await searchParams;
  const order = orderId ? await db.proxyOrder.findUnique({ where: { id: orderId } }) : null;

  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center sm:px-6">
      <ClearProxyProjectOnMount />
      <h1 className="text-3xl font-bold text-foreground">Thanks for your order!</h1>
      {order ? (
        <p className="mt-3 text-muted">
          {order.cardCount} proxy cards — {formatCents(order.totalCents)} — status:{" "}
          <span className="text-gold-bright">{order.status}</span>. A receipt was sent to{" "}
          {maskEmail(order.email)}.
        </p>
      ) : (
        <p className="mt-3 text-muted">Your order is being processed.</p>
      )}
      <Link
        href="/proxies"
        className="mt-8 inline-block rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-black hover:bg-gold-bright"
      >
        Start a New Project
      </Link>
    </div>
  );
}
