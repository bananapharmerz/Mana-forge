import { ImageResponse } from "next/og";
import { createHmac, timingSafeEqual } from "node:crypto";
import { hit, ipFrom } from "@/lib/rateLimit";

// The picture for an Instagram / TikTok post (1080×1350), drawn from the post's title and key
// stat. Our own design (no card art). Nexus signs each link with the admin key, so only Nexus
// can make one; Buffer downloads it when it publishes the post.
//   /api/social-card?t=<title>&s=<stat>&k=<kicker>&c=<colours, e.g. "rg">&sig=<hmac>

const MANA: Record<string, string> = { w: "#f4ecd2", u: "#3d8fd6", b: "#6b5a8a", r: "#e0533a", g: "#3c9a5a" };

function signed(t: string, s: string, k: string, c: string, sig: string) {
  const key = process.env.ADMIN_API_KEY?.trim() ?? "";
  if (key.length < 32 || !/^[0-9a-f]{32}$/.test(sig)) return false;
  const want = createHmac("sha256", key).update(`${t}|${s}|${k}|${c}`).digest("hex").slice(0, 32);
  return timingSafeEqual(Buffer.from(want), Buffer.from(sig));
}

export async function GET(req: Request) {
  if (!hit(`social-card:${ipFrom(req.headers)}`, 120, 60 * 1000)) return new Response("Slow down", { status: 429 });
  const q = new URL(req.url).searchParams;
  const t = (q.get("t") ?? "").slice(0, 120);
  const s = (q.get("s") ?? "").slice(0, 140);
  const k = (q.get("k") ?? "").slice(0, 40);
  const c = (q.get("c") ?? "").toLowerCase().replace(/[^wubrg]/g, "").slice(0, 5);
  if (!t || !signed(t, s, k, c, q.get("sig") ?? "")) return new Response("Not found", { status: 404 });
  const colours = (c ? c.split("") : ["w", "u", "b", "r", "g"]).map((x) => MANA[x]);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "linear-gradient(160deg, #1d1530 0%, #141009 55%, #24160a 100%)", color: "#f5ecd6", padding: "84px 80px", fontFamily: "serif" }}>
        <div style={{ display: "flex", height: 14, width: "100%", borderRadius: 7, overflow: "hidden" }}>
          {colours.map((col, i) => (
            <div key={i} style={{ flex: 1, background: col }} />
          ))}
        </div>
        <div style={{ marginTop: 56, fontSize: 30, letterSpacing: 8, color: "#e0b252", textTransform: "uppercase", fontFamily: "sans-serif", fontWeight: 700 }}>
          {k || "Mana Forge · Commander"}
        </div>
        <div style={{ marginTop: 28, fontSize: t.length > 60 ? 74 : 92, lineHeight: 1.04, fontWeight: 700, display: "flex" }}>{t}</div>
        {s && (
          <div style={{ marginTop: "auto", display: "flex", border: "3px solid #e0b252", borderRadius: 28, padding: "38px 44px", background: "rgba(224,178,82,0.10)", fontSize: 46, lineHeight: 1.2, color: "#ffe2a8", fontFamily: "sans-serif" }}>
            {s}
          </div>
        )}
        <div style={{ marginTop: s ? 56 : "auto", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "sans-serif" }}>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 800, color: "#e0b252" }}>Mana Forge</div>
          <div style={{ display: "flex", fontSize: 32, color: "#cdbf9e" }}>manaforgehub.com</div>
        </div>
      </div>
    ),
    { width: 1080, height: 1350, headers: { "Cache-Control": "public, max-age=31536000, immutable" } }
  );
}
