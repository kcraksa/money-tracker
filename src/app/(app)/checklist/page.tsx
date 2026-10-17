import Link from "next/link";
import { createList } from "@/app/actions/shopping";
import { EmptyState } from "@/components/empty-state";
import { Check, ClipboardCheck, ChevronRight, ShoppingCart } from "@/components/icons";
import { getCtx } from "@/lib/ctx";
import { todayISO } from "@/lib/date";
import { periodLabel } from "@/lib/period";
import { loadActiveItems } from "@/lib/server/items";
import { DataNotice } from "@/components/data-notice";
import { loadPeriodContext } from "@/lib/server/period";
import { needsStockCheck } from "@/lib/stock-check";
import type { ListItem, ShoppingList } from "@/lib/types";
import { ShoppingChecklist } from "./shopping-checklist";

export const metadata = { title: "Checklist belanja" };

export default async function ChecklistPage() {
  const { supabase } = await getCtx();
  const { period } = await loadPeriodContext(supabase, todayISO());
  const month = period.start;
  const label = periodLabel(period);

  const today = todayISO();
  const itemsRes = await loadActiveItems<{ id: string }>(supabase, "id");
  const itemRows = itemsRes.rows;
  // Saat database belum diperbarui, jangan terus-menerus menyarankan cek stok.
  const suggestCheck = itemRows.length > 0 && !itemsRes.outdated && needsStockCheck(itemRows.map((r) => r.stock_checked_at), today);

  const { data: list } = await supabase
    .from("shopping_list").select("id, month, status, store_id, completed_by, completed_at").eq("month", month).maybeSingle();

  if (!list) {
    const count = itemRows.length;
    return (
      <div className="flex flex-col gap-4">
      <DataNotice outdated={itemsRes.outdated} error={itemsRes.error} />
      <EmptyState icon={<ShoppingCart className="h-8 w-8" />} title={`Belanja ${label}`}>
        {count === 0 ? (
          <>
            <p className="max-w-xs text-sm text-muted">
              Belum ada barang. Tambahkan barang belanja bulanan dulu di tab Stok rumah.
            </p>
            <Link href="/checklist/stok" transitionTypes={["nav-forward"]} className="btn-primary mt-1">Isi daftar barang</Link>
          </>
        ) : (
          <>
            <p className="max-w-xs text-sm text-muted">
              Checklist dibuat otomatis dari rekomendasi: kebutuhan bulanan dikurangi stok di rumah.
            </p>
            <Link href="/checklist/cek" transitionTypes={["nav-forward"]} className="btn-primary mt-1">
              <ClipboardCheck className="h-[18px] w-[18px]" aria-hidden /> Cek stok dulu (disarankan)
            </Link>
            <form action={createList}><button className="btn-ghost text-sm">Lewati, buat checklist sekarang</button></form>
          </>
        )}
      </EmptyState>
      </div>
    );
  }

  const { data } = await supabase.from("shopping_list_item").select("*").eq("list_id", list.id).order("created_at");
  const items = ((data ?? []) as ListItem[]).map((r) => ({
    ...r,
    qty_recommended: Number(r.qty_recommended), qty_bought: Number(r.qty_bought),
    unit_price_est: Number(r.unit_price_est), unit_price_actual: Number(r.unit_price_actual),
  }));

  if ((list as ShoppingList).status === "done") {
    return (
      <EmptyState icon={<Check className="h-8 w-8" />} title={`Belanja ${label} selesai`}>
        <p className="max-w-xs text-sm text-muted">
          Lihat hasilnya: rekomendasi vs yang dibeli, dan uang yang dihemat.
        </p>
        <Link href={`/evaluasi?bulan=${month}`} className="btn-primary mt-1">Lihat evaluasi</Link>
      </EmptyState>
    );
  }

  const storeId = (list as ShoppingList).store_id ?? null;
  const [stores, orders] = await Promise.all([
    supabase.from("store").select("id, name").order("name"),
    storeId
      ? supabase.from("store_item_order").select("item_id, avg_pos, samples").eq("store_id", storeId)
      : Promise.resolve({ data: [] }),
  ]);
  const order: Record<string, { avg: number; samples: number }> = {};
  for (const o of orders.data ?? []) order[o.item_id as string] = { avg: Number(o.avg_pos), samples: Number(o.samples) };

  return (
    <div className="flex flex-col gap-4">
      <DataNotice outdated={itemsRes.outdated} error={itemsRes.error} />
      {suggestCheck && (
        <Link href="/checklist/cek" transitionTypes={["nav-forward"]} className="flex items-center gap-3 rounded-2xl bg-primary-soft p-3.5 text-sm">
          <ClipboardCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          <span className="flex-1"><b>Sudah cek stok di rumah?</b> Cek dulu supaya rekomendasi belanja akurat.</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        </Link>
      )}
    <ShoppingChecklist
      listId={list.id} periodLabel={label} initialItems={items}
      stores={(stores.data ?? []) as { id: string; name: string }[]} storeId={storeId} order={order}
    />
    </div>
  );
}
