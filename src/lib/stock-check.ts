import { todayISO } from "./date";
import { diffDays } from "./period";

/** Setelah berapa hari tanpa cek stok, checklist menyarankan cek dulu. */
export const STALE_DAYS = 3;

export type StockChange = { itemId: string; delta: number; reason: "use" | "adjust" };

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Bandingkan hitungan di rumah dengan stok di aplikasi.
 * Penurunan = barang sudah terpakai tapi lupa ditekan "−", jadi dicatat sebagai pemakaian nyata
 * (menyempurnakan perkiraan pemakaian). Kenaikan dicatat sebagai penyesuaian biasa.
 */
export function planStockCheck(
  current: Map<string, number>,
  counted: { itemId: string; count: number }[],
): StockChange[] {
  const out: StockChange[] = [];
  for (const { itemId, count } of counted) {
    const have = current.get(itemId);
    if (have === undefined || !Number.isFinite(count)) continue;
    const delta = round2(Math.max(0, count) - have);
    if (delta !== 0) out.push({ itemId, delta, reason: delta < 0 ? "use" : "adjust" });
  }
  return out;
}

/** "hari ini", "kemarin", "5 hari lalu", atau "belum pernah dicek". */
export function agoLabel(iso: string | null | undefined, today: string): string {
  if (!iso) return "belum pernah dicek";
  const d = diffDays(today, todayISO(new Date(iso)));
  if (d <= 0) return "dicek hari ini";
  if (d === 1) return "dicek kemarin";
  return `dicek ${d} hari lalu`;
}

/** Perlu disarankan cek stok: belum pernah, atau cek terakhir sudah lewat STALE_DAYS. */
export function needsStockCheck(checkedAts: (string | null | undefined)[], today: string): boolean {
  const latest = checkedAts.filter(Boolean).sort().at(-1);
  if (!latest) return true;
  return diffDays(today, todayISO(new Date(latest))) >= STALE_DAYS;
}
