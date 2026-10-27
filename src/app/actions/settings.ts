"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCtx } from "@/lib/ctx";
import { SIMPLE_COOKIE } from "@/lib/simple-mode";
import { createClient } from "@/lib/supabase/server";

const num = (v: FormDataEntryValue | null) => Math.max(0, Math.round(Number(String(v ?? "").replace(/\D/g, "")) || 0));

export async function addQuick(form: FormData) {
  const { supabase, householdId } = await getCtx();
  const amount = num(form.get("amount"));
  const categoryId = String(form.get("category_id") ?? "");
  const label = String(form.get("label") ?? "").trim().slice(0, 40);
  const note = String(form.get("note") ?? "").trim().slice(0, 80);
  if (amount > 0 && categoryId && label) {
    const row: Record<string, unknown> = { household_id: householdId, category_id: categoryId, label, amount };
    const { error } = await supabase.from("quick_expense").insert(note ? { ...row, note } : row);
    // 42703 = kolom note belum ada (migrasi 0006 belum dijalankan): simpan tombolnya tanpa keterangan.
    if (error?.code === "42703" || error?.code === "PGRST204") await supabase.from("quick_expense").insert(row);
  }
  revalidatePath("/", "layout");
  redirect("/pengaturan");
}

export async function deleteQuick(form: FormData) {
  const { supabase } = await getCtx();
  await supabase.from("quick_expense").delete().eq("id", String(form.get("id")));
  revalidatePath("/", "layout");
  redirect("/pengaturan");
}

export async function saveName(form: FormData) {
  const { supabase, me } = await getCtx();
  const name = String(form.get("display_name") ?? "").trim();
  if (name) await supabase.from("member").update({ display_name: name }).eq("id", me.id);
  revalidatePath("/", "layout");
  redirect("/pengaturan?tersimpan=1");
}

/** Nyalakan/matikan mode sederhana di perangkat ini (form: simple=1 untuk menyalakan). */
export async function setSimpleMode(form: FormData) {
  const on = form.get("simple") === "1";
  (await cookies()).set(SIMPLE_COOKIE, on ? "1" : "0", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
