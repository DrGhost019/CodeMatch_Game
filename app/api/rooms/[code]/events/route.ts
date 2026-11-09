import { getView, subscribe } from "@/lib/game";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code } = await ctx.params;
  if (!getView(code)) return new Response("Room not found", { status: 404 });
  const enc = new TextEncoder();
  let off = () => {},
    beat: ReturnType<typeof setInterval> | undefined;
  const stream = new ReadableStream({
    start(ctrl) {
      const send = (v: unknown) =>
        ctrl.enqueue(enc.encode(`data: ${JSON.stringify(v)}\n\n`));
      send(getView(code)); 
      off = subscribe(code, send);
      beat = setInterval(() => ctrl.enqueue(enc.encode(": ping\n\n")), 15000);
      req.signal.addEventListener("abort", () => {
        off();
        clearInterval(beat);
        ctrl.close();
      });
    },
    cancel() {
      off();
      clearInterval(beat);
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
