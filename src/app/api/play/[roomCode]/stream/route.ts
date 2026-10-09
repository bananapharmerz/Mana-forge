import { getRoom, subscribe } from "@/lib/gameRooms";
import { hit, ipFrom } from "@/lib/rateLimit";

// Live game streams stay open, so cap how many one visitor can hold at once (and how fast they can
// open new ones). Otherwise one IP could open thousands and use up the server's connections.
const MAX_OPEN_PER_IP = 8;
const g = globalThis as unknown as { __mfStreams?: Map<string, number> };
const open: Map<string, number> = g.__mfStreams ?? (g.__mfStreams = new Map());

export async function GET(
  req: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await params;
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(roomCode)) return new Response("Bad room code", { status: 400 });
  const ip = ipFrom(req.headers);
  if (!hit(`stream:${ip}`, 60, 60 * 1000) || (open.get(ip) ?? 0) >= MAX_OPEN_PER_IP) {
    return new Response("Too many open game connections", { status: 429 });
  }
  open.set(ip, (open.get(ip) ?? 0) + 1);
  let closed = false;
  const release = () => {
    if (closed) return;
    closed = true;
    const n = (open.get(ip) ?? 1) - 1;
    if (n > 0) open.set(ip, n);
    else open.delete(ip);
  };

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      function send(room: unknown) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(room)}\n\n`));
      }

      const existing = getRoom(roomCode);
      send(existing ?? null);

      const unsubscribe = subscribe(roomCode, send);

      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(": ping\n\n"));
      }, 20000);

      req.signal.addEventListener("abort", () => {
        release();
        clearInterval(keepAlive);
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
