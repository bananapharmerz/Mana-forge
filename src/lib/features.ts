// On/off switches for whole parts of the site, set in .env (restart the server after changing):
//
//   NEXT_PUBLIC_SHOP_ENABLED=1   → the store (sleeves, deck boxes…) and proxy printing are open
//   NEXT_PUBLIC_SHOP_ENABLED=0   → both are hidden: no menu links, their pages show "coming soon",
//                                  and their checkouts refuse orders. Premium is not affected.
//
// Off unless set to 1, so a fresh launch never takes shop orders by accident.

export const SHOP_ENABLED = process.env.NEXT_PUBLIC_SHOP_ENABLED === "1";

/** Paths that belong to the shop (store + proxies). */
export const SHOP_PATHS = ["/store", "/proxies"] as const;

export const isShopPath = (pathname: string) => SHOP_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

export const SHOP_CLOSED = "The store and proxy printing aren't open yet — coming soon.";
