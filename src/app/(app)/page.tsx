import { getCtx } from "@/lib/ctx";
import { addDays, greeting, todayISO, weekStart } from "@/lib/date";
import { forecast } from "@/lib/forecast";
import { QUESTS, computeStreak, questProgress } from "@/lib/gamification";
import { dueDateInPeriod, elapsedDays, isOverdue, periodLabel, rangeEnd, shortDate, totalDays } from "@/lib/period";
import { loadPeriodContext } from "@/lib/server/period";
import { loadQuestContext } from "@/lib/server/xp";
import type { Category } from "@/lib/types";
import { HomeView } from "./home-view";

export const metadata = { title: "Beranda" };

export default async function BerandaPage() {
  const { supabase, me } = await getCtx();
  const today = todayISO();
  const { period, periodId, budgets } = await loadPeriodContext(supabase, today);

  const [cats, periodExp, bills, xp, days, quest, incomes] = await Promise.all([
    supabase.from("category").select("id, name, icon, kind, lump_sum, due_day, sort_order").eq("active", true).order("sort_order"),
    supabase.from("expense").select("category_id, amount").gte("spent_on", period.start).lte("spent_on", rangeEnd(period, today)),
    supabase.from("bill_payment").select("category_id, paid_on, on_time").eq("month", period.start),
    supabase.from("xp_event").select("points, ref"),
    supabase.from("expense").select("spent_on").gte("spent_on", addDays(today, -120)),
    loadQuestContext(supabase, today),
    periodId ? supabase.from("income").select("amount").eq("period_id", periodId) : Promise.resolve({ data: [] }),
  ]);

  const categories = (cats.data ?? []) as Category[];
  const spentOf = new Map<string, number>();
  for (const e of periodExp.data ?? []) {
    spentOf.set(e.category_id, (spentOf.get(e.category_id) ?? 0) + Number(e.amount));
  }
  const paidOf = new Map((bills.data ?? []).map((b) => [b.category_id as string, b]));

  const dates = (days.data ?? []).map((d) => d.spent_on as string);
  const ws = weekStart(today);
  const doneRefs = new Set((xp.data ?? []).map((r) => r.ref as string));
  const elapsed = elapsedDays(period, today);
  const total = totalDays(period, today);
  const incomeTotal = (incomes.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const allocated = categories.reduce((s, c) => s + (budgets.get(c.id) ?? 0), 0);

  return (
    <HomeView
      greeting={greeting()}
      name={me.display_name}
      periodLabel={periodLabel(period)}
      day={elapsed}
      totalDays={total}
      hasPeriod={period.explicit}
      overdue={isOverdue(period, today)}
      income={incomeTotal > 0 ? { total: incomeTotal, allocated } : null}
      totalXp={(xp.data ?? []).reduce((s, r) => s + Number(r.points), 0)}
      streak={computeStreak(dates, today)}
      loggedToday={dates.includes(today)}
      totalSpent={[...spentOf.values()].reduce((s, v) => s + v, 0)}
      totalBudget={allocated}
      rows={categories
        .filter((c) => c.kind === "daily")
        .map((c) => ({
          c,
          f: forecast({
            spent: spentOf.get(c.id) ?? 0, budget: budgets.get(c.id) ?? 0,
            elapsedDays: elapsed, totalDays: total, lumpSum: c.lump_sum,
          }),
        }))}
      bills={categories
        .filter((c) => c.kind === "fixed")
        .map((c) => {
          const paid = paidOf.get(c.id);
          return {
            categoryId: c.id, name: c.name, icon: c.icon, amount: budgets.get(c.id) ?? 0,
            dueLabel: c.due_day ? shortDate(dueDateInPeriod(period, c.due_day)) : null,
            paid: paid ? { onTime: Boolean(paid.on_time), paidOn: paid.paid_on as string } : null,
          };
        })}
      quests={QUESTS.map((q) => {
        const p = questProgress(q.code, quest);
        return {
          code: q.code, title: q.title, icon: q.icon, done: p.done, target: p.target,
          complete: doneRefs.has(`quest:${ws}:${q.code}`) || p.done >= p.target,
        };
      })}
    />
  );
}
