// ============ ساخت خودکار فهرست ۵۰ تصویر: کلید a1 تا a50 و مقدار آن مسیر عکس در پوشه‌ی public/assets (مثلاً /assets/a1.png) ==========
export const ICONS: Record<string, string> = Object.fromEntries(
  Array.from({ length: 50 }, (_, i) => [`a${i + 1}`, `/assets/a${i + 1}.png`]),
);
