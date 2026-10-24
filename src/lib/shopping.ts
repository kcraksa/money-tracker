import { addMonths, monthStart } from "./date";
import type { ListItem } from "./types";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Rekomendasi beli = max(0, perkiraan kebutuhan - stok sekarang). */
export function recommend(monthlyNeed: number, stock: number): number {
  return round2(Math.max(0, monthlyNeed - stock));
}

/** Barang yang memang perlu dibeli periode ini. Baris stok-cukup (rekomendasi 0) hanya info, tetap bisa dibeli. */
export const isPlanned = (i: Pick<ListItem, "is_extra" | "qty_recommended">) => !i.is_extra && i.qty_recommended > 0;

/** Cocokkan nama barang dengan kata kunci pencarian (abaikan huruf besar/kecil dan spasi tepi). */
export const matchesQuery = (name: string, query: string) => {
  const q = query.trim().toLowerCase();
  return q === "" || name.toLowerCase().includes(q);
};

export const lineTotal = (qty: number, unitPrice: number) => Math.round(qty * unitPrice);

/**
 * Hitung ulang perkiraan pemakaian dari log stok nyata (reason 'use').
 * Rata-rata dari maksimal `months` bulan penuh terakhir, mulai bulan pertama ada pemakaian.
 * Butuh minimal 2 bulan data; kalau kurang, kembalikan null (tetap pakai angka manual).
 */
export function suggestMonthlyNeed(
  useLogs: { delta: number; created_on: string }[],
  today: string,
  months = 3,
): { suggested: number; monthsUsed: number } | null {
  const uses = useLogs.filter((l) => l.delta < 0);
  if (uses.length === 0) return null;

  const thisMonth = monthStart(today);
  const first = uses.map((l) => monthStart(l.created_on)).sort()[0];

  const window: string[] = [];
  for (let m = addMonths(thisMonth, -1); m >= first && window.length < months; m = addMonths(m, -1)) {
    window.push(m);
  }
  if (window.length < 2) return null;

  const total = uses
    .filter((l) => window.includes(monthStart(l.created_on)))
    .reduce((s, l) => s + -l.delta, 0);
  const avg = total / window.length;
  return { suggested: Math.round(avg * 2) / 2, monthsUsed: window.length };
}

export type Evaluation = {
  estimateTotal: number; // rekomendasi x harga estimasi
  actualTotal: number; // semua yang dicentang (termasuk di luar daftar)
  recommendedActual: number;
  extrasTotal: number;
  saving: number; // uang dihemat: hanya dari barang yang dibeli sesuai/di atas rekomendasi
  notBought: ListItem[];
  extras: ListItem[];
  withinRecommendation: boolean;
};

/**
 * Hemat hanya dihitung per barang yang jumlah belinya >= rekomendasi, supaya tidak ada
 * "hemat" dengan cara tidak membeli apa-apa. Harga lebih murah dari estimasi => hemat.
 * Barang di luar daftar tidak pernah menambah hemat.
 */
export function evaluate(items: ListItem[]): Evaluation {
  const planned = items.filter(isPlanned);
  const extras = items.filter((i) => !isPlanned(i) && i.checked);
  const bought = items.filter((i) => i.checked);

  const estimateTotal = planned.reduce((s, i) => s + lineTotal(i.qty_recommended, i.unit_price_est), 0);
  const actualTotal = bought.reduce((s, i) => s + lineTotal(i.qty_bought, i.unit_price_actual), 0);
  const extrasTotal = extras.reduce((s, i) => s + lineTotal(i.qty_bought, i.unit_price_actual), 0);
  const recommendedActual = actualTotal - extrasTotal;

  const saving = planned
    .filter((i) => i.checked && i.qty_bought >= i.qty_recommended)
    .reduce((s, i) => s + Math.max(0, i.unit_price_est - i.unit_price_actual) * i.qty_recommended, 0);

  const notBought = planned.filter((i) => !i.checked || i.qty_bought < i.qty_recommended);

  return {
    estimateTotal,
    actualTotal,
    recommendedActual,
    extrasTotal,
    saving: Math.round(saving),
    notBought,
    extras,
    withinRecommendation: planned.length > 0 && notBought.length === 0 && actualTotal <= estimateTotal,
  };
}
