import type { SupabaseClient } from "@supabase/supabase-js";
import { forecast, type Forecast } from "@/lib/forecast";
import { dueDateInPeriod, elapsedDays, isOverdue, periodLabel, rangeEnd, shortDate, totalDays } from "@/lib/period";
import type { Category } from "@/lib/types";
import { loadPeriodContext } from "./period";

export type OverviewBill = {
  categoryId: string; name: string; icon: string; amount: number; dueLabel: string | null;
  paid: { onTime: boolean; paidOn: string } | null;
};

/**
 * Ringkasan keuangan periode berjalan, dipakai bersama oleh Beranda (ringkasan + pintasan),
 * halaman Anggaran (sisa per kategori), dan halaman Tagihan.
 */
export async function loadOverview(sb: SupabaseClient, today: string) {
  const { period, periodId, budgets } = await loadPeriodContext(sb, today);

  const [cats, periodExp, billPays, incomes] = await Promise.all([
    sb.from("category").select("id, name, icon, kind, lump_sum, due_day, sort_order").eq("active", true).order("sort_order"),
    sb.from("expense").select("category_id, amount").gte("spent_on", period.start).lte("spent_on", rangeEnd(period, today)),
    sb.from("bill_payment").select("category_id, paid_on, on_time").eq("month", period.start),
    periodId ? sb.from("income").select("amount").eq("period_id", periodId) : Promise.resolve({ data: [] as { amount: number }[] }),
  ]);

  const categories = (cats.data ?? []) as Category[];
  const spentOf = new Map<string, number>();
  for (const e of periodExp.data ?? []) spentOf.set(e.category_id, (spentOf.get(e.category_id) ?? 0) + Number(e.amount));
  const paidOf = new Map((billPays.data ?? []).map((b) => [b.category_id as string, b]));

  const elapsed = elapsedDays(period, today);
  const total = totalDays(period, today);
  const incomeTotal = (incomes.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const allocated = categories.reduce((s, c) => s + (budgets.get(c.id) ?? 0), 0);

  const rows: { c: Category; f: Forecast }[] = categories
    .filter((c) => c.kind === "daily")
    .map((c) => ({
      c,
      f: forecast({
        spent: spentOf.get(c.id) ?? 0, budget: budgets.get(c.id) ?? 0,
        elapsedDays: elapsed, totalDays: total, lumpSum: c.lump_sum,
      }),
    }));

  const bills: OverviewBill[] = categories
    .filter((c) => c.kind === "fixed")
    .map((c) => {
      const paid = paidOf.get(c.id);
      return {
        categoryId: c.id, name: c.name, icon: c.icon, amount: budgets.get(c.id) ?? 0,
        dueLabel: c.due_day ? shortDate(dueDateInPeriod(period, c.due_day)) : null,
        paid: paid ? { onTime: Boolean(paid.on_time), paidOn: paid.paid_on as string } : null,
      };
    });

  return {
    period, periodLabel: periodLabel(period), day: elapsed, totalDays: total, overdue: isOverdue(period, today),
    hasPeriod: period.explicit,
    incomeTotal, allocated,
    totalSpent: [...spentOf.values()].reduce((s, v) => s + v, 0),
    rows, bills,
    alertCount: rows.filter((r) => r.f.status === "warn" || r.f.status === "over").length,
    unpaidBills: bills.filter((b) => !b.paid).length,
  };
}
