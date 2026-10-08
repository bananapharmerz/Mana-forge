import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

// The home-screen icon on iPhones, drawn from the site's initials so it follows a rename.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 50% 35%, #3a2210 0%, #07050c 70%)",
          borderRadius: 36,
          border: "6px solid #e0b252",
          color: "#ffe2a8",
          fontSize: SITE.initials.length > 2 ? 64 : 84,
          fontWeight: 700,
          fontFamily: "Georgia, serif",
          letterSpacing: -2,
        }}
      >
        {SITE.initials}
      </div>
    ),
    size
  );
}
