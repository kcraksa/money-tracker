"use client";

import { Fragment, useMemo, useState } from "react";
import { addExtra, addStore, finishList, refreshList, removeListItem, setListStore, updateListItem } from "@/app/actions/shopping";
import { Check, Minus, Plus, RefreshCw, Route, Store, X } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { ProgressBar } from "@/components/progress-bar";
import { qty as fmtQty, rupiah } from "@/lib/format";
import { sortByRoute, type OrderEntry } from "@/lib/route";
import { lineTotal } from "@/lib/shopping";
import type { ListItem } from "@/lib/types";

type Store = { id: string; name: string };
type Props = {
  listId: string;
  periodLabel: string;
  initialItems: ListItem[];
  stores: Store[];
  storeId: string | null;
  order: Record<string, OrderEntry>;
};

export function ShoppingChecklist({ listId, periodLabel, initialItems, stores, storeId: initialStore, order }: Props) {
  const [items, setItems] = useState(initialItems);
  const [storeId, setStoreId] = useState(initialStore);
  const [showExtra, setShowExtra] = useState(false);
  const [showStore, setShowStore] = useState(false);
  // Barang yang baru dicentang tetap di tempatnya (untuk isi harga) sampai barang berikutnya dicentang.
  const [activeId, setActiveId] = useState<string | null>(null);
  // Sinkron saat pasangan mengubah daftar (router.refresh dari realtime).
  const [seen, setSeen] = useState(initialItems);
  const [seenStore, setSeenStore] = useState(initialStore);
  if (seen !== initialItems) {
    setSeen(initialItems);
    setItems(initialItems);
  }
  if (seenStore !== initialStore) {
    setSeenStore(initialStore);
    setStoreId(initialStore);
  }

  const orderMap = useMemo(() => new Map(Object.entries(order)), [order]);
  const checkedAt = useMemo(
    () => new Map(items.map((i) => [i.id, i.checked_at ? Date.parse(i.checked_at) : 0])),
    [items],
  );
  const routed = useMemo(() => {
    const original = new Map(items.map((i) => [i.id, i.checked]));
    const sortable = items.map((i) => (i.id === activeId ? { ...i, checked: false } : i));
    return sortByRoute(sortable, storeId ? orderMap : new Map(), checkedAt).map((r) => ({
      ...r, checked: original.get(r.id) ?? r.checked, sunk: Boolean(original.get(r.id)) && r.id !== activeId,
    }));
  }, [items, orderMap, checkedAt, storeId, activeId]);
  const trips = Math.max(0, ...[...orderMap.values()].map((o) => o.samples));
  const store = stores.find((s) => s.id === storeId);

  const planned = items.filter((i) => !i.is_extra);
  const estimate = planned.reduce((s, i) => s + lineTotal(i.qty_recommended, i.unit_price_est), 0);
  const actual = items.filter((i) => i.checked).reduce((s, i) => s + lineTotal(i.qty_bought, i.unit_price_actual), 0);
  const doneCount = planned.filter((i) => i.checked).length;
  const over = estimate > 0 && actual > estimate;

  function patch(id: string, p: Partial<ListItem>) {
    if (p.checked !== undefined) setActiveId(p.checked ? id : null);
    setItems((list) => list.map((i) => (i.id === id ? { ...i, ...p } : i)));
  }

  function pickStore(id: string | null) {
    setStoreId(id);
    setListStore(listId, id);
  }

  // Penanda bagian: rute toko / posisi belum diketahui / sudah di keranjang.
  const firstUnknown = storeId ? routed.findIndex((i) => !i.sunk && !i.known) : -1;
  const firstChecked = routed.findIndex((i) => i.sunk);
  const hasKnownOpen = routed.some((i) => !i.sunk && i.known);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Belanja" subtitle={periodLabel} />

      <section className="card flex flex-col gap-3" aria-label="Toko">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Store className="h-4 w-4 text-primary" aria-hidden /> Belanja di mana?
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Pilih toko">
          {stores.map((s) => (
            <button
              key={s.id} aria-pressed={s.id === storeId} onClick={() => pickStore(s.id === storeId ? null : s.id)}
              className={`min-h-10 rounded-full border px-4 text-sm font-semibold transition active:scale-95 ${
                s.id === storeId ? "border-primary bg-primary text-primary-fg" : "border-border bg-surface"
              }`}
            >
              {s.name}
            </button>
          ))}
          <button
            onClick={() => setShowStore((v) => !v)} aria-expanded={showStore}
            className="flex min-h-10 items-center gap-1.5 rounded-full border border-dashed border-border px-4 text-sm font-semibold text-muted"
          >
            <Plus className="h-4 w-4" aria-hidden /> Toko
          </button>
        </div>
        {showStore && (
          <form action={addStore} className="animate-pop flex gap-2">
            <input type="hidden" name="list_id" value={listId} />
            <input name="name" required maxLength={40} className="input min-h-11" placeholder="Nama toko, mis. Hari-Hari" aria-label="Nama toko" />
            <button className="btn-primary shrink-0">Tambah</button>
          </form>
        )}
        <p className="flex items-start gap-2 text-xs text-muted">
          <Route className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {!storeId
            ? "Pilih toko supaya urutan checklist mengikuti rak. Urutan dipelajari dari kebiasaanmu."
            : trips > 0
              ? `Urutan mengikuti rak ${store?.name}, dipelajari dari ${trips} kali belanja. Centang saat barang masuk keranjang.`
              : `Belum ada data rak ${store?.name}. Centang barang saat masuk keranjang; belanja berikutnya otomatis berurutan.`}
        </p>
      </section>

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
        <p className="card text-center text-sm text-muted">Stok masih cukup, tidak ada yang perlu dibeli periode ini. 🎉</p>
      )}

      <ul className="flex flex-col gap-2.5">
        {routed.map((it, idx) => (
          <Fragment key={it.id}>
            {idx === firstUnknown && hasKnownOpen && <Divider>Posisi belum diketahui di toko ini</Divider>}
            {idx === firstChecked && <Divider>Sudah di keranjang</Divider>}
            <Row item={it} onChange={(p) => patch(it.id, p)} />
          </Fragment>
        ))}
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

function Divider({ children }: { children: React.ReactNode }) {
  return (
    <li role="presentation" className="flex items-center gap-3 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
      <span className="h-px flex-1 bg-border" aria-hidden /> {children} <span className="h-px flex-1 bg-border" aria-hidden />
    </li>
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
    onChange({ checked, unit_price_actual, checked_at: checked ? new Date().toISOString() : null });
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
