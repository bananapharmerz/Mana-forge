// On/off switches for whole parts of the site, set in .env (restart the server after changing):
//
//   NEXT_PUBLIC_SHOP_ENABLED=1   → the store (sleeves, deck boxes…) and proxy printing are open
//   NEXT_PUBLIC_SHOP_ENABLED=0   → both are hidden: no menu links, their pages show "coming soon",
//                                  and their checkouts refuse orders. Premium is not affected.
//
// Off unless set to 1, so a fresh launch never takes shop orders by accident.

export const SHOP_ENABLED = process.env.NEXT_PUBLIC_SHOP_ENABLED === "1";

//   NEXT_PUBLIC_ADS_ENABLED=1    → Google AdSense ads in the ad slots (never for Premium members).
//   NEXT_PUBLIC_ADSENSE_SLOT_BANNER / NEXT_PUBLIC_ADSENSE_SLOT_SQUARE = the ad unit IDs from AdSense.
// Off unless set to 1: turn it on once AdSense has approved the site and the consent message is set
// up in AdSense → Privacy & messaging (Google shows the EU consent banner itself).
export const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED === "1";
export const ADSENSE_CLIENT = "ca-pub-5292825630246496";
export const ADSENSE_SLOTS = {
  banner: process.env.NEXT_PUBLIC_ADSENSE_SLOT_BANNER ?? "",
  square: process.env.NEXT_PUBLIC_ADSENSE_SLOT_SQUARE ?? "",
};

/** Paths that belong to the shop (store + proxies). */
export const SHOP_PATHS = ["/store", "/proxies"] as const;

export const isShopPath = (pathname: string) => SHOP_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

export const SHOP_CLOSED = "The store and proxy printing aren't open yet — coming soon.";
