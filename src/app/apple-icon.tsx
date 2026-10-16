import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// The iPhone home-screen icon: Ember on the forge-dark frame.
export const runtime = "nodejs";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

function emberSrc(): string | null {
  try {
    const buf = readFileSync(join(process.cwd(), "public/ember/ember_avatar_256.png"));
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export default function AppleIcon() {
  const src = emberSrc();
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
        }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} width={140} height={140} alt="" />
        ) : (
          <div style={{ color: "#ffe2a8", fontSize: 84, fontWeight: 700, fontFamily: "Georgia, serif" }}>MF</div>
        )}
      </div>
    ),
    size
  );
}
