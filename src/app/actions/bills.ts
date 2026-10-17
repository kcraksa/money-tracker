"use server";

import { revalidatePath } from "next/cache";
import { getCtx } from "@/lib/ctx";
import { todayISO } from "@/lib/date";
import { dueDateInPeriod } from "@/lib/period";
import { loadPeriodContext } from "@/lib/server/period";
import { XP } from "@/lib/gamification";
import { afterActivity, award, grantBadge } from "@/lib/server/xp";

/** Tandai tagihan tetap bulan ini sudah dibayar: mencatat pengeluaran + status lunas. */
export async function markBillPaid(categoryId: string, amount: number): Promise<{ error?: string }> {
  const { supabase, me, householdId } = await getCtx();
  const today = todayISO();
  const { period } = await loadPeriodContext(supabase, today);
  const month = period.start; // kunci status lunas = awal periode
  const value = Math.round(Number(amount));
  if (!Number.isFinite(value) || value <= 0) return { error: "Nominal tidak valid" };

  const { data: cat } = await supabase
    .from("category").select("id, name, kind, due_day").eq("id", categoryId).single();
  if (!cat || cat.kind !== "fixed") return { error: "Bukan tagihan tetap" };

  const { data: exp, error: e1 } = await supabase
    .from("expense")
    .insert({ household_id: householdId, category_id: categoryId, member_id: me.id, amount: value, spent_on: today, note: "Tagihan" })
    .select("id").single();
  if (e1) return { error: "Gagal menyimpan" };

  const onTime = cat.due_day ? today <= dueDateInPeriod(period, cat.due_day) : true;
  const { error: e2 } = await supabase.from("bill_payment").insert({
    household_id: householdId, category_id: categoryId, month,
    expense_id: exp.id, paid_on: today, paid_by: me.id, on_time: onTime,
  });
  if (e2) {
    await supabase.from("expense").delete().eq("id", exp.id); // sudah lunas bulan ini
    return { error: "Tagihan ini sudah lunas bulan ini" };
  }

  if (onTime) {
    await award(supabase, {
      householdId, memberId: me.id, kind: "bill", points: XP.bill,
      ref: `bill:${categoryId}:${month}`, note: `${cat.name} lunas tepat waktu`,
    });
    if (String(cat.name).toLowerCase() === "listrik") {
      await grantBadge(supabase, householdId, "listrik_tepat", month, me.id);
    }
  }
  await afterActivity(supabase, householdId, today);
  revalidatePath("/", "layout");
  return {};
}

export async function unmarkBill(categoryId: string): Promise<void> {
  const { supabase } = await getCtx();
  const { period } = await loadPeriodContext(supabase, todayISO());
  const month = period.start;
  const { data } = await supabase
    .from("bill_payment").select("expense_id").eq("category_id", categoryId).eq("month", month).maybeSingle();
  await supabase.from("bill_payment").delete().eq("category_id", categoryId).eq("month", month);
  if (data?.expense_id) await supabase.from("expense").delete().eq("id", data.expense_id);
  revalidatePath("/", "layout");
}
