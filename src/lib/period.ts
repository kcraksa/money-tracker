import { addDays, daysInMonth, monthStart } from "./date";

/**
 * Periode anggaran: dari gajian ke gajian berikutnya.
 * - `end` terisi bila gajian berikutnya sudah dicatat; null = periode masih berjalan.
 * - `plannedEnd` = perkiraan akhir (satu bulan sejak awal) dipakai untuk forecast.
 * - `explicit` false = periode bayangan berupa bulan kalender (belum ada gajian dicatat).
 */
export type Period = { start: string; plannedEnd: string; end: string | null; explicit: boolean };

const SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const FULL = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const dayNum = (iso: string) => Math.round(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86_400_000);
export const diffDays = (a: string, b: string) => dayNum(a) - dayNum(b);

/** Geser n bulan; tanggal 31 + 1 bulan jadi akhir bulan target, bukan loncat ke bulan berikutnya. */
export function addMonthsClamped(iso: string, n: number): string {
  const d = +iso.slice(8, 10);
  const first = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1 + n, 1));
  const y = first.getUTCFullYear();
  const m = first.getUTCMonth();
  const day = Math.min(d, new Date(Date.UTC(y, m + 1, 0)).getUTCDate());
  return new Date(Date.UTC(y, m, day)).toISOString().slice(0, 10);
}

const monthEnd = (iso: string) => monthStart(iso).slice(0, 8) + String(daysInMonth(iso)).padStart(2, "0");

export function resolvePeriod(starts: string[], today: string): Period {
  const sorted = [...starts].sort();
  let idx = -1;
  sorted.forEach((s, i) => { if (s <= today) idx = i; });

  if (idx === -1) {
    const start = monthStart(today);
    const next = sorted[0];
    const end = next && next > start ? addDays(next, -1) : null;
    return { start, plannedEnd: end ?? monthEnd(start), end, explicit: false };
  }
  const start = sorted[idx];
  const next = sorted[idx + 1];
  const end = next ? addDays(next, -1) : null;
  return { start, plannedEnd: end ?? addDays(addMonthsClamped(start, 1), -1), end, explicit: true };
}

/** Periode sebelumnya; sebelum gajian pertama dicatat, mundur per bulan kalender. */
export function previousPeriod(starts: string[], p: Period): Period | null {
  const before = [...starts].sort().filter((s) => s < p.start).at(-1);
  const end = addDays(p.start, -1);
  if (before) return { start: before, plannedEnd: end, end, explicit: true };
  const start = monthStart(end);
  if (start >= p.start) return null;
  return { start, plannedEnd: end, end, explicit: false };
}

/** Batas atas data periode: gajian berikutnya (kalau ada) atau hari ini. */
export const rangeEnd = (p: Period, today: string) => p.end ?? today;

export function elapsedDays(p: Period, today: string): number {
  const e = Math.max(1, diffDays(today, p.start) + 1);
  return p.end ? Math.min(e, diffDays(p.end, p.start) + 1) : e;
}

/** Panjang periode untuk forecast; kalau sudah lewat dari rencana, ikut jumlah hari berjalan. */
export function totalDays(p: Period, today: string): number {
  return Math.max(diffDays(p.plannedEnd, p.start) + 1, elapsedDays(p, today));
}

/** Periode sudah melewati perkiraan akhirnya tapi gajian baru belum dicatat. */
export const isOverdue = (p: Period, today: string) => p.explicit && p.end === null && today > p.plannedEnd;

export function periodLabel(p: Period): string {
  const end = p.end ?? p.plannedEnd;
  if (p.start.slice(8) === "01" && end === monthEnd(p.start)) {
    return `${FULL[+p.start.slice(5, 7) - 1]} ${p.start.slice(0, 4)}`;
  }
  const a = `${+p.start.slice(8)} ${SHORT[+p.start.slice(5, 7) - 1]}`;
  const b = `${+end.slice(8)} ${SHORT[+end.slice(5, 7) - 1]} ${end.slice(0, 4)}`;
  return p.start.slice(0, 4) === end.slice(0, 4) ? `${a} – ${b}` : `${a} ${p.start.slice(0, 4)} – ${b}`;
}

export function shortDate(iso: string): string {
  return `${+iso.slice(8)} ${SHORT[+iso.slice(5, 7) - 1]}`;
}

/** Tanggal jatuh tempo tagihan (tgl X tiap bulan) yang jatuh di dalam periode. */
export function dueDateInPeriod(p: Period, dueDay: number): string {
  for (let i = 0; i < 3; i++) {
    const first = addMonthsClamped(monthStart(p.start), i);
    const day = Math.min(dueDay, daysInMonth(first));
    const cand = first.slice(0, 8) + String(day).padStart(2, "0");
    if (cand >= p.start) return cand;
  }
  return p.plannedEnd;
}

export type BudgetRow = { category_id: string; effective_from: string; amount: number };

/** Budget yang berlaku untuk periode yang mulai di `at`: baris terbaru dengan effective_from <= at. */
export function effectiveBudgets(rows: BudgetRow[], at: string): Map<string, number> {
  const best = new Map<string, BudgetRow>();
  for (const r of rows) {
    if (r.effective_from > at) continue;
    const cur = best.get(r.category_id);
    if (!cur || r.effective_from > cur.effective_from) best.set(r.category_id, r);
  }
  return new Map([...best].map(([k, v]) => [k, Number(v.amount)]));
}
