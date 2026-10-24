import type { SupabaseClient } from "@supabase/supabase-js";
import { recommend } from "@/lib/shopping";
import type { ListItem } from "@/lib/types";
import { loadPeriodContext } from "./period";

type ItemRow = { id: string; name: string; unit: string; monthly_need: number; stock: number; last_price: number };

export async function activeItems(sb: SupabaseClient) {
  const { data } = await sb.from("item").select("id, name, unit, monthly_need, stock, last_price").eq("active", true);
  return ((data ?? []) as ItemRow[]).map((i) => ({
    ...i, monthly_need: Number(i.monthly_need), stock: Number(i.stock), last_price: Number(i.last_price),
  }));
}

/**
 * Buat checklist periode ini bila belum ada, lalu hitung ulang rekomendasi dari stok terbaru:
 * max(0, kebutuhan - stok). Barang stok-cukup ikut masuk (rekomendasi 0, hanya info). Barang yang sudah dicentang tidak diubah; daftar yang sudah selesai dibiarkan.
 */
export async function syncListWithStock(
  sb: SupabaseClient, householdId: string, memberId: string, today: string,
): Promise<"created" | "refreshed" | "done"> {
  const { period } = await loadPeriodContext(sb, today);

  let list = (await sb.from("shopping_list").select("id, status").eq("month", period.start).maybeSingle()).data;
  let created = false;
  if (!list) {
    const ins = await sb
      .from("shopping_list")
      .insert({ household_id: householdId, month: period.start, created_by: memberId })
      .select("id, status").single();
    // Bila pasangan membuatnya bersamaan, pakai yang sudah ada.
    list = ins.data ?? (await sb.from("shopping_list").select("id, status").eq("month", period.start).maybeSingle()).data;
    created = Boolean(ins.data);
  }
  if (!list) throw new Error("Gagal membuat checklist");
  if (list.status !== "open") return "done";

  const { data: existing } = await sb.from("shopping_list_item").select("*").eq("list_id", list.id);
  const byItem = new Map(((existing ?? []) as ListItem[]).filter((r) => r.item_id).map((r) => [r.item_id as string, r]));

  const toInsert: Record<string, unknown>[] = [];
  for (const i of await activeItems(sb)) {
    const rec = recommend(i.monthly_need, i.stock);
    const row = byItem.get(i.id);
    // Stok cukup (rec 0) tetap masuk daftar sebagai info; jumlah beli bawaan 1 bila ingin tetap dibeli.
    const bought = rec > 0 ? rec : 1;
    if (!row) {
      toInsert.push({
        household_id: householdId, list_id: list.id, item_id: i.id, name: i.name, unit: i.unit,
        qty_recommended: rec, qty_bought: bought, unit_price_est: i.last_price,
      });
    } else if (
      !row.checked &&
      (Number(row.qty_recommended) !== rec || Number(row.qty_bought) !== bought || Number(row.unit_price_est) !== i.last_price)
    ) {
      await sb.from("shopping_list_item")
        .update({ qty_recommended: rec, qty_bought: bought, unit_price_est: i.last_price }).eq("id", row.id);
    }
  }
  if (toInsert.length) await sb.from("shopping_list_item").insert(toInsert);
  return created ? "created" : "refreshed";
}
