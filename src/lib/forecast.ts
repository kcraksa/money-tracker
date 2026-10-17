/** Peringatan baru muncul mulai hari ke-7 periode; awal periode terlalu sedikit data untuk diproyeksi. */
export const WARN_FROM_DAY = 7;

export type ForecastStatus = "nobudget" | "ok" | "warn" | "over";

export type Forecast = {
  spent: number;
  budget: number;
  remaining: number;
  projected: number;
  status: ForecastStatus;
};

/**
 * Proyeksi akhir periode = pengeluaran sejauh ini / hari berjalan x jumlah hari periode.
 * Kategori `lumpSum` (belanja bulanan sekali jalan) tidak diproyeksikan: dibandingkan apa adanya.
 */
export function forecast(args: {
  spent: number;
  budget: number;
  elapsedDays: number; // hari ke-berapa dalam periode (>= 1)
  totalDays: number; // panjang periode dalam hari
  lumpSum?: boolean;
}): Forecast {
  const { spent, budget, elapsedDays: day, totalDays, lumpSum = false } = args;
  const projected = lumpSum ? spent : Math.round((spent / day) * totalDays);
  const remaining = budget - spent;

  let status: ForecastStatus = "ok";
  if (budget <= 0) status = "nobudget";
  else if (spent > budget) status = "over";
  else if (!lumpSum && day >= WARN_FROM_DAY && projected > budget) status = "warn";

  return { spent, budget, remaining, projected, status };
}
