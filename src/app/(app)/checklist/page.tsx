import Link from "next/link";
import { createList } from "@/app/actions/shopping";
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
      <div className="card flex flex-col items-center gap-3 py-8 text-center">
        <div className="text-4xl">🛒</div>
        <h1 className="text-lg font-bold">Belanja {monthLabel(month)}</h1>
        {(count ?? 0) === 0 ? (
          <>
            <p className="text-muted">Belum ada barang. Tambahkan barang belanja bulanan dulu di tab Stok rumah.</p>
            <Link href="/checklist/stok" className="btn-primary">Isi daftar barang</Link>
          </>
        ) : (
          <>
            <p className="text-muted">Checklist dibuat otomatis dari rekomendasi: kebutuhan bulanan dikurangi stok di rumah.</p>
            <form action={createList}><button className="btn-primary">Buat checklist bulan ini</button></form>
          </>
        )}
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
      <div className="card flex flex-col items-center gap-3 py-8 text-center">
        <div className="text-4xl">✅</div>
        <h1 className="text-lg font-bold">Belanja {monthLabel(month)} sudah selesai</h1>
        <p className="text-muted">Lihat hasilnya: rekomendasi vs yang dibeli, dan uang yang dihemat.</p>
        <Link href={`/evaluasi?bulan=${month}`} className="btn-primary">Lihat evaluasi</Link>
      </div>
    );
  }

  return <ShoppingChecklist listId={list.id} monthLabel={monthLabel(month)} initialItems={items} />;
}
