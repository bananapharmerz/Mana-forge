export function ipFrom(h: Headers): string {
  // Behind Cloudflare every request arrives from a Cloudflare server, so use the visitor IP it passes on.
  // Only trusted when TRUST_CLOUDFLARE=1 (set once the site is proxied and the firewall only admits Cloudflare).
  const cf = process.env.TRUST_CLOUDFLARE === "1" ? h.get("cf-connecting-ip")?.trim() : "";
  if (cf) return cf;
  const fwd = h.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0] : h.get("x-real-ip") || "local").trim() || "local";
}
