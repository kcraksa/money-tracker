import type { Status } from "./logic";

/** Warna per status, dipakai bersama oleh kartu, daftar part, dan lencana. */
export const STATUS_UI: Record<Status, { label: string; pill: string; bar: "ok" | "warn" | "danger" | "primary"; text: string }> = {
  overdue: { label: "Lewat jadwal", pill: "bg-danger-bg text-danger", bar: "danger", text: "text-danger" },
  soon: { label: "Sebentar lagi", pill: "bg-warn-bg text-warn", bar: "warn", text: "text-warn" },
  ok: { label: "Aman", pill: "bg-ok-bg text-ok", bar: "ok", text: "text-ok" },
  unknown: { label: "Belum ada data", pill: "bg-surface-2 text-muted", bar: "primary", text: "text-muted" },
};

export const KIND_ICON = { car: "🚗", motorcycle: "🏍️" } as const;

export function agoText(days: number): string {
  if (days <= 0) return "hari ini";
  if (days === 1) return "kemarin";
  return `${days} hari lalu`;
}

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
/** "2026-10-12" -> "12 Okt 2026". */
export const dateText = (iso: string) => `${Number(iso.slice(8, 10))} ${BULAN[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

/** "tiap 10.000 km", "tiap 6 bulan", atau "tiap 7.000 km / 6 bulan". */
export function intervalText(km: number | null, months: number | null): string {
  if (!km && !months) return "tanpa pengingat";
  const bits = [km ? `${km.toLocaleString("id-ID")} km` : null, months ? `${months} bulan` : null].filter(Boolean);
  return `tiap ${bits.join(" / ")}`;
}
