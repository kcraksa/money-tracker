import type { SupabaseClient } from "@supabase/supabase-js";
import { effectiveBudgets, resolvePeriod, type BudgetRow, type Period } from "@/lib/period";

export type PeriodContext = {
  starts: string[];
  period: Period;
  periodId: string | null; // null = bulan kalender bayangan (belum ada gajian dicatat)
  budgetRows: BudgetRow[];
  budgets: Map<string, number>; // category_id -> budget yang berlaku di periode ini
};

/** Periode berjalan + budget yang berlaku (carry-over dari periode sebelumnya bila belum diatur ulang). */
export async function loadPeriodContext(sb: SupabaseClient, today: string): Promise<PeriodContext> {
  const [pr, br] = await Promise.all([
    sb.from("period").select("id, start_on").order("start_on"),
    sb.from("budget").select("category_id, effective_from, amount"),
  ]);
  const periods = (pr.data ?? []) as { id: string; start_on: string }[];
  const starts = periods.map((p) => p.start_on);
  const period = resolvePeriod(starts, today);
  const budgetRows = ((br.data ?? []) as BudgetRow[]).map((r) => ({ ...r, amount: Number(r.amount) }));
  return {
    starts,
    period,
    periodId: periods.find((p) => p.start_on === period.start)?.id ?? null,
    budgetRows,
    budgets: effectiveBudgets(budgetRows, period.start),
  };
}
