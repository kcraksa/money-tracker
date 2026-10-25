import { addDays } from "./date";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const MAX_AMOUNT = 1_000_000_000;
/** Mencatat/mengubah pengeluaran boleh mundur sejauh ini (hari). */
export const MAX_BACKDATE_DAYS = 62;

/** Nominal bulat 1..MAX_AMOUNT, atau null bila tidak valid. */
export function cleanAmount(v: unknown): number | null {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 && n <= MAX_AMOUNT ? n : null;
}

/** Tanggal ISO yang tidak di masa depan dan tidak lebih lama dari batas mundur; selain itu null. */
export function cleanSpentOn(v: unknown, today: string, maxBack = MAX_BACKDATE_DAYS): string | null {
  if (typeof v !== "string" || !DATE.test(v)) return null;
  if (Number.isNaN(Date.parse(v))) return null;
  return v <= today && v >= addDays(today, -maxBack) ? v : null;
}
