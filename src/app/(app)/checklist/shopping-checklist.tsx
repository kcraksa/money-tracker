"use client";

import { useState } from "react";
import { addExtra, finishList, refreshList, removeListItem, updateListItem } from "@/app/actions/shopping";
import { Check, Minus, Plus, RefreshCw, X } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { ProgressBar } from "@/components/progress-bar";
import { qty as fmtQty, rupiah } from "@/lib/format";
import { lineTotal } from "@/lib/shopping";
import type { ListItem } from "@/lib/types";

type Props = { listId: string; monthLabel: string; initialItems: ListItem[] };

export function ShoppingChecklist({ listId, monthLabel, initialItems }: Props) {
  const [items, setItems] = useState(initialItems);
  const [showExtra, setShowExtra] = useState(false);
  // Sinkron saat pasangan mengubah daftar (router.refresh dari realtime).
  const [seen, setSeen] = useState(initialItems);
  if (seen !== initialItems) {
    setSeen(initialItems);
    setItems(initialItems);
  }

  const planned = items.filter((i) => !i.is_extra);
  const estimate = planned.reduce((s, i) => s + lineTotal(i.qty_recommended, i.unit_price_est), 0);
  const actual = items.filter((i) => i.checked).reduce((s, i) => s + lineTotal(i.qty_bought, i.unit_price_actual), 0);
  const doneCount = planned.filter((i) => i.checked).length;
  const over = estimate > 0 && actual > estimate;

  function patch(id: string, p: Partial<ListItem>) {
    setItems((list) => list.map((i) => (i.id === id ? { ...i, ...p } : i)));
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Belanja bulanan" subtitle={monthLabel} />

      <section className="card flex flex-col gap-3" aria-label="Ringkasan belanja">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-medium text-muted">Estimasi</div>
            <div className="text-xl font-bold tracking-tight tabular-nums">{rupiah(estimate)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs font-medium text-muted">Terbelanja</div>
            <div className={`text-xl font-bold tracking-tight tabular-nums ${over ? "text-danger" : "text-ok"}`}>
              {rupiah(actual)}
            </div>
          </div>
        </div>
        <ProgressBar pct={planned.length ? (doneCount / planned.length) * 100 : 0} label="Barang dicentang" />
        <div className="text-xs text-muted">{doneCount} dari {planned.length} barang dicentang</div>
      </section>

      {planned.length === 0 && (
        <p className="card text-center text-sm text-muted">Stok masih cukup, tidak ada yang perlu dibeli bulan ini. 🎉</p>
      )}

      <ul className="flex flex-col gap-2.5">
        {items.map((it) => <Row key={it.id} item={it} onChange={(p) => patch(it.id, p)} />)}
      </ul>

      {showExtra ? (
        <form action={addExtra} className="card animate-pop grid grid-cols-6 gap-2">
          <input type="hidden" name="list_id" value={listId} />
          <p className="col-span-6 text-sm font-semibold">Barang di luar daftar</p>
          <input name="name" required className="input col-span-6" placeholder="Nama barang" />
          <input name="qty" inputMode="decimal" className="input col-span-2" placeholder="Jml" defaultValue="1" aria-label="Jumlah" />
          <input name="unit" className="input col-span-2" placeholder="pcs" aria-label="Satuan" />
          <input name="price" inputMode="numeric" className="input col-span-2" placeholder="Harga" aria-label="Harga per satuan" />
          <button className="btn-primary col-span-4">Tambah</button>
          <button type="button" className="btn-soft col-span-2" onClick={() => setShowExtra(false)}>Batal</button>
        </form>
      ) : (
        <button className="btn-soft border-dashed" onClick={() => setShowExtra(true)}>
          <Plus className="h-4 w-4" aria-hidden /> Barang di luar daftar
        </button>
      )}

      <div className="grid grid-cols-[auto_1fr] gap-2">
        <form action={refreshList}>
          <input type="hidden" name="list_id" value={listId} />
          <button className="btn-soft h-full px-4" aria-label="Segarkan rekomendasi dari stok" title="Segarkan dari stok">
            <RefreshCw className="h-[18px] w-[18px]" aria-hidden />
          </button>
        </form>
        <form
          action={finishList}
          onSubmit={(e) => {
            if (!confirm(`Selesai belanja? Stok akan bertambah dan ${rupiah(actual)} dicatat sebagai pengeluaran.`)) e.preventDefault();
          }}
        >
          <input type="hidden" name="list_id" value={listId} />
          <button className="btn-primary w-full" disabled={actual === 0}>
            <Check className="h-[18px] w-[18px]" aria-hidden /> Selesai belanja
          </button>
        </form>
      </div>
    </div>
  );
}

function Row({ item, onChange }: { item: ListItem; onChange: (p: Partial<ListItem>) => void }) {
  const [price, setPrice] = useState(item.unit_price_actual ? String(item.unit_price_actual) : "");
  const [seenPrice, setSeenPrice] = useState(item.unit_price_actual);
  if (seenPrice !== item.unit_price_actual) {
    setSeenPrice(item.unit_price_actual);
    setPrice(item.unit_price_actual ? String(item.unit_price_actual) : "");
  }

  function toggle() {
    const checked = !item.checked;
    // Saat pertama dicentang, isi harga dengan estimasi supaya tinggal koreksi sesuai rak.
    const unit_price_actual = checked && !item.unit_price_actual ? item.unit_price_est : item.unit_price_actual;
    onChange({ checked, unit_price_actual });
    setPrice(unit_price_actual ? String(unit_price_actual) : "");
    updateListItem(item.id, { checked, unit_price_actual });
  }

  function step(delta: number) {
    const q = Math.max(0, Math.round((item.qty_bought + delta) * 100) / 100);
    onChange({ qty_bought: q });
    updateListItem(item.id, { qty_bought: q });
  }

  function commitPrice() {
    const v = Number(price || 0);
    onChange({ unit_price_actual: v });
    updateListItem(item.id, { unit_price_actual: v });
  }

  const total = lineTotal(item.qty_bought, item.unit_price_actual);

  return (
    <li className={`card flex flex-col gap-3 p-3.5 transition ${item.checked ? "border-primary/40 bg-primary-soft" : ""}`}>
      <div className="flex items-center gap-3">
        <button
          role="checkbox" aria-checked={item.checked} aria-label={`Centang ${item.name}`} onClick={toggle}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition ${
            item.checked ? "border-primary bg-primary text-primary-fg" : "border-border bg-surface"
          }`}
        >
          {item.checked && <Check className="h-4 w-4" strokeWidth={3} aria-hidden />}
        </button>
        <div className="min-w-0 flex-1">
          <div className={`truncate font-semibold ${item.checked ? "text-muted line-through" : ""}`}>{item.name}</div>
          <div className="text-xs text-muted">
            {item.is_extra
              ? "Di luar daftar"
              : `Beli ${fmtQty(item.qty_recommended)} ${item.unit}${item.unit_price_est ? ` · est. ${rupiah(item.unit_price_est)}/${item.unit}` : ""}`}
          </div>
        </div>
        {item.is_extra && (
          <form action={removeListItem}>
            <input type="hidden" name="id" value={item.id} />
            <button aria-label={`Hapus ${item.name}`} className="flex h-9 w-9 items-center justify-center rounded-full text-muted">
              <X className="h-4 w-4" aria-hidden />
            </button>
          </form>
        )}
      </div>

      {item.checked && (
        <div className="animate-pop flex flex-wrap items-center gap-2 pl-11">
          <div className="flex items-center rounded-xl border border-border bg-surface" role="group" aria-label="Jumlah dibeli">
            <button className="flex h-10 w-10 items-center justify-center text-muted" aria-label="Kurangi" onClick={() => step(-1)}>
              <Minus className="h-4 w-4" aria-hidden />
            </button>
            <span className="w-9 text-center font-bold tabular-nums">{fmtQty(item.qty_bought)}</span>
            <button className="flex h-10 w-10 items-center justify-center text-primary" aria-label="Tambah" onClick={() => step(1)}>
              <Plus className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <span className="text-muted" aria-hidden>×</span>
          <input
            inputMode="numeric" aria-label={`Harga per ${item.unit}`} placeholder={`Harga/${item.unit}`}
            className="input min-h-10 w-28 px-3 text-right font-semibold tabular-nums" value={price}
            onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} onBlur={commitPrice}
          />
          <div className="basis-full text-right text-sm text-muted">
            Subtotal <span className="font-bold tabular-nums text-fg">{rupiah(total)}</span>
          </div>
        </div>
      )}
    </li>
  );
}
