import { applySuggestion } from "@/app/actions/stock";
import Link from "next/link";
import { ChevronRight, ClipboardCheck, Lightbulb, Plus } from "@/components/icons";
import { EmptyState } from "@/components/empty-state";
import { Package } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { getCtx } from "@/lib/ctx";
import { addMonths, monthStart, todayISO } from "@/lib/date";
import { qty, rupiah } from "@/lib/format";
import { recommend, suggestMonthlyNeed } from "@/lib/shopping";
import { agoLabel } from "@/lib/stock-check";
import type { Item } from "@/lib/types";
import { ItemForm } from "./item-form";
import { StockStepper } from "./stock-stepper";

export const metadata = { title: "Stok rumah" };

export default async function StokPage() {
  const { supabase } = await getCtx();
  const today = todayISO();
  const since = addMonths(monthStart(today), -4);

  const [itemsRes, logsRes] = await Promise.all([
    supabase.from("item").select("id, name, unit, monthly_need, stock, last_price, active, stock_checked_at").eq("active", true).order("name"),
    supabase.from("stock_log").select("item_id, delta, created_at").eq("reason", "use").gte("created_at", `${since}T00:00:00+07:00`),
  ]);

  const items = ((itemsRes.data ?? []) as (Item & { stock_checked_at: string | null })[]).map((i) => ({
    ...i, monthly_need: Number(i.monthly_need), stock: Number(i.stock), last_price: Number(i.last_price),
  }));
  const logsBy = new Map<string, { delta: number; created_on: string }[]>();
  for (const l of logsRes.data ?? []) {
    const arr = logsBy.get(l.item_id) ?? [];
    arr.push({ delta: Number(l.delta), created_on: todayISO(new Date(l.created_at)) });
    logsBy.set(l.item_id, arr);
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Stok rumah" subtitle="Tekan − saat terpakai, + saat menambah" />

      {items.length > 0 && (
        <Link href="/checklist/cek" className="card flex items-center gap-3 p-4 transition active:scale-[0.99]">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <ClipboardCheck className="h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Cek stok sebelum belanja</span>
            <span className="block text-xs text-muted">Hitung barang di rumah, checklist otomatis menyesuaikan</span>
          </span>
          <ChevronRight className="h-5 w-5 text-muted" aria-hidden />
        </Link>
      )}

      {items.length === 0 && (
        <EmptyState icon={<Package className="h-8 w-8" />} title="Belum ada barang">
          <p className="max-w-xs text-sm text-muted">Tambahkan barang belanja bulanan di bawah. Satuan dan harga mengikuti yang tertera di rak.</p>
        </EmptyState>
      )}

      <ul className="flex flex-col gap-2.5">
        {items.map((i) => {
          const rec = recommend(i.monthly_need, i.stock);
          const sug = suggestMonthlyNeed(logsBy.get(i.id) ?? [], today);
          const differs = sug && sug.suggested !== i.monthly_need;
          return (
            <li key={i.id} className="card flex flex-col gap-3 p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-semibold">{i.name}</div>
                  <div className="text-xs text-muted">
                    butuh {qty(i.monthly_need)} {i.unit}/periode{i.last_price ? ` · ${rupiah(i.last_price)}/${i.unit}` : ""} · {agoLabel(i.stock_checked_at, today)}
                  </div>
                </div>
                <StockStepper itemId={i.id} initial={i.stock} unit={i.unit} />
              </div>

              <div><span className={`pill ${rec > 0 ? "bg-warn-bg text-warn" : "bg-ok-bg text-ok"}`}>
                {rec > 0 ? `Perlu beli ${qty(rec)} ${i.unit}` : "Stok cukup bulan ini"}
              </span></div>

              {differs && (
                <form action={applySuggestion} className="flex items-center justify-between gap-3 rounded-xl bg-accent-soft p-3 text-sm">
                  <Lightbulb className="h-4 w-4 shrink-0 text-warn" aria-hidden />
                  <span className="flex-1 text-fg">
                    Pemakaian nyata rata-rata {qty(sug.suggested)} {i.unit}/bln ({sug.monthsUsed} bln terakhir).
                  </span>
                  <input type="hidden" name="id" value={i.id} />
                  <input type="hidden" name="value" value={sug.suggested} />
                  <button className="btn-primary min-h-9 shrink-0 px-3 text-sm">Pakai</button>
                </form>
              )}

              <details>
                <summary className="flex min-h-10 cursor-pointer items-center text-sm font-medium text-muted">Ubah barang</summary>
                <ItemForm item={i} />
              </details>
            </li>
          );
        })}
      </ul>

      <details className="card" open={items.length === 0}>
        <summary className="flex min-h-10 cursor-pointer items-center gap-2 font-semibold"><Plus className="h-4 w-4" aria-hidden /> Tambah barang</summary>
        <ItemForm />
      </details>
    </div>
  );
}
