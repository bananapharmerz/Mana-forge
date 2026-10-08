import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

// The app icon, drawn from the site's initials so it follows a rename.
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 96,
          border: "14px solid #e0b252",
          color: "#ffe2a8",
          fontSize: SITE.initials.length > 2 ? 190 : 240,
          fontWeight: 700,
          fontFamily: "Georgia, serif",
          letterSpacing: -6,
        }}
      >
        {SITE.initials}
      </div>
    ),
    size
  );
}
