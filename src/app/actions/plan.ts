"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCtx } from "@/lib/ctx";
import { addDays, todayISO } from "@/lib/date";
import { loadPeriodContext } from "@/lib/server/period";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const num = (v: FormDataEntryValue | null) => Math.max(0, Math.round(Number(String(v ?? "").replace(/\D/g, "")) || 0));

function done(path = "/rencana?tersimpan=1"): never {
  revalidatePath("/", "layout");
  redirect(path);
}

/**
 * Catat pemasukan. Gajian pertama (atau pilihan "gajian baru") memulai periode baru di tanggal itu;
 * selain itu pemasukan (bonus, dll.) masuk ke periode yang sedang berjalan.
 */
export async function addIncome(form: FormData) {
  const { supabase, me, householdId } = await getCtx();
  const today = todayISO();
  const amount = num(form.get("amount"));
  if (amount <= 0) done("/rencana?err=nominal");

  const raw = String(form.get("received_on") ?? "");
  const receivedOn = DATE.test(raw) && raw <= today && raw >= addDays(today, -62) ? raw : today;
  const label = String(form.get("label") ?? "").trim().slice(0, 40) || "Gaji";

  const ctx = await loadPeriodContext(supabase, today);
  let periodId = ctx.periodId;
  if (form.get("new_period") === "1" || !periodId) {
    const { data: found } = await supabase.from("period").select("id").eq("start_on", receivedOn).maybeSingle();
    periodId = found?.id ?? (
      await supabase.from("period")
        .insert({ household_id: householdId, start_on: receivedOn, created_by: me.id })
        .select("id").single()
    ).data?.id ?? null;
  }
  if (!periodId) done("/rencana?err=periode");

  await supabase.from("income").insert({
    household_id: householdId, period_id: periodId, amount, label, received_on: receivedOn, member_id: me.id,
  });
  done();
}

export async function deleteIncome(form: FormData) {
  const { supabase } = await getCtx();
  await supabase.from("income").delete().eq("id", String(form.get("id")));
  done();
}

/** Simpan pembagian uang ke tiap pos untuk periode berjalan (berlaku sampai diubah lagi). */
export async function saveAllocation(form: FormData) {
  const { supabase, householdId } = await getCtx();
  const { period } = await loadPeriodContext(supabase, todayISO());
  const { data: cats } = await supabase.from("category").select("id, kind").eq("active", true);

  const rows = (cats ?? []).map((c) => ({
    household_id: householdId, category_id: c.id as string,
    amount: num(form.get(`budget_${c.id}`)), effective_from: period.start,
  }));
  if (rows.length) await supabase.from("budget").upsert(rows, { onConflict: "category_id,effective_from" });

  for (const c of cats ?? []) {
    if (c.kind !== "fixed") continue;
    const due = num(form.get(`due_${c.id}`));
    await supabase.from("category").update({ due_day: due >= 1 && due <= 28 ? due : null }).eq("id", c.id);
  }
  done();
}

export async function addCategory(form: FormData) {
  const { supabase, householdId } = await getCtx();
  const name = String(form.get("name") ?? "").trim().slice(0, 30);
  if (!name) done("/rencana?err=nama");

  const { data: last } = await supabase.from("category").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  const kind = form.get("kind") === "fixed" ? "fixed" : "daily";
  await supabase.from("category").insert({
    household_id: householdId, name,
    icon: String(form.get("icon") ?? "").trim().slice(0, 4) || (kind === "fixed" ? "🧾" : "💸"),
    kind, lump_sum: kind === "daily" && form.get("lump_sum") === "on",
    sort_order: (last?.[0]?.sort_order ?? 0) + 1,
  });
  done();
}

/** Ganti nama dan ikon kategori; catatan lamanya ikut tampil dengan nama baru karena merujuk ke kategori yang sama. */
export async function renameCategory(form: FormData) {
  const { supabase } = await getCtx();
  const name = String(form.get("name") ?? "").trim().slice(0, 30);
  if (!name) done("/rencana?err=nama");
  const icon = String(form.get("icon") ?? "").trim().slice(0, 4);
  await supabase.from("category").update({ name, ...(icon ? { icon } : {}) }).eq("id", String(form.get("id")));
  done();
}

/** Pos diarsipkan (bukan dihapus) supaya riwayat pengeluarannya tetap utuh. */
export async function archiveCategory(form: FormData) {
  const { supabase } = await getCtx();
  await supabase.from("category").update({ active: false }).eq("id", String(form.get("id")));
  done();
}
