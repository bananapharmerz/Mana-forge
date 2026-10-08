import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

// The picture shown when the site is shared (Discord, X, iMessage, Facebook…). Drawn from the
// site name and tagline, so it follows a rename.
export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const MANA = ["#f7efc4", "#3d8fe0", "#9a6ad8", "#ff5130", "#2fd27a"];

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "70px 90px",
          background: "radial-gradient(ellipse at 75% 40%, rgba(91,42,134,0.55) 0%, rgba(7,5,12,0) 60%), linear-gradient(135deg, #0d0914 0%, #07050c 100%)",
          color: "#f3e9cf",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", gap: 14, marginBottom: 34 }}>
          {MANA.map((c) => (
            <div key={c} style={{ width: 34, height: 34, borderRadius: 17, background: c, boxShadow: `0 0 24px ${c}` }} />
          ))}
        </div>
        <div style={{ fontSize: SITE.name.length > 14 ? 96 : 120, fontWeight: 700, color: "#ffe2a8", lineHeight: 1 }}>{SITE.name}</div>
        <div style={{ fontSize: 44, marginTop: 24, color: "#e0b252" }}>{SITE.tagline}</div>
        <div style={{ fontSize: 28, marginTop: 30, color: "#cbbf9f", maxWidth: 900, lineHeight: 1.35, fontFamily: "sans-serif" }}>
          Deck builder · Commanders · Play online · Card prices · Proxies · Store
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 10, background: "linear-gradient(90deg, #e0b252, #ff7a2e, #9a6ad8, #3d8fe0)" }} />
      </div>
    ),
    size
  );
}
