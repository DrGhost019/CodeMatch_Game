import "server-only";
import { ICONS } from "./icons";

export type Player = { id: string; name: string; ready: boolean; score: number; streak: number; wrong: number };
type Card = { id: number; icon: string; status: "hidden" | "up" | "matched" | "free" };
export type Room = {
  code: string; size: number; minutes: number; players: Player[];
  phase: "lobby" | "playing" | "finished"; cards: Card[];
  turn: number; pending: number[]; endsAt: number; round: number;
  winner: string | null;            
  timer?: ReturnType<typeof setTimeout>;
};
export type View = Omit<Room, "cards" | "timer"> & {
  cards: { id: number; status: Card["status"]; icon?: string }[]; now: number;
};

const g = globalThis as unknown as { rooms?: Map<string, Room>; subs?: Map<string, Set<(v: View) => void>> };
const rooms = (g.rooms ??= new Map<string, Room>());
const subs = (g.subs ??= new Map<string, Set<(v: View) => void>>());

const uid = () => Math.random().toString(36).slice(2, 10);
const player = (name: string): Player => ({ id: uid(), name, ready: false, score: 0, streak: 0, wrong: 0 });
function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

export function view(r: Room): View {
  const { cards, timer, ...rest } = r; void timer;
  return { ...rest, now: Date.now(), cards: cards.map((c) => c.status === "hidden" ? { id: c.id, status: c.status } : { id: c.id, status: c.status, icon: c.icon }) };
}
export const getView = (code: string) => { const r = rooms.get(code); return r ? view(r) : null; };
const publish = (r: Room) => subs.get(r.code)?.forEach((f) => f(view(r)));
export function subscribe(code: string, f: (v: View) => void) {
  const s = subs.get(code) ?? new Set<(v: View) => void>(); subs.set(code, s); s.add(f);
  return () => { s.delete(f); };
}

export function create(size: number, minutes: number) {
  let code = ""; do { code = String(10000 + Math.floor(Math.random() * 90000)); } while (rooms.has(code));
  const p = player("Player 1");
  rooms.set(code, { code, size, minutes, players: [p], phase: "lobby", cards: [], turn: 0, pending: [], endsAt: 0, round: 0, winner: null });
  return { code, playerId: p.id };
}
export function join(code: string): { playerId?: string; error?: string } {
  const r = rooms.get(code);
  if (!r) return { error: "Room not found" };
  if (r.players.length >= 2) return { error: "Room is full" };
  const p = player("Player 2"); r.players.push(p); publish(r);
  return { playerId: p.id };
}
export function rename(code: string, pid: string, name: string) {
  const r = rooms.get(code), p = r?.players.find((x) => x.id === pid);
  if (r && p) { p.name = name.trim().slice(0, 12) || (r.players[0] === p ? "Player 1" : "Player 2"); publish(r); }
}
export function setReady(code: string, pid: string, ready: boolean) {
  const r = rooms.get(code), p = r?.players.find((x) => x.id === pid);
  if (!r || !p || r.phase !== "lobby") return;
  p.ready = ready;
  if (r.players.length === 2 && r.players.every((x) => x.ready)) start(r);
  publish(r);
}

function start(r: Room) {
  const total = r.size * r.size, free = total % 2 ? (total - 1) / 2 : -1;  
  const icons = shuffle(Object.keys(ICONS)).slice(0, Math.floor(total / 2));
  const faces = shuffle([...icons, ...icons]);
  r.cards = Array.from({ length: total }, (_, i) =>
    (i === free ? { id: i, icon: "", status: "free" } : { id: i, icon: faces.pop()!, status: "hidden" }) as Card);
  r.players.forEach((p) => Object.assign(p, { score: 0, streak: 0, wrong: 0 }));
  r.phase = "playing"; r.turn = r.round % 2; r.pending = []; r.winner = null; r.round++;
  r.endsAt = Date.now() + r.minutes * 60000;
  clearTimeout(r.timer); r.timer = setTimeout(() => finish(r), r.minutes * 60000);
}
function finish(r: Room) {
  if (r.phase !== "playing") return;
  clearTimeout(r.timer); r.phase = "finished";
  const [a, b] = r.players;
  r.winner = a.score !== b.score ? (a.score > b.score ? a.id : b.id) : a.wrong !== b.wrong ? (a.wrong < b.wrong ? a.id : b.id) : "draw";
  publish(r);
}
export function rematch(code: string) {
  const r = rooms.get(code);
  if (!r || r.phase !== "finished") return;
  r.phase = "lobby"; r.cards = []; r.winner = null; r.players.forEach((p) => Object.assign(p, { ready: false, score: 0, streak: 0, wrong: 0 }));
  publish(r);
}

export function flip(code: string, pid: string, id: number) {
  const r = rooms.get(code);
  if (!r || r.phase !== "playing" || r.players[r.turn]?.id !== pid || r.pending.length >= 2) return;  
  const c = r.cards[id];
  if (!c || c.status !== "hidden") return;
  c.status = "up"; r.pending.push(id);
  if (r.pending.length === 2) {
    const [a, b] = r.pending.map((i) => r.cards[i]), p = r.players[r.turn];
    if (a.icon === b.icon) {                     
      a.status = b.status = "matched"; p.score += 10 + 5 * p.streak; p.streak++; r.pending = [];
      if (r.cards.every((x) => x.status === "matched" || x.status === "free")) finish(r);
    } else {                               
      p.streak = 0; p.wrong++;
      setTimeout(() => { if (r.phase !== "playing") return; a.status = b.status = "hidden"; r.pending = []; r.turn = 1 - r.turn; publish(r); }, 1000);
    }
  }
  publish(r);
}
