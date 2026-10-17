"use client";
import { useEffect, useState } from "react";
import {
  createRoom,
  joinRoom,
  renamePlayer,
  setReady,
  flipCard,
  rematch,
} from "@/app/actions";
// ============ ICONS: مسیر عکس‌ها | View: نوع داده‌ای که از سرور می‌آید ===========
import { ICONS } from "@/lib/icons";
import type { View } from "@/lib/game";

// ============ صفحه‌هایی که بازیکن می‌بیند: خانه، انتخاب حالت، تنظیمات، ورود با کد، اتاق و خداحافظی ===========
type Screen = "home" | "mode" | "setup" | "join" | "room" | "bye";
// ============ شکل پاسخ Server Action ها ===========
type Res = { ok: boolean; error?: string; code?: string; playerId?: string };
// ============ مسیرهای SVG: لبخند (خانه‌ی رایگان وسط جدول) و مداد (ویرایش نام) ===========
const SMILEY =
  '<circle cx="12" cy="12" r="10"/><circle cx="8.6" cy="9.6" r=".7" fill="currentColor"/><circle cx="15.4" cy="9.6" r=".7" fill="currentColor"/><path class="sm sm1" d="M8 14.2c1 1.6 2.4 2.3 4 2.3s3-.7 4-2.3"/><path class="sm sm2" d="M6.8 13.2c1.1 3.4 3 5 5.2 5s4.1-1.6 5.2-5z"/>';
const PENCIL =
  '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>';

// ============ کامپوننت کوچک برای رسم SVG از رشته‌ی مسیرها ===========
const Svg = ({ d }: { d: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    dangerouslySetInnerHTML={{ __html: d }}
  />
);
// ============ کادر طلایی وسط صفحه برای منوها ===========
const Box = ({
  children,
  wide,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) => (
  <main className="center">
    <div className={"box" + (wide ? " wide" : "")}>{children}</div>
  </main>
);
// ============ دکمه‌ی گزینه‌ای برای انتخاب اندازه‌ی جدول و مدت بازی ===========
const Chip = ({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button className={"chip" + (on ? " on" : "")} onClick={onClick}>
    {children}
  </button>
);
// ============ لوگوی بازی ===========
const Title = () => (
  <h1 className="logo">
    CODE<span>MATCH</span>
  </h1>
);

// ============ کامپوننت اصلی بازی: همه‌ی صفحه‌ها و وضعیت بازی در همین‌جا مدیریت می‌شود ===========
export default function Game() {
  // ============ state ها: صفحه‌ی فعلی، نشست بازیکن (کد اتاق + شناسه)، نمای اتاق از سرور، اختلاف ساعت با سرور، ==========
  // ============ زمان فعلی، پیام خطا، تنظیمات اتاق، کد واردشده، وضعیت کپی و ویرایش نام ===========
  const [screen, setScreen] = useState<Screen>("home");
  const [sess, setSess] = useState<{ code: string; pid: string } | null>(null);
  const [room, setRoom] = useState<View | null>(null);
  const [skew, setSkew] = useState(0);
  const [now, setNow] = useState(0);
  const [err, setErr] = useState("");
  const [size, setSize] = useState(4);
  const [mins, setMins] = useState(3);
  const [codeIn, setCodeIn] = useState("");
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  useEffect(() => {
    // ============ پیش‌بارگذاری همه‌ی تصاویر در مرورگر تا موقع رو شدن کارت‌ها تأخیر نداشته باشند ===========
    Object.values(ICONS).forEach((src) => {
      new Image().src = src;
    });
  }, []);

  useEffect(() => {
    // ============ بعد از رفرش صفحه، نشست ذخیره‌شده خوانده می‌شود و بازیکن به همان اتاق برمی‌گردد. ===========
    // ============ همچنین هر ۲۵۰ میلی‌ثانیه زمان فعلی به‌روز می‌شود (برای تایمر بازی) ===========
    const s = sessionStorage.getItem("cm");
    if (s) {
      setSess(JSON.parse(s));
      setScreen("room");
    }
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  // ============ خروج از اتاق: پاک کردن نشست و برگشت به صفحه‌ی اول ===========
  const leave = () => {
    sessionStorage.removeItem("cm");
    setSess(null);
    setRoom(null);
    setScreen("home");
  };
  useEffect(() => {
    if (!sess) return;
    // ============ اتصال زنده به سرور با SSE: هر تغییر اتاق (نوبت، کارت، امتیاز) فوراً می‌رسد. ===========
    // ============ اگر اتاق دیگر وجود نداشته باشد اتصال بسته می‌شود و بازیکن از بازی خارج می‌شود ===========
    const es = new EventSource(`/api/rooms/${sess.code}/events`);
    es.onmessage = (e) => {
      const v: View = JSON.parse(e.data);
      setRoom(v);
      setSkew(v.now - Date.now());
    };
    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) leave();
    };
    return () => es.close();
  }, [sess]);

  // ============ تغییر صفحه و پاک کردن خطای قبلی ===========
  const go = (s: Screen) => {
    setErr("");
    setScreen(s);
  };
  // ============ بعد از ساخت یا ورود به اتاق: نشست در sessionStorage ذخیره و وارد اتاق می‌شویم ===========
  const enter = (r: Res) => {
    if (!r.ok) return setErr(r.error ?? "Something went wrong");
    const s = { code: r.code!, pid: r.playerId! };
    sessionStorage.setItem("cm", JSON.stringify(s));
    setSess(s);
    go("room");
  };
  // ============ دکمه‌ی خروج: تلاش برای بستن تب؛ اگر نشد پیام خداحافظی نشان داده می‌شود ===========
  const exit = () => {
    window.close();
    setTimeout(() => go("bye"), 200);
  };
  // ============ کپی کد اتاق؛ اگر clipboard امن در دسترس نبود (مثلاً HTTP روی شبکه‌ی محلی) از روش قدیمی textarea استفاده می‌شود ===========
  const copy = (t: string) => {
    if (navigator.clipboard && window.isSecureContext)
      navigator.clipboard.writeText(t);
    else {
      const a = document.createElement("textarea");
      a.value = t;
      document.body.appendChild(a);
      a.select();
      document.execCommand("copy");
      a.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // ============ صفحه‌ی اول: شروع بازی یا خروج ===========
  if (screen === "home")
    return (
      <Box>
        <Title />
        <p className="sub">A two-player memory game</p>
        <button className="btn gold" onClick={() => go("mode")}>
          Start Game
        </button>
        <button className="btn" onClick={exit}>
          Exit
        </button>
      </Box>
    );
  // ============ صفحه‌ی خداحافظی ===========
  if (screen === "bye")
    return (
      <Box>
        <Title />
        <p className="sub">Thanks for playing! You can close this tab.</p>
      </Box>
    );
  // ============ انتخاب اینکه اتاق بسازیم یا به اتاق دوستمان وارد شویم ===========
  if (screen === "mode")
    return (
      <Box>
        <h2>Play with a friend</h2>
        <button className="btn gold" onClick={() => go("setup")}>
          Create Room
        </button>
        <button className="btn" onClick={() => go("join")}>
          Join Room
        </button>
        <button className="link" onClick={() => go("home")}>
          Back
        </button>
      </Box>
    );
  // ============ تنظیمات اتاق: اندازه‌ی جدول و مدت بازی؛ در جدول فرد خانه‌ی وسط رایگان است ===========
  if (screen === "setup")
    return (
      <Box>
        <h2>Room settings</h2>
        <p className="sub">Grid</p>
        <div className="chips">
          {[3, 4, 5].map((n) => (
            <Chip key={n} on={size === n} onClick={() => setSize(n)}>
              {n}×{n}
            </Chip>
          ))}
        </div>
        <p className="sub">Duration</p>
        <div className="chips">
          {[3, 5, 7].map((m) => (
            <Chip key={m} on={mins === m} onClick={() => setMins(m)}>
              {m} min
            </Chip>
          ))}
        </div>
        {size % 2 === 1 && (
          <p className="hint">Odd grid: the centre tile is a free smiley.</p>
        )}
        {err && <p className="err">{err}</p>}
        <button
          className="btn gold"
          onClick={async () => enter(await createRoom(size, mins))}
        >
          Create Room
        </button>
        <button className="link" onClick={() => go("mode")}>
          Back
        </button>
      </Box>
    );
  // ============ ورود با کد ۵ رقمی؛ فقط رقم پذیرفته می‌شود و دکمه تا کامل شدن کد غیرفعال است ===========
  if (screen === "join")
    return (
      <Box>
        <h2>Join a room</h2>
        <input
          className="codein"
          inputMode="numeric"
          maxLength={5}
          placeholder="•••••"
          value={codeIn}
          onChange={(e) => setCodeIn(e.target.value.replace(/\D/g, ""))}
        />
        {err && <p className="err">{err}</p>}
        <button
          className="btn gold"
          disabled={codeIn.length !== 5}
          onClick={async () => enter(await joinRoom(codeIn))}
        >
          Join
        </button>
        <button className="link" onClick={() => go("mode")}>
          Back
        </button>
      </Box>
    );

  // ============ تا رسیدن اولین داده از سرور، پیام «در حال اتصال» نشان داده می‌شود ===========
  if (!room || !sess)
    return (
      <Box>
        <p className="sub">Connecting…</p>
      </Box>
    );
  // ============ me: جایگاه بازیکن فعلی (۰ یا ۱) در فهرست دو نفره ===========
  const me = room.players.findIndex((p) => p.id === sess.pid);
  const commit = () => {
    setEditing(false);
    renamePlayer(room.code, sess.pid, draft);
  };

  // ============ لابی: نمایش کد اتاق، نام بازیکن‌ها و دکمه‌ی آماده؛ وقتی هر دو آماده شوند سرور بازی را شروع می‌کند ===========
  if (room.phase === "lobby")
    return (
      <Box wide>
        <p className="sub">Room code</p>
        <div className="code">{room.code}</div>
        <button className="btn small" onClick={() => copy(room.code)}>
          {copied ? "Copied!" : "Copy code"}
        </button>
        <p className="sub">
          {room.size}×{room.size} · {room.minutes} min
        </p>
        <div className="slots">
          {[0, 1].map((i) => {
            const p = room.players[i];
            if (!p)
              return (
                <div key={i} className="slot empty">
                  Waiting for a friend…
                </div>
              );
            return (
              <div key={p.id} className={"slot" + (p.ready ? " ready" : "")}>
                {editing && i === me ? (
                  <input
                    autoFocus
                    maxLength={12}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commit}
                    onKeyDown={(e) => e.key === "Enter" && commit()}
                  />
                ) : (
                  <span className="nm">
                    {p.name}
                    {i === me && <b> (you)</b>}
                  </span>
                )}
                {i === me && !editing && (
                  <button
                    className="pen"
                    aria-label="Edit name"
                    onClick={() => {
                      setDraft(p.name);
                      setEditing(true);
                    }}
                  >
                    <Svg d={PENCIL} />
                  </button>
                )}
                <span className="tag">{p.ready ? "READY" : "NOT READY"}</span>
              </div>
            );
          })}
        </div>
        <button
          className="btn gold"
          disabled={room.players.length < 2 || me < 0}
          onClick={() => setReady(room.code, sess.pid, !room.players[me].ready)}
        >
          {room.players[me]?.ready ? "Cancel" : "I'm Ready"}
        </button>
        <button className="link" onClick={leave}>
          Leave room
        </button>
      </Box>
    );

  // ============ صفحه‌ی نتیجه: برنده، امتیاز و تعداد اشتباه‌ها و دکمه‌ی بازی دوباره ===========
  if (room.phase === "finished") {
    const w = room.players.find((p) => p.id === room.winner);
    return (
      <Box wide>
        <p className="sub">
          {Date.now() + skew >= room.endsAt ? "Time's up" : "All pairs found"}
        </p>
        <h2>{w ? `${w.name} wins!` : "It's a draw!"}</h2>
        <div className="slots">
          {room.players.map((p) => (
            <div
              key={p.id}
              className={"slot" + (p.id === room.winner ? " ready" : "")}
            >
              <span className="nm">{p.name}</span>
              <span className="tag">
                {p.score} pts · {p.wrong} misses
              </span>
            </div>
          ))}
        </div>
        <button className="btn gold" onClick={() => rematch(room.code)}>
          Rematch
        </button>
        <button className="btn" onClick={leave}>
          Home
        </button>
      </Box>
    );
  }

  // ============ زمان باقی‌مانده = زمان پایان (از سرور) − زمان فعلی؛ با جبران اختلاف ساعت کلاینت و سرور ===========
  const left = Math.max(0, room.endsAt - (now + skew)),
    total = room.minutes * 60000;
  const mm = Math.floor(left / 60000),
    ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");
  // ============ فقط در نوبت خودم می‌توانم کارت بزنم ===========
  const myTurn = room.turn === me;
  return (
    <main className="play">
      <div className="hud">
        {room.players.map((p, i) => (
          <div key={p.id} className={"pl" + (room.turn === i ? " active" : "")}>
            <span className="nm">{p.name}</span>
            <span className="pts">{p.score}</span>
            {p.streak > 1 && <span className="combo">×{p.streak} combo</span>}
          </div>
        ))}
      </div>
      <div className="time">
        <span>
          {mm}:{ss}
        </span>
        <div className="bar">
          <i style={{ width: `${(left / total) * 100}%` }} />
        </div>
      </div>
      <p className="turn">
        {myTurn ? "Your turn" : `${room.players[room.turn].name}'s turn`}
      </p>
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${room.size}, 1fr)` }}
      >
        {/* ============ رسم کارت‌ها: با کلاس up می‌چرخند، با done (جفت‌شده) طلایی می‌شوند و فقط در نوبت من و برای کارت رو به پشت قابل کلیک‌اند =========== */}
        {room.cards.map((c) => (
          <button
            key={c.id}
            aria-label="card"
            className={
              "card" +
              (c.status !== "hidden" ? " up" : "") +
              (c.status === "matched" ? " done" : "") +
              (c.status === "free" ? " free" : "")
            }
            disabled={!myTurn || c.status !== "hidden"}
            onClick={() => flipCard(room.code, sess.pid, c.id)}
          >
            <span className="in">
              {/* ============ پشت کارت (نوشته‌ی CODE MATCH) =========== */}
              <span className="back">
                <span>CODE</span>
                <span>MATCH</span>
              </span>
              <span className="face">
                {/* ============ روی کارت: برای خانه‌ی رایگان لبخند، برای بقیه تصویر حیوان (از مسیر /assets/aN.png) =========== */}
                {c.status === "free" ? (
                  <Svg d={SMILEY} />
                ) : (
                  <img src={ICONS[c.icon ?? ""]} alt="" draggable={false} />
                )}
              </span>
            </span>
          </button>
        ))}
      </div>
    </main>
  );
}
