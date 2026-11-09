export const ICONS: Record<string, string> = Object.fromEntries(
  Array.from({ length: 50 }, (_, i) => [`a${i + 1}`, `/assets/a${i + 1}.png`]),
);
