import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { MEDIA_NAME, MEDIA_TYPES, mediaDir } from "@/lib/media";

// Serves a video/image Nexus uploaded (see /api/admin/media). Unguessable names, kept a week.
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!MEDIA_NAME.test(name)) return new NextResponse("Not found", { status: 404 });
  const file = path.join(mediaDir(), name);
  const s = await stat(file).catch(() => null);
  if (!s?.isFile()) return new NextResponse("Not found", { status: 404 });
  const type = MEDIA_TYPES[name.split(".").pop()!];
  const headers: Record<string, string> = { "Content-Type": type, "Accept-Ranges": "bytes", "Cache-Control": "public, max-age=86400", "X-Robots-Tag": "noindex" };

  // Range requests (video players and some downloaders use them).
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get("range") ?? "");
  if (m && (m[1] || m[2])) {
    const start = m[1] ? Number(m[1]) : Math.max(0, s.size - Number(m[2]));
    const end = m[1] && m[2] ? Math.min(Number(m[2]), s.size - 1) : s.size - 1;
    if (start > end || start >= s.size) return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${s.size}` } });
    const stream = Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream;
    return new NextResponse(stream, { status: 206, headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${s.size}`, "Content-Length": String(end - start + 1) } });
  }
  const stream = Readable.toWeb(createReadStream(file)) as ReadableStream;
  return new NextResponse(stream, { headers: { ...headers, "Content-Length": String(s.size) } });
}
