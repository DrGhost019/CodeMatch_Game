<div align="center">

# 🃏 CODE<span style="color:#d4af37">MATCH</span>

**A real-time, two-player memory card game for your local network.**
Flip cards, find the matching animal pairs, build combos, and beat your friend before the clock runs out.

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Realtime](https://img.shields.io/badge/Realtime-SSE-d4af37)
![Players](https://img.shields.io/badge/Players-2-success)

[English](#-english) · [فارسی](#-فارسی)

</div>

---

## 🇬🇧 English

### ✨ Features

- 🎮 **Two players, two devices** – one creates a room, the other joins with a 5-digit code
- ⚡ **Real-time sync** – every flip, score and turn change appears instantly on both screens (Server-Sent Events)
- 🐾 **50 animal images** – every round randomly picks a fresh set of pairs from a pool of 50
- 🔀 **New shuffle every round** – card positions change on every rematch
- 📐 **3 board sizes** – 3×3, 4×4 or 5×5 (on odd boards the centre tile is a free smiley 😊)
- ⏱️ **3 game lengths** – 3, 5 or 7 minutes, with a live countdown bar
- 🔥 **Combo scoring** – consecutive matches are worth more and more
- 🔁 **Rematch** – play again without creating a new room
- ♻️ **Reload-safe** – refresh the page and you return to the same room
- 🛡️ **Cheat-proof** – the server never sends the image of a face-down card to the browser
- 📱 **Responsive** – works on phones, tablets and desktops
- ✏️ **Rename yourself** in the lobby

### 🕹️ How to play

1. **Player 1** presses *Start Game → Create Room*, picks the grid size and duration, and shares the 5-digit room code.
2. **Player 2** opens the same address, presses *Join Room* and enters the code.
3. Both players press **I'm Ready** – the game starts automatically.
4. On your turn, flip two cards:
   - ✅ **Same picture** → you score and keep your turn.
   - ❌ **Different pictures** → the cards flip back after 1 second and the turn passes to your opponent.
5. The game ends when all pairs are found or the timer runs out.

### 🏆 Scoring

| Event | Result |
| --- | --- |
| Correct pair | **10 points** + **5 bonus points for every correct pair in a row before it** |
| Wrong pair | Combo resets to zero, one *miss* is recorded |
| Tie on points | The player with **fewer misses** wins |
| Tie on points and misses | **Draw** |

Example: three correct pairs in a row give 10 + 15 + 20 = **45 points**.

### 🚀 Getting started

**Requirements:** Node.js 20.9+ and npm.

```bash
git clone https://github.com/DrGhost019/CodeMatch_Game.git
cd CodeMatch_Game
npm install
```

The `dev` and `start` scripts in `package.json` bind the server to a fixed address:

```json
"dev":   "next dev   -H 10.201.105.114 -p 3000",
"start": "next start -H 10.201.105.114 -p 3000"
```

Replace `10.201.105.114` with **your computer's own address on the local network** (find it with `ipconfig` on Windows or `ip addr` on Linux/macOS), or use `0.0.0.0` to listen on every address.

```bash
# development
npm run dev

# production
npm run build
npm start
```

Then open `http://<your-ip>:3000` on **both devices** (same Wi-Fi or phone hotspot).

> ⚠️ Room state lives in the server's memory, so run **a single server process**. Restarting the server removes all rooms.

### 🧱 Tech stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| UI | React 19, plain CSS (3D card flip with `rotateY`) |
| Language | TypeScript (strict mode) |
| Client → server | Next.js **Server Actions** |
| Server → client | **Server-Sent Events** (`/api/rooms/[code]/events`) |
| State | In-memory `Map` on `globalThis` (survives hot reload) |

### 📂 Project structure

```
CodeMatch_Game/
├── app/
│   ├── actions.ts                      # Server Actions: create/join room, flip card, ready, rename, rematch
│   ├── api/rooms/[code]/events/
│   │   └── route.ts                    # SSE endpoint that streams room updates to the browser
│   ├── globals.css                     # Theme, layout and card-flip animation
│   ├── layout.tsx                      # Root HTML layout and page metadata
│   └── page.tsx                        # Home page – renders the game
├── components/
│   └── Game.tsx                        # The whole client UI: menus, lobby, board, result screen
├── lib/
│   ├── game.ts                         # Game engine: rooms, turns, scoring, timer, winner (server only)
│   └── icons.ts                        # Maps icon ids (a1…a50) to image paths
├── public/
│   └── assets/                         # 50 animal pictures: a1.png … a50.png
├── next.config.ts
├── tsconfig.json
└── package.json
```

### 🔧 How it works

```
 Browser A ──Server Action──▶ ┌─────────────┐ ◀──Server Action── Browser B
 (flip card)                  │  lib/game.ts │                   (flip card)
                              │  rooms: Map  │
 Browser A ◀────── SSE ────── └─────────────┘ ────── SSE ──────▶ Browser B
 (new state)                                                     (new state)
```

1. A player's click calls a **Server Action**. The server validates it (right room, right turn, card still face down).
2. The engine in `lib/game.ts` updates the room and **publishes** the new state.
3. Every connected browser receives it through its **SSE** connection and re-renders.
4. Before sending, `view()` strips the image of every face-down card, so nobody can peek with developer tools.

### 🖼️ Using your own pictures

1. Put square images in `public/assets/` named `a1.png`, `a2.png`, …
2. Set the number of images in `lib/icons.ts`:
   ```ts
   Array.from({ length: 50 }, ...) // change 50 to your image count
   ```
3. You need at least **12 images** for the biggest board (5×5 → 12 pairs).

> 💡 The pictures are 1024×1024 and about 22 MB in total. Resizing them to 256×256 (or converting to WebP) makes the game load much faster, especially on a phone hotspot.

### 🗺️ Ideas for the future

- Sound effects and card-flip animations
- Spectator mode
- More than two players
- Automatic cleanup of old rooms
- Persistent leaderboard

---

## 🇮🇷 فارسی

<div dir="rtl">

### 🃏 کدمَچ (Code Match)

یک بازی حافظه‌ی **دو نفره و آنلاین** برای شبکه‌ی محلی. کارت‌ها را برگردانید، جفت‌های یکسان حیوانات را پیدا کنید، کومبو بسازید و قبل از تمام شدن زمان حریف را شکست دهید.

### ✨ ویژگی‌ها

- 🎮 دو بازیکن روی دو دستگاه جدا؛ یکی اتاق می‌سازد و دیگری با **کد ۵ رقمی** وارد می‌شود
- ⚡ همگام‌سازی **لحظه‌ای** با Server-Sent Events؛ هر حرکت فوراً روی هر دو صفحه دیده می‌شود
- 🐾 **۵۰ تصویر حیوانات** که در هر دور به‌صورت تصادفی از بینشان جفت‌ها انتخاب می‌شوند
- 📐 جدول **۳×۳، ۴×۴ یا ۵×۵** (در جدول‌های فرد، خانه‌ی وسط یک لبخند رایگان است)
- ⏱️ بازی **۳، ۵ یا ۷ دقیقه‌ای** با نوار زمان زنده
- 🔥 امتیاز **کومبو** برای جفت‌های درست پشت‌سرهم
- 🔁 **بازی دوباره** بدون ساختن اتاق جدید
- ♻️ بعد از رفرش صفحه به همان اتاق برمی‌گردید
- 🛡️ **ضد تقلب**؛ سرور تصویر کارت‌های رو به پشت را هرگز برای مرورگر نمی‌فرستد

### 🕹️ نحوه‌ی بازی

1. **بازیکن اول** اتاق می‌سازد، اندازه‌ی جدول و مدت را انتخاب می‌کند و کد را به دوستش می‌دهد.
2. **بازیکن دوم** با «Join Room» و وارد کردن کد وارد می‌شود.
3. هر دو «I'm Ready» را می‌زنند و بازی خودکار شروع می‌شود.
4. در نوبت خودتان دو کارت را برگردانید:
   - ✅ **یکسان بودند** ← امتیاز می‌گیرید و نوبت همچنان با شماست.
   - ❌ **متفاوت بودند** ← بعد از ۱ ثانیه کارت‌ها برمی‌گردند و نوبت به حریف می‌رسد.
5. بازی با پیدا شدن همه‌ی جفت‌ها یا تمام شدن زمان پایان می‌یابد.

### 🏆 امتیازدهی

| رویداد | نتیجه |
| --- | --- |
| جفت درست | **۱۰ امتیاز** + **۵ امتیاز برای هر جفت درستِ پشت‌سرهمِ قبلی** |
| جفت اشتباه | کومبو صفر می‌شود و یک اشتباه ثبت می‌شود |
| امتیاز برابر | کسی که **اشتباه کمتری** دارد برنده است |
| امتیاز و اشتباه برابر | **مساوی** |

### 🚀 اجرا

```bash
git clone https://github.com/DrGhost019/CodeMatch_Game.git
cd CodeMatch_Game
npm install
npm run build
npm start
```

اسکریپت‌های `dev` و `start` در `package.json` روی یک IP ثابت (`10.201.105.114`) اجرا می‌شوند. این عدد را با **IP کامپیوتر خودتان** در شبکه عوض کنید (با `ipconfig` یا `ip addr` پیدایش کنید) یا از `0.0.0.0` استفاده کنید. بعد روی **هر دو دستگاه** (همان Wi-Fi یا هات‌اسپات) آدرس `http://<IP>:3000` را باز کنید.

> ⚠️ وضعیت اتاق‌ها در حافظه‌ی سرور است؛ فقط **یک پروسه‌ی سرور** اجرا کنید. با ری‌استارت سرور همه‌ی اتاق‌ها پاک می‌شوند.

### 🧱 فناوری‌ها

Next.js 16 (App Router) · React 19 · TypeScript · Server Actions · Server-Sent Events · CSS خالص با چرخش سه‌بعدی کارت

### 🔧 چطور کار می‌کند؟

1. کلیک بازیکن یک **Server Action** را صدا می‌زند و سرور آن را بررسی می‌کند (اتاق درست، نوبت درست، کارت هنوز رو به پشت).
2. موتور بازی در `lib/game.ts` اتاق را به‌روز می‌کند و وضعیت جدید را **منتشر** می‌کند.
3. مرورگر هر دو بازیکن از طریق **SSE** آن را می‌گیرد و صفحه را دوباره رسم می‌کند.
4. قبل از ارسال، تصویر کارت‌های رو به پشت حذف می‌شود تا با DevTools نشود تقلب کرد.

### 🖼️ استفاده از عکس‌های خودتان

عکس‌های مربعی را با نام‌های `a1.png`، `a2.png` و … در `public/assets/` بگذارید و عدد `50` را در `lib/icons.ts` با تعداد عکس‌هایتان عوض کنید. برای بزرگ‌ترین جدول (۵×۵) حداقل **۱۲ عکس** لازم است.

</div>

---

<div align="center">

Made with ❤️ by [DrGhost019](https://github.com/DrGhost019)

</div>
