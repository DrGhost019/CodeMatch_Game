import type { Metadata, Viewport } from "next";
import "./globals.css";
// ============ عنوان تب مرورگر ===========
export const metadata: Metadata = { title: "Code Match" };
// ============ تنظیم نمایش مناسب موبایل ===========
export const viewport: Viewport = { width: "device-width", initialScale: 1 };
// ============ قالب کلی HTML که دور همه‌ی صفحه‌ها قرار می‌گیرد؛ استایل سراسری (globals.css) در بالای فایل وارد شده است ==========
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
