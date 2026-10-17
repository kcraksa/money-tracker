import { applySuggestion } from "@/app/actions/stock";
import { getCtx } from "@/lib/ctx";
import { addMonths, monthStart, todayISO } from "@/lib/date";
import { qty, rupiah } from "@/lib/format";
import { recommend, suggestMonthlyNeed } from "@/lib/shopping";
import type { Item } from "@/lib/types";
import { ItemForm } from "./item-form";
import { StockStepper } from "./stock-stepper";

export const metadata = { title: "Stok rumah" };

export default async function StokPage() {
  const { supabase } = await getCtx();
  const today = todayISO();
  const since = addMonths(monthStart(today), -4);

  const [itemsRes, logsRes] = await Promise.all([
    supabase.from("item").select("id, name, unit, monthly_need, stock, last_price, active").eq("active", true).order("name"),
    supabase.from("stock_log").select("item_id, delta, created_at").eq("reason", "use").gte("created_at", `${since}T00:00:00+07:00`),
  ]);

  const items = ((itemsRes.data ?? []) as Item[]).map((i) => ({
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
      <header>
        <h1 className="text-xl font-bold">Stok rumah</h1>
        <p className="text-sm text-muted">Tekan − saat barang terpakai, + saat menambah. Rekomendasi beli = kebutuhan − stok.</p>
      </header>

      {items.length === 0 && <p className="card text-center text-muted">Belum ada barang. Tambahkan di bawah.</p>}

      <ul className="flex flex-col gap-3">
        {items.map((i) => {
          const rec = recommend(i.monthly_need, i.stock);
          const sug = suggestMonthlyNeed(logsBy.get(i.id) ?? [], today);
          const differs = sug && sug.suggested !== i.monthly_need;
          return (
            <li key={i.id} className="card flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{i.name}</div>
                  <div className="text-xs text-muted">
                    butuh {qty(i.monthly_need)} {i.unit}/bln{i.last_price ? ` · ${rupiah(i.last_price)}/${i.unit}` : ""}
                  </div>
                </div>
                <StockStepper itemId={i.id} initial={i.stock} unit={i.unit} />
              </div>

              <div className={`rounded-lg px-3 py-2 text-sm ${rec > 0 ? "bg-warn-bg text-warn" : "bg-ok-bg text-ok"}`}>
                {rec > 0 ? `Perlu beli ${qty(rec)} ${i.unit}` : "Stok cukup bulan ini"}
              </div>

              {differs && (
                <form action={applySuggestion} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted">
                    Pemakaian nyata rata-rata {qty(sug.suggested)} {i.unit}/bln ({sug.monthsUsed} bln terakhir).
                  </span>
                  <input type="hidden" name="id" value={i.id} />
                  <input type="hidden" name="value" value={sug.suggested} />
                  <button className="btn-soft min-h-10 shrink-0 px-3 text-sm">Pakai</button>
                </form>
              )}

              <details>
                <summary className="min-h-10 cursor-pointer text-sm text-muted">Ubah barang</summary>
                <ItemForm item={i} />
              </details>
            </li>
          );
        })}
      </ul>

      <details className="card" open={items.length === 0}>
        <summary className="min-h-10 cursor-pointer font-semibold">+ Tambah barang</summary>
        <ItemForm />
      </details>
    </div>
  );
}
