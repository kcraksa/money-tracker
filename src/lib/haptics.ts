/** Getaran singkat (Android). Di perangkat tanpa dukungan tidak melakukan apa-apa. */
const PATTERNS = {
  tap: 8,
  select: 12,
  success: [10, 40, 12],
  warn: [20, 50, 20],
} as const;

export function haptic(kind: keyof typeof PATTERNS = "tap") {
  try {
    navigator.vibrate?.(PATTERNS[kind] as number | number[]);
  } catch {}
}
