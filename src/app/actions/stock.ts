"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCtx } from "@/lib/ctx";
import { todayISO } from "@/lib/date";
import { syncListWithStock } from "@/lib/server/shopping-sync";
import { syncQuests } from "@/lib/server/xp";
import { planStockCheck } from "@/lib/stock-check";

const dec = (v: FormDataEntryValue | null, max = 100000) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? Math.min(max, Math.max(0, Math.round(n * 100) / 100)) : 0;
};
const int = (v: FormDataEntryValue | null) => Math.round(dec(v, 1_000_000_000));

/** Tombol − (pakai) dan + (tambah) di layar Stok. Mengembalikan stok terbaru. */
export async function adjustStock(itemId: string, delta: number): Promise<{ stock?: number; error?: string }> {
  const { supabase, householdId } = await getCtx();
  if (!Number.isFinite(delta) || delta === 0 || Math.abs(delta) > 1000) return { error: "Jumlah tidak valid" };

  const { data, error } = await supabase.rpc("adjust_stock", {
    p_item: itemId, p_delta: delta, p_reason: delta < 0 ? "use" : "adjust",
  });
  if (error) return { error: "Gagal mengubah stok" };
  await syncQuests(supabase, householdId, todayISO());
  return { stock: Number(data) };
}

export async function saveItem(form: FormData) {
  const { supabase, householdId } = await getCtx();
  const id = String(form.get("id") ?? "");
  const name = String(form.get("name") ?? "").trim();
  if (!name) redirect("/checklist/stok");

  const fields = {
    name,
    unit: String(form.get("unit") ?? "").trim() || "pcs",
    monthly_need: dec(form.get("monthly_need")),
    last_price: int(form.get("last_price")),
  };
  if (id) {
    await supabase.from("item").update(fields).eq("id", id);
  } else {
    await supabase.from("item").insert({ ...fields, household_id: householdId, stock: dec(form.get("stock")) });
  }
  revalidatePath("/checklist", "layout");
  redirect("/checklist/stok");
}

export async function archiveItem(form: FormData) {
  const { supabase } = await getCtx();
  await supabase.from("item").update({ active: false }).eq("id", String(form.get("id")));
  revalidatePath("/checklist", "layout");
  redirect("/checklist/stok");
}

/** Terapkan perkiraan pemakaian hasil hitung ulang dari pemakaian nyata. */
export async function applySuggestion(form: FormData) {
  const { supabase } = await getCtx();
  await supabase.from("item").update({ monthly_need: dec(form.get("value")) }).eq("id", String(form.get("id")));
  revalidatePath("/checklist", "layout");
  redirect("/checklist/stok");
}

/**
 * Selesai cek stok: sesuaikan stok dengan hitungan di rumah, tandai waktu cek, lalu
 * buat/segarkan checklist belanja dari stok yang baru.
 */
export async function applyStockCheck(counted: { itemId: string; count: number }[]): Promise<{ error?: string }> {
  const { supabase, me, householdId } = await getCtx();
  const today = todayISO();
  const clean = (counted ?? [])
    .map((c) => ({ itemId: String(c.itemId), count: Math.min(100000, Math.max(0, Math.round(Number(c.count) * 100) / 100)) }))
    .filter((c) => Number.isFinite(c.count));

  // Bandingkan dengan stok yang tersimpan sekarang (bukan yang tampil di layar) supaya aman dari perubahan pasangan.
  const { data } = await supabase.from("item").select("id, stock").eq("active", true);
  const current = new Map((data ?? []).map((r) => [r.id as string, Number(r.stock)]));

  for (const ch of planStockCheck(current, clean)) {
    const { error } = await supabase.rpc("adjust_stock", { p_item: ch.itemId, p_delta: ch.delta, p_reason: ch.reason });
    if (error) return { error: "Gagal memperbarui stok, coba lagi." };
  }
  const ids = [...current.keys()];
  if (ids.length) await supabase.from("item").update({ stock_checked_at: new Date().toISOString() }).in("id", ids);

  await syncQuests(supabase, householdId, today);
  await syncListWithStock(supabase, householdId, me.id, today);
  revalidatePath("/", "layout");
  redirect("/checklist");
}
