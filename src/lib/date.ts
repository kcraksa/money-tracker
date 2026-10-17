// Semua tanggal berupa string "YYYY-MM-DD" dalam zona waktu keluarga (WIB),
// bukan UTC milik server Vercel.
export const TZ = "Asia/Jakarta";

export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(now);
}

export const monthStart = (iso: string) => iso.slice(0, 7) + "-01";
export const dayOfMonth = (iso: string) => Number(iso.slice(8, 10));

export function daysInMonth(iso: string): number {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function addMonths(iso: string, n: number): string {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7)) - 1 + n;
  return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
}

/** Senin awal minggu dari tanggal tersebut. */
export function weekStart(iso: string): string {
  const dow = new Date(iso + "T00:00:00Z").getUTCDay(); // 0 = Minggu
  return addDays(iso, -((dow + 6) % 7));
}

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
export function monthLabel(iso: string): string {
  return `${BULAN[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
}
