import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, addMonths, monthStart, weekStart } from "@/lib/date";
import { QUESTS, XP, questProgress, type BadgeCode, type QuestContext } from "@/lib/gamification";
import type { XpEvent } from "@/lib/types";

type Award = {
  householdId: string;
  memberId: string | null; // null = XP keluarga
  kind: XpEvent["kind"];
  points: number;
  ref: string; // kunci idempotensi: ref yang sama tidak pernah dihitung dua kali
  note?: string;
};

/** Mengembalikan true kalau poin benar-benar baru ditambahkan. */
export async function award(sb: SupabaseClient, a: Award): Promise<boolean> {
  if (a.points <= 0) return false;
  const { error } = await sb.from("xp_event").insert({
    household_id: a.householdId,
    member_id: a.memberId,
    kind: a.kind,
    points: a.points,
    ref: a.ref,
    note: a.note ?? null,
  });
  if (!error) return true;
  if (error.code === "23505") return false;
  throw new Error(error.message);
}

export async function grantBadge(
  sb: SupabaseClient,
  householdId: string,
  code: BadgeCode,
  period: string,
  memberId: string | null,
) {
  await sb
    .from("badge")
    .upsert(
      { household_id: householdId, code, period, member_id: memberId },
      { onConflict: "household_id,code,period", ignoreDuplicates: true },
    );
}

/** Data minggu berjalan yang dipakai untuk progres quest. */
export async function loadQuestContext(sb: SupabaseClient, today: string): Promise<QuestContext> {
  const ws = weekStart(today);
  const [exp, stock, members] = await Promise.all([
    sb.from("expense").select("spent_on, member_id").gte("spent_on", ws).lte("spent_on", today),
    sb
      .from("stock_log")
      .select("id", { count: "exact", head: true })
      .gte("created_at", `${ws}T00:00:00+07:00`),
    sb.from("member").select("id", { count: "exact", head: true }),
  ]);
  const rows = (exp.data ?? []) as { spent_on: string; member_id: string }[];
  const expensesByMember: Record<string, number> = {};
  for (const r of rows) expensesByMember[r.member_id] = (expensesByMember[r.member_id] ?? 0) + 1;
  return {
    weekDates: rows.map((r) => r.spent_on),
    expensesByMember,
    memberCount: members.count ?? 1,
    stockChanges: stock.count ?? 0,
  };
}

/** Beri XP keluarga untuk quest minggu ini yang sudah selesai. */
export async function syncQuests(sb: SupabaseClient, householdId: string, today: string) {
  const ctx = await loadQuestContext(sb, today);
  const ws = weekStart(today);
  for (const q of QUESTS) {
    const p = questProgress(q.code, ctx);
    if (p.done >= p.target) {
      await award(sb, {
        householdId, memberId: null, kind: "quest", points: XP.quest,
        ref: `quest:${ws}:${q.code}`, note: q.title,
      });
    }
  }
}

/**
 * Tutup buku bulan lalu sekali saja: XP keluarga per kategori harian yang aman,
 * dan badge "Budget Aman" bila semuanya aman.
 */
export async function settleLastMonth(sb: SupabaseClient, householdId: string, today: string) {
  const thisMonth = monthStart(today);
  const month = addMonths(thisMonth, -1);
  const period = month.slice(0, 7);

  const done = await sb
    .from("xp_event")
    .select("id", { count: "exact", head: true })
    .like("ref", `budget:%:${period}`);
  if ((done.count ?? 0) > 0) return;

  const [cats, budgets, exps] = await Promise.all([
    sb.from("category").select("id, name, kind").eq("kind", "daily"),
    sb.from("budget").select("category_id, amount"),
    sb.from("expense").select("category_id, amount").gte("spent_on", month).lte("spent_on", addDays(thisMonth, -1)),
  ]);
  const expenses = (exps.data ?? []) as { category_id: string; amount: number }[];
  if (expenses.length === 0) return;

  const budgetOf = new Map((budgets.data ?? []).map((b) => [b.category_id as string, Number(b.amount)]));
  const targets = ((cats.data ?? []) as { id: string; name: string }[]).filter((c) => (budgetOf.get(c.id) ?? 0) > 0);
  if (targets.length === 0) return;

  let safe = 0;
  for (const c of targets) {
    const spent = expenses.filter((e) => e.category_id === c.id).reduce((s, e) => s + Number(e.amount), 0);
    if (spent <= (budgetOf.get(c.id) ?? 0)) {
      safe++;
      await award(sb, {
        householdId, memberId: null, kind: "budget", points: XP.budget,
        ref: `budget:${c.id}:${period}`, note: `${c.name} aman`,
      });
    }
  }
  if (safe === targets.length) await grantBadge(sb, householdId, "budget_aman", period, null);
}

export async function afterActivity(sb: SupabaseClient, householdId: string, today: string) {
  await Promise.all([syncQuests(sb, householdId, today), settleLastMonth(sb, householdId, today)]);
}
