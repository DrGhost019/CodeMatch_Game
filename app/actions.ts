"use server";
// ============ Server Action ها: توابعی که مرورگر مستقیم صدا می‌زند ولی روی سرور اجرا می‌شوند. ===========
// ============ هر کدام ورودی را اعتبارسنجی می‌کند و کار اصلی را به lib/game.ts می‌سپارد ===========
import * as game from "@/lib/game";

// ============ شکل پاسخی که به مرورگر برگردانده می‌شود ==========
type Res = { ok: boolean; error?: string; code?: string; playerId?: string };
// ============ بررسی اینکه کد اتاق دقیقاً ۵ رقم باشد (ورودی‌ها از شبکه می‌آیند و قابل اعتماد نیستند) ===========
const okCode = (c: unknown): c is string =>
  typeof c === "string" && /^\d{5}$/.test(c);

// ============ ساخت اتاق: فقط جدول ۳، ۴، ۵ و زمان ۳، ۵، ۷ دقیقه مجاز است ===========
export async function createRoom(size: number, minutes: number): Promise<Res> {
  if (![3, 4, 5].includes(size) || ![3, 5, 7].includes(minutes))
    return { ok: false, error: "Invalid settings" };
  return { ok: true, ...game.create(size, minutes) };
}
// ============ ورود به اتاق با کد ===========
export async function joinRoom(code: string): Promise<Res> {
  if (!okCode(code)) return { ok: false, error: "Enter a 5-digit code" };
  const r = game.join(code);
  return r.error
    ? { ok: false, error: r.error }
    : { ok: true, code, playerId: r.playerId };
}
// ============ تغییر نام بازیکن ===========
export async function renamePlayer(code: string, pid: string, name: string) {
  if (okCode(code)) game.rename(code, String(pid), String(name));
}
// ============ آماده / نا‌آماده شدن بازیکن ===========
export async function setReady(code: string, pid: string, ready: boolean) {
  if (okCode(code)) game.setReady(code, String(pid), !!ready);
}
// ============ برگرداندن کارت؛ شماره‌ی کارت باید عدد صحیح باشد ===========
export async function flipCard(code: string, pid: string, id: number) {
  if (okCode(code) && Number.isInteger(id)) game.flip(code, String(pid), id);
}
// ============ درخواست بازی دوباره ===========
export async function rematch(code: string) {
  if (okCode(code)) game.rematch(code);
}
