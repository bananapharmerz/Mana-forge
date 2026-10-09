import { randomBytes } from "node:crypto";
import { mkdir, readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { adminAllowed } from "@/lib/adminKey";
import { MEDIA_DAYS, MEDIA_MAX_BYTES, MEDIA_TYPES, mediaDir } from "@/lib/media";
import { hit, ipFrom } from "@/lib/rateLimit";
import { absoluteUrl } from "@/lib/site";

// Nexus uploads a finished video here (raw bytes, x-admin-key) and gets back a public link that
// Buffer downloads from. Files older than a week are removed on each upload. Without the key: 404.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!hit(`admin-media:${ipFrom(req.headers)}`, 20, 60 * 60 * 1000) || !adminAllowed(req)) return new NextResponse("Not found", { status: 404 });
  const ext = (req.headers.get("x-ext") ?? "mp4").toLowerCase();
  if (!MEDIA_TYPES[ext]) return NextResponse.json({ error: "mp4, jpg or png only" }, { status: 400 });
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MEDIA_MAX_BYTES) return NextResponse.json({ error: "File too large" }, { status: 413 });
  const buf = Buffer.from(await req.arrayBuffer());
  if (!buf.length || buf.length > MEDIA_MAX_BYTES) return NextResponse.json({ error: "Empty or too large" }, { status: 400 });

  const dir = mediaDir();
  await mkdir(dir, { recursive: true });
  const cutoff = Date.now() - MEDIA_DAYS * 86400000;
  for (const f of await readdir(dir).catch(() => [] as string[])) {
    const p = path.join(dir, f);
    const s = await stat(p).catch(() => null);
    if (s && s.mtimeMs < cutoff) await unlink(p).catch(() => {});
  }
  const name = `${randomBytes(12).toString("hex")}.${ext}`;
  await writeFile(path.join(dir, name), buf);
  return NextResponse.json({ url: absoluteUrl(`/api/media/${name}`), bytes: buf.length, expiresDays: MEDIA_DAYS });
}
