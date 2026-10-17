import { addMonthsClamped, diffDays } from "@/lib/period";

export type Status = "ok" | "soon" | "overdue" | "unknown";

/** "Segera" bila sisa <= 15% interval (minimal 200 km), atau perkiraan/batas waktunya <= 14 hari. */
export const SOON_KM_RATIO = 0.15;
export const SOON_KM_MIN = 200;
export const SOON_DAYS = 14;

export type PartInput = {
  intervalKm: number | null;
  intervalMonths: number | null;
  lastKm: number | null; // km saat servis terakhir
  lastOn: string | null; // tanggal servis terakhir
};

export type PartStatus = {
  status: Status;
  dueKm: number | null;
  remainingKm: number | null; // negatif = sudah lewat
  dueOn: string | null;
  remainingDays: number | null; // dari batas waktu (bulan); negatif = sudah lewat
  etaDays: number | null; // perkiraan hari sampai batas km, dari laju pemakaian
  usedPct: number; // 0..>1: progres terparah antara km dan waktu
  driver: "km" | "waktu" | null; // dimensi yang menentukan statusnya
};

const UNKNOWN: PartStatus = {
  status: "unknown", dueKm: null, remainingKm: null, dueOn: null, remainingDays: null,
  etaDays: null, usedPct: 0, driver: null,
};

/**
 * Status satu part. Interval bisa km, bulan, atau keduanya (mana yang tercapai lebih dulu).
 * Tanpa data servis terakhir, status "unknown" (belum bisa dihitung).
 */
export function partStatus(
  p: PartInput,
  ctx: { currentKm: number; today: string; kmPerDay: number | null },
): PartStatus {
  if (p.lastKm === null || p.lastOn === null) return UNKNOWN;

  let dueKm: number | null = null;
  let remainingKm: number | null = null;
  let usedKm = 0;
  if (p.intervalKm) {
    dueKm = p.lastKm + p.intervalKm;
    remainingKm = dueKm - ctx.currentKm;
    usedKm = Math.max(0, (ctx.currentKm - p.lastKm) / p.intervalKm);
  }

  let dueOn: string | null = null;
  let remainingDays: number | null = null;
  let usedTime = 0;
  if (p.intervalMonths) {
    dueOn = addMonthsClamped(p.lastOn, p.intervalMonths);
    remainingDays = diffDays(dueOn, ctx.today);
    const span = Math.max(1, diffDays(dueOn, p.lastOn));
    usedTime = Math.max(0, diffDays(ctx.today, p.lastOn) / span);
  }

  const etaDays =
    remainingKm === null ? null
      : remainingKm <= 0 ? 0
      : ctx.kmPerDay && ctx.kmPerDay > 0 ? Math.ceil(remainingKm / ctx.kmPerDay)
      : null;

  const overdue = (remainingKm !== null && remainingKm <= 0) || (remainingDays !== null && remainingDays <= 0);
  const soonKm = p.intervalKm ? Math.max(SOON_KM_MIN, SOON_KM_RATIO * p.intervalKm) : 0;
  const soon =
    (remainingKm !== null && remainingKm <= soonKm) ||
    (etaDays !== null && etaDays <= SOON_DAYS) ||
    (remainingDays !== null && remainingDays <= SOON_DAYS);

  return {
    status: overdue ? "overdue" : soon ? "soon" : "ok",
    dueKm, remainingKm, dueOn, remainingDays, etaDays,
    usedPct: Math.max(usedKm, usedTime),
    driver: usedKm === 0 && usedTime === 0 ? (p.intervalKm ? "km" : "waktu") : usedKm >= usedTime ? "km" : "waktu",
  };
}

/**
 * Laju pemakaian (km/hari) dari catatan km 60 hari terakhir: selisih km terbaru dengan paling awal
 * dibagi rentang harinya. Butuh >= 2 catatan yang berjarak >= 3 hari; selain itu null.
 */
export function kmPerDay(
  readings: { km: number; read_on: string }[],
  today: string,
  windowDays = 60,
): number | null {
  const recent = readings
    .filter((r) => diffDays(today, r.read_on) <= windowDays && diffDays(today, r.read_on) >= 0)
    .sort((a, b) => a.read_on.localeCompare(b.read_on) || a.km - b.km);
  if (recent.length < 2) return null;
  const first = recent[0];
  const last = recent[recent.length - 1];
  const span = diffDays(last.read_on, first.read_on);
  const delta = last.km - first.km;
  if (span < 3 || delta <= 0) return null;
  return delta / span;
}

/** Hari sejak km terakhir diperbarui, dan apakah sudah waktunya diingatkan. */
export function kmNudge(odometerOn: string, remindDays: number, today: string) {
  const daysAgo = Math.max(0, diffDays(today, odometerOn));
  return { daysAgo, due: daysAgo >= remindDays };
}

export type Summary = { worst: Status; overdue: number; soon: number; unknown: number; total: number };

const RANK: Record<Status, number> = { overdue: 3, soon: 2, unknown: 1, ok: 0 };

/** Ringkasan sekumpulan status part: status terburuk + jumlah per kategori. */
export function summarize(statuses: Status[]): Summary {
  let worst: Status = "ok";
  for (const s of statuses) if (RANK[s] > RANK[worst]) worst = s;
  return {
    worst,
    overdue: statuses.filter((s) => s === "overdue").length,
    soon: statuses.filter((s) => s === "soon").length,
    unknown: statuses.filter((s) => s === "unknown").length,
    total: statuses.length,
  };
}

/** Urutan tampil: paling mendesak dulu (terlewat, segera, lalu yang paling hampir habis). */
export function byUrgency<T extends { status: PartStatus }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const r = RANK[b.status.status] - RANK[a.status.status];
    return r || b.status.usedPct - a.status.usedPct;
  });
}

export type KmCheck =
  | { level: "ok" }
  | { level: "confirm"; message: string }
  | { level: "invalid"; message: string };

export const KM_JUMP_CONFIRM = 3000;
export const KM_MAX = 9_999_999;

/** Validasi km yang diketik: tolak yang mustahil, minta konfirmasi untuk turun atau lonjakan besar. */
export function checkKm(newKm: number, currentKm: number): KmCheck {
  if (!Number.isInteger(newKm) || newKm < 0 || newKm > KM_MAX) {
    return { level: "invalid", message: "Km harus berupa angka bulat yang masuk akal." };
  }
  if (newKm < currentKm) {
    return { level: "confirm", message: `Lebih kecil dari catatan terakhir (${currentKm.toLocaleString("id-ID")} km). Simpan sebagai koreksi?` };
  }
  if (newKm - currentKm > KM_JUMP_CONFIRM) {
    return { level: "confirm", message: `Naik ${(newKm - currentKm).toLocaleString("id-ID")} km sekaligus. Sudah benar?` };
  }
  return { level: "ok" };
}

/** "120 km lagi", "terlewat 350 km", "sekitar 9 hari", "5 hari lagi"... teks singkat untuk kartu. */
export function dueText(s: PartStatus): string {
  if (s.status === "unknown") return "Belum ada riwayat";
  const parts: string[] = [];
  if (s.remainingKm !== null) {
    parts.push(s.remainingKm <= 0 ? `terlewat ${Math.abs(s.remainingKm).toLocaleString("id-ID")} km` : `${s.remainingKm.toLocaleString("id-ID")} km lagi`);
  }
  if (s.remainingDays !== null && (s.driver === "waktu" || s.remainingDays <= SOON_DAYS || s.remainingKm === null)) {
    parts.push(s.remainingDays <= 0 ? `terlewat ${Math.abs(s.remainingDays)} hari` : `${s.remainingDays} hari lagi`);
  }
  return parts.join(" · ");
}
