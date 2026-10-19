"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useCart } from "./CartProvider";
import { useProxyProject } from "./ProxyProjectProvider";
import Ember from "./Ember";
import ThemeToggle from "./ThemeToggle";
import { SITE } from "@/lib/site";
import { SHOP_ENABLED } from "@/lib/features";

type Badge = "cart" | "proxy";
type NavItem = { href: string; label: string; badge?: Badge };
type NavSection = { header?: string; items: NavItem[] };
type NavMenu = { label: string; sections: NavSection[]; shopGated?: boolean };

// Standalone top-level link (not a dropdown). Profile is its own category; Premium is the gold CTA.
const PROFILE: NavItem = { href: "/deck-builder", label: "Profile" };

// The top nav, grouped into a few dropdown menus instead of one long row of tabs. Explore folds
// in the whole discovery surface (commanders + public decks + spoilers) and carries sub-headers.
const MENUS: NavMenu[] = [
  {
    label: "Explore",
    sections: [
      {
        header: "Commanders",
        items: [
          { href: "/commanders", label: "All Commanders" },
          { href: "/commanders/browse/colors", label: "By Color" },
          { href: "/commanders/browse/typal", label: "By Tribe" },
          { href: "/commanders/browse/themes", label: "By Theme" },
        ],
      },
      {
        header: "Rankings",
        items: [
          { href: "/commanders/popular", label: "Most Popular" },
          { href: "/commanders/budget", label: "Best Budget" },
        ],
      },
      {
        header: "Decks",
        items: [{ href: "/decks", label: "Public Decks" }],
      },
      {
        header: "Sets",
        items: [
          { href: "/spoilers", label: "Spoilers & New Sets" },
          { href: "/commanders/browse/sets", label: "Browse by Set" },
        ],
      },
    ],
  },
  {
    label: "Market",
    sections: [
      {
        items: [
          { href: "/prices", label: "Card Prices" },
          { href: "/prices/budget-staples", label: "Budget Staples" },
        ],
      },
    ],
  },
  {
    label: "Social",
    sections: [
      {
        items: [
          { href: "/play", label: "Play" },
          { href: "/packs", label: "Open Packs" },
          { href: "/community", label: "Community" },
        ],
      },
    ],
  },
  {
    label: "Shop",
    shopGated: true,
    sections: [
      {
        items: [
          { href: "/store", label: "Store", badge: "cart" },
          { href: "/proxies", label: "Proxies", badge: "proxy" },
        ],
      },
    ],
  },
];

export default function Nav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { count } = useCart();
  const { totalCount: proxyCount } = useProxyProject();
  const [open, setOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const close = () => setOpen(false);
  // The search field opens in its own row under the header instead of sitting inside the link
  // row: a field there would crowd the menu row on mid-width desktops.
  const [searchOpen, setSearchOpen] = useState(false);

  // Click-to-open menus: a tab opens its menu and it stays open until you pick an item, click the
  // tab again, click outside the nav, or press Escape — no hover race.
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!openMenu) return;
    const onPointerDown = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openMenu]);

  const menus = MENUS.filter((m) => SHOP_ENABLED || !m.shopGated);
  const badgeValue = (b?: Badge) => (b === "cart" ? count : b === "proxy" ? proxyCount : 0);
  const itemActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const menuActive = (m: NavMenu) => m.sections.some((s) => s.items.some((it) => itemActive(it.href)));
  const menuBadge = (m: NavMenu) =>
    m.sections.reduce((sum, s) => sum + s.items.reduce((n, it) => n + badgeValue(it.badge), 0), 0);

  const renderMenu = (menu: NavMenu) => {
    const active = menuActive(menu);
    const isOpen = openMenu === menu.label;
    const badge = menuBadge(menu);
    return (
      <div key={menu.label} className="relative">
        <button
          type="button"
          aria-haspopup="true"
          aria-expanded={isOpen}
          onClick={() => setOpenMenu((cur) => (cur === menu.label ? null : menu.label))}
          className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            active || isOpen
              ? "bg-gold text-black"
              : "text-muted hover:bg-surface-raised hover:text-foreground"
          }`}
        >
          {menu.label}
          {badge > 0 && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-black/70 px-1 text-[10px] font-bold text-gold-bright">
              {badge}
            </span>
          )}
          <svg
            aria-hidden
            viewBox="0 0 12 12"
            className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m2.5 4.5 3.5 3.5 3.5-3.5" />
          </svg>
        </button>
        {isOpen && (
          <div
            role="menu"
            className="absolute left-0 top-full z-50 mt-1 min-w-[220px] rounded-lg border border-border bg-background p-2 shadow-xl"
          >
            {menu.sections.map((section, si) => (
              <div key={section.header ?? si} className={si > 0 ? "mt-1 border-t border-border pt-1" : ""}>
                {section.header && (
                  <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                    {section.header}
                  </p>
                )}
                {section.items.map((it) => {
                  const b = badgeValue(it.badge);
                  return (
                    <Link
                      key={it.href}
                      href={it.href}
                      role="menuitem"
                      onClick={() => setOpenMenu(null)}
                      className={`flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                        itemActive(it.href) ? "text-gold-bright" : "text-foreground hover:bg-surface-raised"
                      }`}
                    >
                      {it.label}
                      {b > 0 && (
                        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-black/70 px-1 text-[10px] font-bold text-gold-bright">
                          {b}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const profileActive = itemActive(PROFILE.href);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Ember size={34} mood="happy" title={`${SITE.name} mascot`} className="shrink-0" />
          <span className="text-lg font-bold tracking-tight text-gold-bright">
            {SITE.name}
          </span>
        </Link>
        {/* Desktop: a row of dropdown menus. Below xl it collapses to the menu button. */}
        <nav ref={navRef} aria-label="Primary" className="hidden items-center gap-1 xl:flex">
          {renderMenu(menus[0])}
          <Link
            href={PROFILE.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              profileActive ? "bg-gold text-black" : "text-muted hover:bg-surface-raised hover:text-foreground"
            }`}
          >
            {PROFILE.label}
          </Link>
          {menus.slice(1).map(renderMenu)}

          <Link
            href="/premium"
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              pathname === "/premium"
                ? "bg-gold text-black"
                : "text-gold-bright hover:bg-surface-raised"
            }`}
          >
            Premium
          </Link>

          <SearchToggle open={searchOpen} onToggle={() => setSearchOpen((s) => !s)} />
          <ThemeToggle />

          {status === "authenticated" ? (
            <div className="flex items-center gap-2">
              {/* A long email would push the row onto two lines, so it only shows on wide screens. */}
              <Link href="/account" className="text-xs text-muted hover:text-gold-bright" title="Your account">
                <span className="2xl:hidden">Account</span>
                <span className="hidden 2xl:inline">{session.user?.email}</span>
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface-raised hover:text-foreground"
              >
                Sign Out
              </button>
            </div>
          ) : status === "loading" ? null : (
            <>
              <Link
                href="/login"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface-raised hover:text-foreground"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-gold px-3 py-1.5 text-sm font-semibold text-black hover:bg-gold-bright"
              >
                Sign Up
              </Link>
            </>
          )}
        </nav>

        {/* Phones and tablets: a menu button instead of the full row of links. */}
        <div className="flex items-center gap-2 xl:hidden">
          <SearchToggle
            open={searchOpen}
            onToggle={() => {
              setSearchOpen((s) => !s);
              close();
            }}
          />
          <ThemeToggle />
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

      {searchOpen && (
        // A plain GET form to the commander browser (the same target as the site's SearchAction
        // JSON-LD), so it works without JavaScript and adds no new API calls.
        <div id="nav-search" className="border-t border-border bg-background px-4 py-3 sm:px-6">
          <form action="/commanders" method="GET" role="search" className="mx-auto flex max-w-7xl gap-2">
            <label htmlFor="nav-search-q" className="sr-only">
              Search commanders
            </label>
            <input
              id="nav-search-q"
              type="search"
              name="q"
              placeholder="Find a commander, e.g. Yuriko"
              autoComplete="off"
              enterKeyHint="search"
              autoFocus
              maxLength={80}
              className="w-full max-w-md rounded-md border border-border bg-surface px-3 py-2 text-base text-foreground placeholder:text-muted focus:border-gold focus:outline-none sm:text-sm"
            />
            <button type="submit" className="shrink-0 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold-bright">
              Search
            </button>
          </form>
        </div>
      )}

      {open && (
        <nav id="mobile-menu" aria-label="Mobile" className="border-t border-border bg-background px-4 pb-4 pt-2 xl:hidden">
          <ul className="flex flex-col gap-0.5">
            {/* Explore first */}
            <li className="py-1">
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                {menus[0].label}
              </p>
              {menus[0].sections.map((section, si) => (
                <div key={section.header ?? si}>
                  {section.header && (
                    <p className="px-3 pt-1 text-[10px] uppercase tracking-wide text-muted/70">{section.header}</p>
                  )}
                  {section.items.map((it) => {
                    const active = itemActive(it.href);
                    return (
                      <Link
                        key={it.href}
                        href={it.href}
                        onClick={close}
                        className={`flex items-center justify-between rounded-md px-3 py-2 text-base font-medium ${
                          active ? "bg-gold text-black" : "text-foreground hover:bg-surface-raised"
                        }`}
                      >
                        {it.label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </li>

            {/* Profile standalone */}
            <li className="py-1">
              <Link
                href={PROFILE.href}
                onClick={close}
                className={`flex items-center rounded-md px-3 py-2.5 text-base font-medium ${
                  profileActive ? "bg-gold text-black" : "text-foreground hover:bg-surface-raised"
                }`}
              >
                {PROFILE.label}
              </Link>
            </li>

            {/* Remaining menus */}
            {menus.slice(1).map((menu) => (
              <li key={menu.label} className="py-1">
                <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                  {menu.label}
                </p>
                {menu.sections.map((section, si) => (
                  <div key={section.header ?? si}>
                    {section.header && (
                      <p className="px-3 pt-1 text-[10px] uppercase tracking-wide text-muted/70">{section.header}</p>
                    )}
                    {section.items.map((it) => {
                      const active = itemActive(it.href);
                      const b = badgeValue(it.badge);
                      return (
                        <Link
                          key={it.href}
                          href={it.href}
                          onClick={close}
                          className={`flex items-center justify-between rounded-md px-3 py-2 text-base font-medium ${
                            active ? "bg-gold text-black" : "text-foreground hover:bg-surface-raised"
                          }`}
                        >
                          {it.label}
                          {b > 0 && (
                            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-black/70 px-1.5 text-[11px] font-bold text-gold-bright">{b}</span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </li>
            ))}

            <li className="py-1">
              <Link
                href="/premium"
                onClick={close}
                className={`flex items-center rounded-md px-3 py-2.5 text-base font-semibold ${
                  pathname === "/premium" ? "bg-gold text-black" : "text-gold-bright hover:bg-surface-raised"
                }`}
              >
                Premium
              </Link>
            </li>
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

// A small magnifier button; it only shows or hides the search row, so it costs the nav row one
// icon's width rather than a whole text field.
function SearchToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls="nav-search"
      aria-label={open ? "Close commander search" : "Search commanders"}
      title="Search commanders"
      className={`flex h-9 w-9 items-center justify-center rounded-md border text-foreground hover:border-gold ${open ? "border-gold" : "border-border"}`}
    >
      <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
        <circle cx="8.5" cy="8.5" r="5.5" />
        <path d="m13 13 4.5 4.5" />
      </svg>
    </button>
  );
}
