"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useCart } from "./CartProvider";
import { useProxyProject } from "./ProxyProjectProvider";
import { SITE } from "@/lib/site";
import { isShopPath, SHOP_ENABLED } from "@/lib/features";

const links = [
  { href: "/commanders", label: "Commanders" },
  { href: "/decks", label: "Public Decks" },
  { href: "/deck-builder", label: "My Decks" },
  { href: "/prices", label: "Prices" },
  { href: "/play", label: "Play" },
  { href: "/proxies", label: "Proxies" },
  { href: "/store", label: "Store" },
].filter((l) => SHOP_ENABLED || !isShopPath(l.href));

export default function Nav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { count } = useCart();
  const { totalCount: proxyCount } = useProxyProject();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-lg font-bold tracking-tight text-gold-bright">
            {SITE.name}
          </span>
        </Link>
        <nav className="hidden flex-wrap items-center gap-1 sm:gap-2 lg:flex">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-3 ${
                  active
                    ? "bg-gold text-black"
                    : "text-muted hover:bg-surface-raised hover:text-foreground"
                }`}
              >
                {link.label}
                {link.href === "/store" && count > 0 && (
                  <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-black/70 px-1 text-[10px] font-bold text-gold-bright">
                    {count}
                  </span>
                )}
                {link.href === "/proxies" && proxyCount > 0 && (
                  <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-black/70 px-1 text-[10px] font-bold text-gold-bright">
                    {proxyCount}
                  </span>
                )}
              </Link>
            );
          })}

          <Link
            href="/premium"
            className={`rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-3 ${
              pathname === "/premium"
                ? "bg-gold text-black"
                : "text-gold-bright hover:bg-surface-raised"
            }`}
          >
            Premium
          </Link>

          <span className="mx-1 h-5 w-px bg-border" />

          {status === "authenticated" ? (
            <div className="flex items-center gap-2">
              <Link href="/account" className="hidden text-xs text-muted hover:text-gold-bright sm:inline" title="Your account">
                {session.user?.email}
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-md px-2.5 py-1.5 text-sm font-medium text-muted hover:bg-surface-raised hover:text-foreground sm:px-3"
              >
                Sign Out
              </button>
            </div>
          ) : status === "loading" ? null : (
            <>
              <Link
                href="/login"
                className="rounded-md px-2.5 py-1.5 text-sm font-medium text-muted hover:bg-surface-raised hover:text-foreground sm:px-3"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-gold px-2.5 py-1.5 text-sm font-semibold text-black hover:bg-gold-bright sm:px-3"
              >
                Sign Up
              </Link>
            </>
          )}
        </nav>

        {/* Phones and tablets: a menu button instead of the full row of links. */}
        <div className="flex items-center gap-2 lg:hidden">
          {SHOP_ENABLED && count > 0 && (
            <Link href="/store/cart" className="rounded-md bg-surface-raised px-2.5 py-1.5 text-xs font-semibold text-foreground" onClick={close}>
              Cart <span className="text-gold-bright">{count}</span>
            </Link>
          )}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground hover:border-gold"
          >
            <span className="relative block h-3 w-4">
              <span className={`absolute left-0 h-0.5 w-4 rounded bg-current transition-all ${open ? "top-1.5 rotate-45" : "top-0"}`} />
              <span className={`absolute left-0 top-1.5 h-0.5 w-4 rounded bg-current transition-opacity ${open ? "opacity-0" : ""}`} />
              <span className={`absolute left-0 h-0.5 w-4 rounded bg-current transition-all ${open ? "top-1.5 -rotate-45" : "top-3"}`} />
            </span>
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-menu" className="border-t border-border bg-background px-4 pb-4 pt-2 lg:hidden">
          <ul className="flex flex-col">
            {[...links, { href: "/premium", label: "Premium" }].map((link) => {
              const active = pathname === link.href || pathname.startsWith(link.href + "/");
              const badge = link.href === "/store" ? count : link.href === "/proxies" ? proxyCount : 0;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={close}
                    className={`flex items-center justify-between rounded-md px-3 py-2.5 text-base font-medium ${
                      active ? "bg-gold text-black" : link.href === "/premium" ? "text-gold-bright" : "text-foreground hover:bg-surface-raised"
                    }`}
                  >
                    {link.label}
                    {badge > 0 && (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-black/70 px-1.5 text-[11px] font-bold text-gold-bright">{badge}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 border-t border-border pt-3">
            {status === "authenticated" ? (
              <div className="flex items-center justify-between gap-3">
                <Link href="/account" onClick={close} className="truncate text-sm text-muted underline">{session.user?.email}</Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="shrink-0 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground"
                >
                  Sign Out
                </button>
              </div>
            ) : status === "loading" ? null : (
              <div className="grid grid-cols-2 gap-2">
                <Link href="/login" onClick={close} className="rounded-md border border-border px-3 py-2.5 text-center text-sm font-medium text-foreground">
                  Sign In
                </Link>
                <Link href="/signup" onClick={close} className="rounded-md bg-gold px-3 py-2.5 text-center text-sm font-semibold text-black">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
