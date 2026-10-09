import type { Metadata } from "next";
import Link from "next/link";
import { banByCode } from "@/lib/bans";
import { legalInfo } from "@/lib/legal";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Access paused", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Shown (by src/proxy.ts) instead of the site to an IP with an active ban.
export default async function BannedPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  const ban = code && /^[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(code) ? await banByCode(code) : null;
  const active = ban && !ban.liftedAt && ban.expiresAt > new Date();
  const contact = legalInfo().email;
  const when = ban?.expiresAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });
  const mail = `mailto:${contact}?subject=${encodeURIComponent(`Ban appeal ${ban?.code ?? ""}`.trim())}`;

  return (
    <div className="mx-auto max-w-xl px-4 py-20 sm:px-6">
      <h1 className="text-3xl font-bold text-foreground">Access paused</h1>
      {active ? (
        <>
          <p className="mt-4 text-muted">
            Requests from your connection were blocked because of <b className="text-foreground">{ban.reason}</b>, so{" "}
            {SITE.name} isn&apos;t available from it until <b className="text-foreground">{when}</b> (Berlin time). It opens
            again automatically after that.
          </p>
          <div className="card-frame mt-6 p-4">
            <p className="text-xs uppercase tracking-wide text-muted">Your appeal code</p>
            <p className="mt-1 font-mono text-2xl text-gold-bright">{ban.code}</p>
          </div>
          <p className="mt-6 text-sm text-muted">
            Think this is a mistake? Shared networks (a school, office or mobile carrier) can sometimes trip it. Email{" "}
            <a href={mail} className="text-gold-bright underline">
              {contact}
            </a>{" "}
            with your appeal code and a short explanation. We read every appeal and lift bans that shouldn&apos;t have
            happened.
          </p>
        </>
      ) : (
        <p className="mt-4 text-muted">
          There&apos;s no active block for this code. <Link href="/" className="text-gold-bright underline">Go to {SITE.name}</Link>.
        </p>
      )}
    </div>
  );
}
