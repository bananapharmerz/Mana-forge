import { NextResponse, type NextRequest } from "next/server";

// While the shop is switched off (NEXT_PUBLIC_SHOP_ENABLED in .env, see src/lib/features.ts), every
// store and proxy page shows the "coming soon" page instead.
export function proxy(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_SHOP_ENABLED === "1") return NextResponse.next();
  return NextResponse.rewrite(new URL("/coming-soon", request.url));
}

export const config = {
  matcher: ["/store", "/store/:path*", "/proxies", "/proxies/:path*"],
};
