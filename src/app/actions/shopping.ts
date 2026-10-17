"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCtx } from "@/lib/ctx";
import { todayISO } from "@/lib/date";
import { XP, savingPoints } from "@/lib/gamification";
import { learnOrder, type OrderEntry } from "@/lib/route";
import { evaluate, lineTotal, recommend } from "@/lib/shopping";
import type { ListItem } from "@/lib/types";
import { loadPeriodContext } from "@/lib/server/period";
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

/** Checklist periode ini dibuat otomatis dari rekomendasi: max(0, kebutuhan - stok). */
export async function createList() {
  const { supabase, me, householdId } = await getCtx();
  const month = (await loadPeriodContext(supabase, todayISO())).period.start;

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
  if (patch.checked !== undefined) {
    update.checked = Boolean(patch.checked);
    // Waktu centang = jejak langkah di toko; dari sinilah urutan rak dipelajari.
    update.checked_at = patch.checked ? new Date().toISOString() : null;
  }
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
      checked: true, is_extra: true, checked_at: new Date().toISOString(),
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
    .eq("id", listId).eq("status", "open").select("id, month, store_id").maybeSingle();
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

  if (claimed.store_id) await learnStoreOrder(supabase, householdId, claimed.store_id, items);

  const ev = evaluate(items);
  const period = String(claimed.month);
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

type Db = Awaited<ReturnType<typeof getCtx>>["supabase"];

/** Perbarui posisi rak tiap barang di toko ini dari urutan centang belanja barusan. */
async function learnStoreOrder(sb: Db, householdId: string, storeId: string, items: (ListItem & { checked_at?: string | null })[]) {
  const seq = items
    .filter((i) => i.checked && !i.is_extra && i.item_id && i.checked_at)
    .sort((a, b) => String(a.checked_at).localeCompare(String(b.checked_at)))
    .map((i) => i.item_id as string);
  if (seq.length < 2) return;

  const { data } = await sb.from("store_item_order").select("item_id, avg_pos, samples").eq("store_id", storeId);
  const prev = new Map<string, OrderEntry>(
    (data ?? []).map((r) => [r.item_id as string, { avg: Number(r.avg_pos), samples: Number(r.samples) }]),
  );
  const learned = learnOrder(prev, seq);
  const rows = [...learned].map(([item_id, v]) => ({
    household_id: householdId, store_id: storeId, item_id,
    avg_pos: Math.round(v.avg * 10000) / 10000, samples: v.samples, updated_at: new Date().toISOString(),
  }));
  if (rows.length) await sb.from("store_item_order").upsert(rows, { onConflict: "store_id,item_id" });
}

/** Pilih toko untuk belanja ini; urutan checklist langsung mengikuti rak toko tersebut. */
export async function setListStore(listId: string, storeId: string | null): Promise<{ ok: boolean }> {
  const { supabase } = await getCtx();
  const { error } = await supabase
    .from("shopping_list").update({ store_id: storeId }).eq("id", listId).eq("status", "open");
  revalidatePath("/checklist");
  return { ok: !error };
}

/** Tambah toko baru (mis. "Hari-Hari") dan langsung dipakai di belanja ini. */
export async function addStore(form: FormData) {
  const { supabase, householdId } = await getCtx();
  const listId = String(form.get("list_id") ?? "");
  const name = String(form.get("name") ?? "").trim().slice(0, 40);
  if (name) {
    const { data: found } = await supabase.from("store").select("id").ilike("name", name).maybeSingle();
    const storeId = found?.id ??
      (await supabase.from("store").insert({ household_id: householdId, name }).select("id").single()).data?.id;
    if (storeId && listId) await supabase.from("shopping_list").update({ store_id: storeId }).eq("id", listId).eq("status", "open");
  }
  revalidatePath("/checklist", "layout");
  redirect("/checklist");
}
