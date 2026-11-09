"use server";
import * as game from "@/lib/game";

type Res = { ok: boolean; error?: string; code?: string; playerId?: string };
const okCode = (c: unknown): c is string =>
  typeof c === "string" && /^\d{5}$/.test(c); 

export async function createRoom(size: number, minutes: number): Promise<Res> {
  if (![3, 4, 5].includes(size) || ![3, 5, 7].includes(minutes))
    return { ok: false, error: "Invalid settings" };
  return { ok: true, ...game.create(size, minutes) };
}
export async function joinRoom(code: string): Promise<Res> {
  if (!okCode(code)) return { ok: false, error: "Enter a 5-digit code" };
  const r = game.join(code);
  return r.error
    ? { ok: false, error: r.error }
    : { ok: true, code, playerId: r.playerId };
}
export async function renamePlayer(code: string, pid: string, name: string) {
  if (okCode(code)) game.rename(code, String(pid), String(name));
}
export async function setReady(code: string, pid: string, ready: boolean) {
  if (okCode(code)) game.setReady(code, String(pid), !!ready);
}
export async function flipCard(code: string, pid: string, id: number) {
  if (okCode(code) && Number.isInteger(id)) game.flip(code, String(pid), id);
}
export async function rematch(code: string) {
  if (okCode(code)) game.rematch(code);
}
