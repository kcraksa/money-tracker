import { getCtx } from "@/lib/ctx";
import { addDays, daysInMonth, dayOfMonth, greeting, monthLabel, monthStart, todayISO, weekStart } from "@/lib/date";
import { forecast } from "@/lib/forecast";
import { QUESTS, computeStreak, questProgress } from "@/lib/gamification";
import { loadQuestContext } from "@/lib/server/xp";
import type { Category } from "@/lib/types";
import { HomeView } from "./home-view";

export const metadata = { title: "Beranda" };

export default async function BerandaPage() {
  const { supabase, me } = await getCtx();
  const today = todayISO();
  const month = monthStart(today);

  const [cats, budgets, monthExp, bills, xp, days, quest] = await Promise.all([
    supabase.from("category").select("id, name, icon, kind, lump_sum, due_day, sort_order").order("sort_order"),
    supabase.from("budget").select("category_id, amount"),
    supabase.from("expense").select("category_id, amount").gte("spent_on", month).lte("spent_on", today),
    supabase.from("bill_payment").select("category_id, paid_on, on_time").eq("month", month),
    supabase.from("xp_event").select("points, ref"),
    supabase.from("expense").select("spent_on").gte("spent_on", addDays(today, -120)),
    loadQuestContext(supabase, today),
  ]);

  const categories = (cats.data ?? []) as Category[];
  const budgetOf = new Map((budgets.data ?? []).map((b) => [b.category_id as string, Number(b.amount)]));
  const spentOf = new Map<string, number>();
  for (const e of monthExp.data ?? []) {
    spentOf.set(e.category_id, (spentOf.get(e.category_id) ?? 0) + Number(e.amount));
  }
  const paidOf = new Map((bills.data ?? []).map((b) => [b.category_id as string, b]));

  const dates = (days.data ?? []).map((d) => d.spent_on as string);
  const ws = weekStart(today);
  const doneRefs = new Set((xp.data ?? []).map((r) => r.ref as string));

  return (
    <HomeView
      greeting={greeting()}
      name={me.display_name}
      monthLabel={monthLabel(month)}
      day={dayOfMonth(today)}
      daysInMonth={daysInMonth(today)}
      totalXp={(xp.data ?? []).reduce((s, r) => s + Number(r.points), 0)}
      streak={computeStreak(dates, today)}
      loggedToday={dates.includes(today)}
      totalSpent={[...spentOf.values()].reduce((s, v) => s + v, 0)}
      totalBudget={[...budgetOf.values()].reduce((s, v) => s + v, 0)}
      rows={categories
        .filter((c) => c.kind === "daily")
        .map((c) => ({
          c,
          f: forecast({ spent: spentOf.get(c.id) ?? 0, budget: budgetOf.get(c.id) ?? 0, today, lumpSum: c.lump_sum }),
        }))}
      bills={categories
        .filter((c) => c.kind === "fixed")
        .map((c) => {
          const paid = paidOf.get(c.id);
          return {
            categoryId: c.id, name: c.name, icon: c.icon, amount: budgetOf.get(c.id) ?? 0, dueDay: c.due_day,
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
