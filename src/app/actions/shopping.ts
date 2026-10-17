"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCtx } from "@/lib/ctx";
import { monthStart, todayISO } from "@/lib/date";
import { XP, savingPoints } from "@/lib/gamification";
import { evaluate, lineTotal, recommend } from "@/lib/shopping";
import type { ListItem } from "@/lib/types";
import { afterActivity, award, grantBadge } from "@/lib/server/xp";

const num = (v: unknown, max = 1_000_000_000) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(0, Math.round(n * 100) / 100)) : 0;
};

type ItemRow = { id: string; name: string; unit: string; monthly_need: number; stock: number; last_price: number };

async function activeItems(sb: Awaited<ReturnType<typeof getCtx>>["supabase"]) {
  const { data } = await sb.from("item").select("id, name, unit, monthly_need, stock, last_price").eq("active", true);
  return ((data ?? []) as ItemRow[]).map((i) => ({
    ...i, monthly_need: Number(i.monthly_need), stock: Number(i.stock), last_price: Number(i.last_price),
  }));
}

/** Checklist bulan ini dibuat otomatis dari rekomendasi: max(0, kebutuhan - stok). */
export async function createList() {
  const { supabase, me, householdId } = await getCtx();
  const month = monthStart(todayISO());

  const { data: list, error } = await supabase
    .from("shopping_list")
    .insert({ household_id: householdId, month, created_by: me.id })
    .select("id").single();
  if (error || !list) redirect("/checklist"); // sudah ada (dibuat pasangan)

  const rows = (await activeItems(supabase))
    .map((i) => ({ i, rec: recommend(i.monthly_need, i.stock) }))
    .filter((r) => r.rec > 0)
    .map(({ i, rec }) => ({
      household_id: householdId, list_id: list.id, item_id: i.id, name: i.name, unit: i.unit,
      qty_recommended: rec, qty_bought: rec, unit_price_est: i.last_price,
    }));
  if (rows.length) await supabase.from("shopping_list_item").insert(rows);

  revalidatePath("/checklist", "layout");
  redirect("/checklist");
}

/** Hitung ulang rekomendasi dari stok terbaru; barang yang sudah dicentang tidak diubah. */
export async function refreshList(form: FormData) {
  const { supabase, householdId } = await getCtx();
  const listId = String(form.get("list_id"));
  const { data: list } = await supabase.from("shopping_list").select("id, status").eq("id", listId).single();
  if (!list || list.status !== "open") redirect("/checklist");

  const { data: existing } = await supabase.from("shopping_list_item").select("*").eq("list_id", listId);
  const rows = (existing ?? []) as ListItem[];
  const byItem = new Map(rows.filter((r) => r.item_id).map((r) => [r.item_id as string, r]));

  for (const i of await activeItems(supabase)) {
    const rec = recommend(i.monthly_need, i.stock);
    const row = byItem.get(i.id);
    if (!row) {
      if (rec > 0) {
        await supabase.from("shopping_list_item").insert({
          household_id: householdId, list_id: listId, item_id: i.id, name: i.name, unit: i.unit,
          qty_recommended: rec, qty_bought: rec, unit_price_est: i.last_price,
        });
      }
    } else if (!row.checked) {
      if (rec === 0) await supabase.from("shopping_list_item").delete().eq("id", row.id);
      else {
        await supabase.from("shopping_list_item")
          .update({ qty_recommended: rec, qty_bought: rec, unit_price_est: i.last_price }).eq("id", row.id);
      }
    }
  }
  revalidatePath("/checklist", "layout");
  redirect("/checklist");
}

export async function updateListItem(
  id: string,
  patch: { checked?: boolean; qty_bought?: number; unit_price_actual?: number },
): Promise<{ ok: boolean }> {
  const { supabase } = await getCtx();
  const update: Record<string, unknown> = {};
  if (patch.checked !== undefined) update.checked = Boolean(patch.checked);
  if (patch.qty_bought !== undefined) update.qty_bought = num(patch.qty_bought, 100000);
  if (patch.unit_price_actual !== undefined) update.unit_price_actual = Math.round(num(patch.unit_price_actual));
  const { error } = await supabase.from("shopping_list_item").update(update).eq("id", id);
  return { ok: !error };
}

export async function addExtra(form: FormData) {
  const { supabase, householdId } = await getCtx();
  const listId = String(form.get("list_id"));
  const name = String(form.get("name") ?? "").trim();
  if (name) {
    await supabase.from("shopping_list_item").insert({
      household_id: householdId, list_id: listId, name,
      unit: String(form.get("unit") ?? "").trim() || "pcs",
      qty_recommended: 0, qty_bought: num(form.get("qty") || 1, 100000),
      unit_price_actual: Math.round(num(String(form.get("price") ?? "").replace(/\D/g, ""))),
      checked: true, is_extra: true,
    });
  }
  revalidatePath("/checklist", "layout");
  redirect("/checklist");
}

export async function removeListItem(form: FormData) {
  const { supabase } = await getCtx();
  await supabase.from("shopping_list_item").delete().eq("id", String(form.get("id")));
  revalidatePath("/checklist", "layout");
  redirect("/checklist");
}

/**
 * Selesai belanja: stok bertambah, harga terakhir diingat, pengeluaran "Belanja bulanan" tercatat,
 * lalu hemat & bonus dihitung. Status 'done' diklaim lebih dulu supaya tidak diproses dua kali.
 */
export async function finishList(form: FormData) {
  const { supabase, me, householdId } = await getCtx();
  const listId = String(form.get("list_id"));
  const today = todayISO();

  const { data: claimed } = await supabase
    .from("shopping_list")
    .update({ status: "done", completed_by: me.id, completed_at: new Date().toISOString() })
    .eq("id", listId).eq("status", "open").select("id, month").maybeSingle();
  if (!claimed) redirect("/evaluasi");

  const { data } = await supabase.from("shopping_list_item").select("*").eq("list_id", listId);
  const items = ((data ?? []) as ListItem[]).map((r) => ({
    ...r,
    qty_recommended: Number(r.qty_recommended), qty_bought: Number(r.qty_bought),
    unit_price_est: Number(r.unit_price_est), unit_price_actual: Number(r.unit_price_actual),
  }));
  const bought = items.filter((r) => r.checked);

  for (const r of bought) {
    if (!r.item_id) continue;
    if (r.qty_bought > 0) await supabase.rpc("adjust_stock", { p_item: r.item_id, p_delta: r.qty_bought, p_reason: "buy" });
    if (r.unit_price_actual > 0) await supabase.from("item").update({ last_price: r.unit_price_actual }).eq("id", r.item_id);
  }

  const total = bought.reduce((s, r) => s + lineTotal(r.qty_bought, r.unit_price_actual), 0);
  if (total > 0) {
    const { data: cat } = await supabase.from("category").select("id").eq("lump_sum", true).limit(1).maybeSingle();
    if (cat) {
      await supabase.from("expense").insert({
        household_id: householdId, category_id: cat.id, member_id: me.id,
        amount: total, spent_on: today, note: "Belanja bulanan",
      });
    }
  }

  const ev = evaluate(items);
  const period = String(claimed.month).slice(0, 7);
  await award(supabase, {
    householdId, memberId: me.id, kind: "saving", points: savingPoints(ev.saving),
    ref: `saving:${listId}`, note: `Hemat belanja ${ev.saving}`,
  });
  if (ev.withinRecommendation) {
    await award(supabase, {
      householdId, memberId: me.id, kind: "bonus", points: XP.bonus,
      ref: `bonus:${listId}`, note: "Belanja sesuai rekomendasi",
    });
    await grantBadge(supabase, householdId, "belanja_sesuai", period, me.id);
  }
  await afterActivity(supabase, householdId, today);

  revalidatePath("/", "layout");
  redirect(`/evaluasi?bulan=${period}-01`);
}
