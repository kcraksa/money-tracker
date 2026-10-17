"use client";

import { useState } from "react";
import { addExtra, finishList, refreshList, removeListItem, updateListItem } from "@/app/actions/shopping";
import { lineTotal } from "@/lib/shopping";
import { qty as fmtQty, rupiah } from "@/lib/format";
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

  function patch(id: string, p: Partial<ListItem>) {
    setItems((list) => list.map((i) => (i.id === id ? { ...i, ...p } : i)));
  }

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-bold">Belanja {monthLabel}</h1>
        <p className="text-sm text-muted">{doneCount}/{planned.length} barang dicentang</p>
      </header>

      <div className="card grid grid-cols-2 gap-3 text-center" aria-label="Ringkasan">
        <div>
          <div className="text-xs text-muted">Estimasi total</div>
          <div className="text-lg font-bold tabular-nums">{rupiah(estimate)}</div>
        </div>
        <div>
          <div className="text-xs text-muted">Terbelanja</div>
          <div className={`text-lg font-bold tabular-nums ${actual > estimate && estimate > 0 ? "text-danger" : "text-ok"}`}>
            {rupiah(actual)}
          </div>
        </div>
      </div>

      {planned.length === 0 && (
        <p className="card text-center text-muted">
          Stok masih cukup, tidak ada yang perlu dibeli bulan ini. 🎉
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {items.map((it) => (
          <Row key={it.id} item={it} onChange={(p) => patch(it.id, p)} />
        ))}
      </ul>

      {showExtra ? (
        <form action={addExtra} className="card grid grid-cols-6 gap-2">
          <input type="hidden" name="list_id" value={listId} />
          <p className="col-span-6 text-sm font-semibold">Barang di luar daftar</p>
          <input name="name" required className="input col-span-6" placeholder="Nama barang" />
          <input name="qty" inputMode="decimal" className="input col-span-2" placeholder="Jml" defaultValue="1" aria-label="Jumlah" />
          <input name="unit" className="input col-span-2" placeholder="pcs" aria-label="Satuan" />
          <input name="price" inputMode="numeric" className="input col-span-2" placeholder="Harga/sat." aria-label="Harga per satuan" />
          <button className="btn-primary col-span-4">Tambah</button>
          <button type="button" className="btn-soft col-span-2" onClick={() => setShowExtra(false)}>Batal</button>
        </form>
      ) : (
        <button className="btn-soft" onClick={() => setShowExtra(true)}>+ Barang di luar daftar</button>
      )}

      <div className="grid grid-cols-2 gap-2">
        <form action={refreshList}>
          <input type="hidden" name="list_id" value={listId} />
          <button className="btn-soft w-full text-sm">↻ Segarkan dari stok</button>
        </form>
        <form
          action={finishList}
          onSubmit={(e) => {
            if (!confirm(`Selesai belanja? Stok akan bertambah dan ${rupiah(actual)} dicatat sebagai pengeluaran.`)) e.preventDefault();
          }}
        >
          <input type="hidden" name="list_id" value={listId} />
          <button className="btn-primary w-full" disabled={actual === 0}>Selesai belanja</button>
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
    <li className={`card flex flex-col gap-2 ${item.checked ? "border-primary/50 bg-primary/5" : ""}`}>
      <div className="flex items-center gap-3">
        <button
          role="checkbox" aria-checked={item.checked} aria-label={`Centang ${item.name}`} onClick={toggle}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 text-lg ${
            item.checked ? "border-primary bg-primary text-primary-fg" : "border-border"
          }`}
        >
          {item.checked ? "✓" : ""}
        </button>
        <div className="min-w-0 flex-1">
          <div className={`truncate font-medium ${item.checked ? "line-through opacity-70" : ""}`}>{item.name}</div>
          <div className="text-xs text-muted">
            {item.is_extra
              ? "di luar daftar"
              : `rekomendasi ${fmtQty(item.qty_recommended)} ${item.unit}${item.unit_price_est ? ` · est. ${rupiah(item.unit_price_est)}/${item.unit}` : ""}`}
          </div>
        </div>
        {item.is_extra && (
          <form action={removeListItem}>
            <input type="hidden" name="id" value={item.id} />
            <button aria-label={`Hapus ${item.name}`} className="h-10 w-10 text-muted">✕</button>
          </form>
        )}
      </div>

      {item.checked && (
        <div className="flex flex-wrap items-center gap-2 pl-12">
          <div className="flex items-center gap-1" role="group" aria-label="Jumlah dibeli">
            <button className="h-10 w-10 rounded-lg bg-surface-2 text-xl" aria-label="Kurangi" onClick={() => step(-1)}>−</button>
            <span className="w-12 text-center font-semibold tabular-nums">{fmtQty(item.qty_bought)}</span>
            <button className="h-10 w-10 rounded-lg bg-surface-2 text-xl" aria-label="Tambah" onClick={() => step(1)}>+</button>
          </div>
          <span className="text-muted" aria-hidden>×</span>
          <input
            inputMode="numeric" aria-label={`Harga per ${item.unit}`} placeholder={`Harga/${item.unit}`}
            className="input min-h-10 w-28 px-2 text-right" value={price}
            onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} onBlur={commitPrice}
          />
          <div className="basis-full text-right text-sm text-muted">
            Subtotal <span className="font-semibold tabular-nums text-fg">{rupiah(total)}</span>
          </div>
        </div>
      )}
    </li>
  );
}
