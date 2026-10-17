import { EmptyState } from "@/components/empty-state";
import { Package } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { DataNotice } from "@/components/data-notice";
import { getCtx } from "@/lib/ctx";
import { loadActiveItems } from "@/lib/server/items";
import { todayISO } from "@/lib/date";
import { agoLabel } from "@/lib/stock-check";
import { StockCheck } from "./stock-check";
import Link from "next/link";

export const metadata = { title: "Cek stok" };

export default async function CekStokPage() {
  const { supabase } = await getCtx();
  const today = todayISO();
  const res = await loadActiveItems<{ id: string; name: string; unit: string; stock: number; monthly_need: number }>(
    supabase, "id, name, unit, stock, monthly_need",
  );

  const items = res.rows.map((i) => ({
    id: i.id,
    name: i.name,
    unit: i.unit,
    stock: Number(i.stock),
    need: Number(i.monthly_need),
    checked: agoLabel(i.stock_checked_at, today),
  }));

  if (items.length === 0 && res.error) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Cek stok" back="/checklist" />
        <DataNotice error={res.error} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState icon={<Package className="h-8 w-8" />} title="Belum ada barang">
        <p className="max-w-xs text-sm text-muted">Tambahkan barang belanja bulanan dulu, baru stoknya bisa dicek.</p>
        <Link href="/checklist/stok" className="btn-primary mt-1">Isi daftar barang</Link>
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Cek stok" subtitle="Hitung barang di rumah sebelum belanja" back="/checklist" />
      <DataNotice outdated={res.outdated} error={res.error} />
      <StockCheck items={items} />
    </div>
  );
}
