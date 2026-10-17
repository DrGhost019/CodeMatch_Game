import { getView, subscribe } from "@/lib/game";

// ============ اتصال زنده‌ی SSE (Server-Sent Events): مرورگر یک‌بار وصل می‌شود و سرور هر تغییر اتاق را فوراً به آن می‌فرستد ===========
export async function GET(
  req: Request,
  ctx: { params: Promise<{ code: string }> },
) {
  // ============ کد اتاق از آدرس خوانده می‌شود: /api/rooms/[code]/events ===========
  const { code } = await ctx.params;
  // ============ اگر اتاق وجود نداشته باشد پاسخ 404 داده می‌شود ===========
  if (!getView(code)) return new Response("Room not found", { status: 404 });
  // ============ تبدیل متن به بایت برای ارسال در جریان (stream) ===========
  const enc = new TextEncoder();
  let off = () => {},
    beat: ReturnType<typeof setInterval> | undefined;
  const stream = new ReadableStream({
    start(ctrl) {
      // ============ ارسال یک پیام در قالب SSE: «data: ...» و یک خط خالی ===========
      const send = (v: unknown) =>
        ctrl.enqueue(enc.encode(`data: ${JSON.stringify(v)}\n\n`));
      // ============ اولین پیام: وضعیت فعلی اتاق بلافاصله بعد از اتصال ===========
      send(getView(code));
      // ============ از این به بعد هر تغییر اتاق با تابع send برای این مرورگر فرستاده می‌شود ===========
      off = subscribe(code, send);
      // ============ هر ۱۵ ثانیه یک پیام ping تا اتصال بیکار بسته نشود ==========
      beat = setInterval(() => ctrl.enqueue(enc.encode(": ping\n\n")), 15000);
      // ============ وقتی مرورگر اتصال را قطع کرد، شنونده و ping پاک می‌شوند ===========
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
  // ============ هدر text/event-stream به مرورگر می‌گوید این یک جریان SSE است و نباید کش شود ===========
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
