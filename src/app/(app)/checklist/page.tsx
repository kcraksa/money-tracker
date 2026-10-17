import Link from "next/link";
import { createList } from "@/app/actions/shopping";
import { EmptyState } from "@/components/empty-state";
import { Check, ShoppingCart } from "@/components/icons";
import { getCtx } from "@/lib/ctx";
import { monthLabel, monthStart, todayISO } from "@/lib/date";
import type { ListItem, ShoppingList } from "@/lib/types";
import { ShoppingChecklist } from "./shopping-checklist";

export const metadata = { title: "Checklist belanja" };

export default async function ChecklistPage() {
  const { supabase } = await getCtx();
  const month = monthStart(todayISO());

  const { data: list } = await supabase
    .from("shopping_list").select("id, month, status, completed_by, completed_at").eq("month", month).maybeSingle();

  if (!list) {
    const { count } = await supabase.from("item").select("id", { count: "exact", head: true }).eq("active", true);
    return (
      <EmptyState icon={<ShoppingCart className="h-8 w-8" />} title={`Belanja ${monthLabel(month)}`}>
        {(count ?? 0) === 0 ? (
          <>
            <p className="max-w-xs text-sm text-muted">
              Belum ada barang. Tambahkan barang belanja bulanan dulu di tab Stok rumah.
            </p>
            <Link href="/checklist/stok" className="btn-primary mt-1">Isi daftar barang</Link>
          </>
        ) : (
          <>
            <p className="max-w-xs text-sm text-muted">
              Checklist dibuat otomatis dari rekomendasi: kebutuhan bulanan dikurangi stok di rumah.
            </p>
            <form action={createList}><button className="btn-primary mt-1">Buat checklist bulan ini</button></form>
          </>
        )}
      </EmptyState>
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
      <EmptyState icon={<Check className="h-8 w-8" />} title={`Belanja ${monthLabel(month)} selesai`}>
        <p className="max-w-xs text-sm text-muted">
          Lihat hasilnya: rekomendasi vs yang dibeli, dan uang yang dihemat.
        </p>
        <Link href={`/evaluasi?bulan=${month}`} className="btn-primary mt-1">Lihat evaluasi</Link>
      </EmptyState>
    );
  }

  return <ShoppingChecklist listId={list.id} monthLabel={monthLabel(month)} initialItems={items} />;
}
