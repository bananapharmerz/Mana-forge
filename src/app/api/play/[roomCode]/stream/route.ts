import { getRoom, subscribe } from "@/lib/gameRooms";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await params;

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
