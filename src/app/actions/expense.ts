"use server";

import { revalidatePath } from "next/cache";
import { getCtx } from "@/lib/ctx";
import { addDays, todayISO } from "@/lib/date";
import { XP, computeStreak } from "@/lib/gamification";
import { afterActivity, award } from "@/lib/server/xp";

export type LogResult =
  | { ok: true; id: string; xp: number; streak: number; duplicate?: boolean }
  | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function logExpense(input: {
  id?: string; // dibuat di klien supaya pengiriman ulang (antrean offline) tidak menggandakan
  categoryId: string;
  amount: number;
  spentOn?: string;
  note?: string;
}): Promise<LogResult> {
  const { supabase, me, householdId } = await getCtx();
  const today = todayISO();

  const amount = Math.round(Number(input.amount));
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000) {
    return { ok: false, error: "Nominal tidak valid" };
  }
  const spentOn =
    input.spentOn && DATE.test(input.spentOn) && input.spentOn <= today && input.spentOn >= addDays(today, -31)
      ? input.spentOn
      : today;

  const row = {
    ...(input.id && UUID.test(input.id) ? { id: input.id } : {}),
    household_id: householdId,
    category_id: input.categoryId,
    member_id: me.id,
    amount,
    spent_on: spentOn,
    note: input.note?.trim() || null,
  };
  const { data, error } = await supabase.from("expense").insert(row).select("id").single();
  if (error) {
    if (error.code === "23505" && row.id) return { ok: true, id: row.id, xp: 0, streak: 0, duplicate: true };
    return { ok: false, error: "Gagal menyimpan, coba lagi." };
  }

  let xp = 0;
  if (await award(supabase, {
    householdId, memberId: me.id, kind: "log", points: XP.log,
    ref: `log:${me.id}:${spentOn}`, note: "Catat harian",
  })) xp += XP.log;

  const since = addDays(today, -120);
  const { data: days } = await supabase.from("expense").select("spent_on").gte("spent_on", since);
  const streak = computeStreak((days ?? []).map((d) => d.spent_on as string), today);
  if (spentOn === today && streak > 0 && streak % 7 === 0) {
    if (await award(supabase, {
      householdId, memberId: me.id, kind: "streak", points: XP.streakWeek,
      ref: `streak:${today}`, note: `Streak ${streak} hari`,
    })) xp += XP.streakWeek;
  }

  await afterActivity(supabase, householdId, today);
  revalidatePath("/", "layout");
  return { ok: true, id: data.id as string, xp, streak };
}

export async function undoExpense(id: string): Promise<{ ok: boolean }> {
  const { supabase } = await getCtx();
  const { error } = await supabase.from("expense").delete().eq("id", id);
  revalidatePath("/", "layout");
  return { ok: !error };
}
