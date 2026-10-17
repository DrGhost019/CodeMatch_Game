// ============ این فایل فقط روی سرور اجرا می‌شود؛ server-only جلوی import شدن آن در کد مرورگر را می‌گیرد ===========
import "server-only";
// ============ فهرست تصاویر کارت‌ها از فایل icons.ts ===========
import { ICONS } from "./icons";

// ============ بازیکن: شناسه، نام، آماده بودن، امتیاز، تعداد جفت‌های درست پشت‌سرهم (streak) و تعداد اشتباه‌ها ===========
export type Player = {
  id: string;
  name: string;
  ready: boolean;
  score: number;
  streak: number;
  wrong: number;
};
// ============ کارت: icon نام تصویر است و status یکی از چهار حالت است: ===========
// ============ hidden (رو به پشت)، up (رو شده)، matched (جفت شده)، free (خانه‌ی رایگان وسط جدول فرد) ===========
type Card = {
  id: number;
  icon: string;
  status: "hidden" | "up" | "matched" | "free";
};
// ============ اتاق بازی: تنظیمات، بازیکن‌ها، مرحله‌ی بازی (lobby / playing / finished)، کارت‌ها، ===========
// ============ نوبت، کارت‌های انتخاب‌شده‌ی فعلی (pending)، زمان پایان بازی و برنده ===========
export type Room = {
  code: string;
  size: number;
  minutes: number;
  players: Player[];
  phase: "lobby" | "playing" | "finished";
  cards: Card[];
  turn: number;
  pending: number[];
  endsAt: number;
  round: number;
  winner: string | null;
  timer?: ReturnType<typeof setTimeout>;
};
// ============ نسخه‌ای از اتاق که به مرورگر فرستاده می‌شود: بدون تایمر داخلی و بدون آیکون کارت‌های رو به پشت ===========
export type View = Omit<Room, "cards" | "timer"> & {
  cards: { id: number; status: Card["status"]; icon?: string }[];
  now: number;
};

// ============ وضعیت همه‌ی اتاق‌ها در حافظه‌ی سرور و روی globalThis نگهداری می‌شود تا با hot reload پاک نشود (فقط یک پروسه‌ی سرور باید اجرا باشد) ===========
// ============ rooms: اتاق‌ها بر اساس کد ۵ رقمی | subs: شنونده‌های هر اتاق برای ارسال لحظه‌ای تغییرات ===========
const g = globalThis as unknown as {
  rooms?: Map<string, Room>;
  subs?: Map<string, Set<(v: View) => void>>;
};
const rooms = (g.rooms ??= new Map<string, Room>());
const subs = (g.subs ??= new Map<string, Set<(v: View) => void>>());

// ============ ساخت شناسه‌ی تصادفی کوتاه برای بازیکن ===========
const uid = () => Math.random().toString(36).slice(2, 10);
// ============ ساخت بازیکن جدید با امتیاز صفر ===========
const player = (name: string): Player => ({
  id: uid(),
  name,
  ready: false,
  score: 0,
  streak: 0,
  wrong: 0,
});
// ============ برهم‌زدن تصادفی آرایه (الگوریتم Fisher-Yates) بدون تغییر دادن آرایه‌ی اصلی ===========
function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

// ============ تبدیل اتاق به چیزی که کلاینت می‌بیند: آیکون کارت‌های رو به پشت هرگز فرستاده نمی‌شود تا کسی با DevTools تقلب نکند ===========
export function view(r: Room): View {
  const { cards, timer, ...rest } = r;
  void timer;
  return {
    ...rest,
    now: Date.now(),
    cards: cards.map((c) =>
      c.status === "hidden"
        ? { id: c.id, status: c.status }
        : { id: c.id, status: c.status, icon: c.icon },
    ),
  };
}
// ============ گرفتن نمای یک اتاق با کد آن (اگر اتاق نباشد null) ===========
export const getView = (code: string) => {
  const r = rooms.get(code);
  return r ? view(r) : null;
};
// ============ ارسال نمای جدید اتاق به همه‌ی مشترک‌ها (هر دو بازیکن) ===========
const publish = (r: Room) => subs.get(r.code)?.forEach((f) => f(view(r)));
// ============ ثبت یک شنونده برای اتاق؛ تابعی که برمی‌گرداند شنونده را حذف می‌کند (برای وقتی اتصال قطع می‌شود) ===========
export function subscribe(code: string, f: (v: View) => void) {
  const s = subs.get(code) ?? new Set<(v: View) => void>();
  subs.set(code, s);
  s.add(f);
  return () => {
    s.delete(f);
  };
}

// ============ ساخت اتاق جدید با کد ۵ رقمی یکتا؛ سازنده بازیکن ۱ می‌شود ==========
export function create(size: number, minutes: number) {
  let code = "";
  do {
    code = String(10000 + Math.floor(Math.random() * 90000));
  } while (rooms.has(code));
  const p = player("Player 1");
  rooms.set(code, {
    code,
    size,
    minutes,
    players: [p],
    phase: "lobby",
    cards: [],
    turn: 0,
    pending: [],
    endsAt: 0,
    round: 0,
    winner: null,
  });
  return { code, playerId: p.id };
}
// ============ ورود بازیکن دوم؛ اگر اتاق وجود نداشته باشد یا پر باشد (حداکثر ۲ نفر) خطا برمی‌گردد ===========
export function join(code: string): { playerId?: string; error?: string } {
  const r = rooms.get(code);
  if (!r) return { error: "Room not found" };
  if (r.players.length >= 2) return { error: "Room is full" };
  const p = player("Player 2");
  r.players.push(p);
  publish(r);
  return { playerId: p.id };
}
// ============ تغییر نام بازیکن (حداکثر ۱۲ کاراکتر؛ اگر خالی باشد نام پیش‌فرض برمی‌گردد) ===========
export function rename(code: string, pid: string, name: string) {
  const r = rooms.get(code),
    p = r?.players.find((x) => x.id === pid);
  if (r && p) {
    p.name =
      name.trim().slice(0, 12) ||
      (r.players[0] === p ? "Player 1" : "Player 2");
    publish(r);
  }
}
// ============ تغییر وضعیت «آماده»؛ وقتی هر دو بازیکن آماده شوند بازی شروع می‌شود ===========
export function setReady(code: string, pid: string, ready: boolean) {
  const r = rooms.get(code),
    p = r?.players.find((x) => x.id === pid);
  if (!r || !p || r.phase !== "lobby") return;
  p.ready = ready;
  if (r.players.length === 2 && r.players.every((x) => x.ready)) start(r);
  publish(r);
}

// ============ شروع هر دور بازی: چینش جدید و تصادفی کارت‌ها ساخته می‌شود ===========
function start(r: Room) {
  // ============ تعداد کل خانه‌ها؛ در جدول فرد (۳×۳ و ۵×۵) خانه‌ی وسط «رایگان» است و جفت ندارد ===========
  const total = r.size * r.size,
    free = total % 2 ? (total - 1) / 2 : -1;
  // ============ انتخاب تصادفی به‌اندازه‌ی نصف خانه‌ها از بین همه‌ی تصاویر موجود ===========
  const icons = shuffle(Object.keys(ICONS)).slice(0, Math.floor(total / 2));
  // ============ هر تصویر دو بار قرار می‌گیرد و دوباره برهم زده می‌شود تا جای جفت‌ها تصادفی شود ===========
  const faces = shuffle([...icons, ...icons]);
  // ============ ساخت کارت‌ها: همه رو به پشت هستند (به‌جز خانه‌ی رایگان) و با faces.pop() تصویر می‌گیرند ===========
  r.cards = Array.from(
    { length: total },
    (_, i) =>
      (i === free
        ? { id: i, icon: "", status: "free" }
        : { id: i, icon: faces.pop()!, status: "hidden" }) as Card,
  );
  // ============ صفر کردن امتیاز و اشتباه‌های بازیکن‌ها برای دور جدید ===========
  r.players.forEach((p) => Object.assign(p, { score: 0, streak: 0, wrong: 0 }));
  // ============ شروع بازی؛ نوبت اول در هر دور بین دو بازیکن عوض می‌شود (round % 2) ===========
  r.phase = "playing";
  r.turn = r.round % 2;
  r.pending = [];
  r.winner = null;
  r.round++;
  // ============ زمان پایان بازی؛ با setTimeout وقتی مدت تمام شد بازی خودکار تمام می‌شود ===========
  r.endsAt = Date.now() + r.minutes * 60000;
  clearTimeout(r.timer);
  r.timer = setTimeout(() => finish(r), r.minutes * 60000);
}
// ============ پایان بازی (فقط یک‌بار اجرا می‌شود) و تعیین برنده ===========
function finish(r: Room) {
  if (r.phase !== "playing") return;
  clearTimeout(r.timer);
  r.phase = "finished";
  const [a, b] = r.players;
  // ============ برنده: امتیاز بیشتر؛ اگر مساوی بود اشتباه کمتر؛ اگر باز هم مساوی بود نتیجه مساوی (draw) ===========
  r.winner =
    a.score !== b.score
      ? a.score > b.score
        ? a.id
        : b.id
      : a.wrong !== b.wrong
        ? a.wrong < b.wrong
          ? a.id
          : b.id
        : "draw";
  publish(r);
}
// ============ بازی دوباره: برگشت به لابی با امتیاز صفر و وضعیت «آماده نیست» ===========
export function rematch(code: string) {
  const r = rooms.get(code);
  if (!r || r.phase !== "finished") return;
  r.phase = "lobby";
  r.cards = [];
  r.winner = null;
  r.players.forEach((p) =>
    Object.assign(p, { ready: false, score: 0, streak: 0, wrong: 0 }),
  );
  publish(r);
}

// ============ برگرداندن یک کارت توسط بازیکن. اعتبارسنجی سمت سرور: ===========
// ============ بازی در حال انجام باشد، نوبت همان بازیکن باشد و حداکثر ۲ کارت انتخاب شده باشد ===========
export function flip(code: string, pid: string, id: number) {
  const r = rooms.get(code);
  if (
    !r ||
    r.phase !== "playing" ||
    r.players[r.turn]?.id !== pid ||
    r.pending.length >= 2
  )
    return;
  // ============ کارت باید وجود داشته باشد و رو به پشت باشد ===========
  const c = r.cards[id];
  if (!c || c.status !== "hidden") return;
  // ============ کارت رو می‌شود و به فهرست کارت‌های انتخاب‌شده اضافه می‌شود ===========
  c.status = "up";
  r.pending.push(id);
  // ============ وقتی دو کارت رو شد، تصویرشان مقایسه می‌شود ===========
  if (r.pending.length === 2) {
    const [a, b] = r.pending.map((i) => r.cards[i]),
      p = r.players[r.turn];
    // ============ جفت درست: ۱۰ امتیاز + ۵ امتیاز برای هر جفت درستِ پشت‌سرهمِ قبلی (combo)؛ نوبت همان بازیکن می‌ماند ===========
    if (a.icon === b.icon) {
      a.status = b.status = "matched";
      p.score += 10 + 5 * p.streak;
      p.streak++;
      r.pending = [];
      // ============ اگر همه‌ی کارت‌ها جفت شده باشند بازی تمام می‌شود ===========
      if (r.cards.every((x) => x.status === "matched" || x.status === "free"))
        finish(r);
    } else {
      // ============ جفت اشتباه: combo صفر می‌شود و یک اشتباه ثبت می‌شود؛ ===========
      // ============ بعد از ۱ ثانیه کارت‌ها دوباره رو به پشت می‌شوند و نوبت به حریف می‌رسد ===========
      p.streak = 0;
      p.wrong++;
      setTimeout(() => {
        if (r.phase !== "playing") return;
        a.status = b.status = "hidden";
        r.pending = [];
        r.turn = 1 - r.turn;
        publish(r);
      }, 1000);
    }
  }
  publish(r);
}
