import { EmptyState } from "@/components/empty-state";
import { Package } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { getCtx } from "@/lib/ctx";
import { todayISO } from "@/lib/date";
import { agoLabel } from "@/lib/stock-check";
import { StockCheck } from "./stock-check";
import Link from "next/link";

export const metadata = { title: "Cek stok" };

export default async function CekStokPage() {
  const { supabase } = await getCtx();
  const today = todayISO();
  const { data } = await supabase
    .from("item")
    .select("id, name, unit, stock, monthly_need, stock_checked_at")
    .eq("active", true)
    .order("name");

  const items = (data ?? []).map((i) => ({
    id: i.id as string,
    name: i.name as string,
    unit: i.unit as string,
    stock: Number(i.stock),
    need: Number(i.monthly_need),
    checked: agoLabel(i.stock_checked_at as string | null, today),
  }));

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
      <StockCheck items={items} />
    </div>
  );
}
