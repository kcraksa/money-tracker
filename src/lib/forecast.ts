import { dayOfMonth, daysInMonth } from "./date";

/** Peringatan baru muncul setelah hari ini; awal bulan terlalu sedikit data untuk diproyeksi. */
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
 * Proyeksi akhir bulan = pengeluaran sejauh ini / hari berjalan x jumlah hari bulan itu.
 * Kategori `lumpSum` (belanja bulanan sekali jalan) tidak diproyeksikan: dibandingkan apa adanya.
 */
export function forecast(args: {
  spent: number;
  budget: number;
  today: string;
  lumpSum?: boolean;
}): Forecast {
  const { spent, budget, today, lumpSum = false } = args;
  const day = dayOfMonth(today);
  const projected = lumpSum ? spent : Math.round((spent / day) * daysInMonth(today));
  const remaining = budget - spent;

  let status: ForecastStatus = "ok";
  if (budget <= 0) status = "nobudget";
  else if (spent > budget) status = "over";
  else if (!lumpSum && day >= WARN_FROM_DAY && projected > budget) status = "warn";

  return { spent, budget, remaining, projected, status };
}
