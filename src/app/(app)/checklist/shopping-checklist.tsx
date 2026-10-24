"use client";

import { SubmitButton } from "@/components/submit-button";
import { Spinner } from "@/components/spinner";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addExtra, addStore, finishList, refreshList, removeListItem, setListStore, updateListItem } from "@/app/actions/shopping";
import { Check, Minus, Plus, RefreshCw, Route, Search, Store, WifiOff, X } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { Sheet } from "@/components/sheet";
import { ProgressBar } from "@/components/progress-bar";
import { qty as fmtQty, rupiah } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { sortByRoute, type OrderEntry } from "@/lib/route";
import { isPlanned, lineTotal, matchesQuery } from "@/lib/shopping";
import type { ListItem } from "@/lib/types";
import { useFlip } from "@/lib/use-flip";

type Store = { id: string; name: string };
type Props = {
  listId: string;
  periodLabel: string;
  initialItems: ListItem[];
  stores: Store[];
  storeId: string | null;
  order: Record<string, OrderEntry>;
  /** Stok rumah saat ini per barang (item_id), untuk info di baris yang stoknya masih cukup. */
  stocks: Record<string, number>;
};

export function ShoppingChecklist({ listId, periodLabel, initialItems, stores, storeId: initialStore, order, stocks }: Props) {
  const [items, setItems] = useState(initialItems);
  const [storeId, setStoreId] = useState(initialStore);
  const [showExtra, setShowExtra] = useState(false);
  const [showStore, setShowStore] = useState(false);
  const [showFinish, setShowFinish] = useState(false);
  const [query, setQuery] = useState("");
  const listRef = useFlip<HTMLUListElement>();

  // Perubahan dikirim ke server di latar belakang. Kalau sinyal hilang (sering terjadi di toko),
  // perubahan menunggu di antrean dan dikirim ulang otomatis begitu online.
  type Patch = { checked?: boolean; qty_bought?: number; unit_price_actual?: number };
  const queue = useRef(new Map<string, Patch>());
  const [unsynced, setUnsynced] = useState(0);
  const flushing = useRef(false);
  const [syncing, setSyncing] = useState(false);
  const flush = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    setSyncing(true);
    try {
      for (const [id, patch] of [...queue.current]) {
        try {
          const r = await updateListItem(id, patch);
          if (!r.ok) break;
        } catch {
          break; // masih offline
        }
        queue.current.delete(id);
        setUnsynced(queue.current.size);
      }
    } finally {
      flushing.current = false;
      setSyncing(false);
    }
  }, []);
  const save = useCallback((id: string, patch: Patch) => {
    queue.current.set(id, { ...queue.current.get(id), ...patch });
    setUnsynced(queue.current.size);
    void flush();
  }, [flush]);
  useEffect(() => {
    window.addEventListener("online", flush);
    const t = setInterval(() => { if (queue.current.size) void flush(); }, 8000);
    return () => { window.removeEventListener("online", flush); clearInterval(t); };
  }, [flush]);
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
  // Stok masih cukup & belum dicentang: ditampilkan terpisah di bawah sebagai info, tetap bisa dicentang.
  const routed = useMemo(() => {
    const original = new Map(items.map((i) => [i.id, i.checked]));
    const sortable = items.filter((i) => !isSpare(i, activeId)).map((i) => (i.id === activeId ? { ...i, checked: false } : i));
    return sortByRoute(sortable, storeId ? orderMap : new Map(), checkedAt).map((r) => ({
      ...r, checked: original.get(r.id) ?? r.checked, sunk: Boolean(original.get(r.id)) && r.id !== activeId,
    }));
  }, [items, orderMap, checkedAt, storeId, activeId]);
  const spare = items.filter((i) => isSpare(i, activeId));
  const trips = Math.max(0, ...[...orderMap.values()].map((o) => o.samples));
  const store = stores.find((s) => s.id === storeId);

  const planned = items.filter(isPlanned);
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
    setListStore(listId, id).catch(() => {}); // pilihan toko tidak kritis; abaikan bila offline
  }

  // Penanda bagian: rute toko / posisi belum diketahui / sudah di keranjang.
  const searching = query.trim() !== "";
  const shown = searching ? routed.filter((i) => matchesQuery(i.name, query)) : routed;
  const spareShown = searching ? spare.filter((i) => matchesQuery(i.name, query)) : spare;

  const firstUnknown = storeId ? shown.findIndex((i) => !i.sunk && !i.known) : -1;
  const firstChecked = shown.findIndex((i) => i.sunk);
  const hasKnownOpen = shown.some((i) => !i.sunk && i.known);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Belanja" subtitle={periodLabel}
        actions={
          unsynced > 0 ? (
            <span className="pill bg-warn-bg text-warn" role="status">
              {syncing ? <Spinner className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" aria-hidden />}
              {syncing ? `Menyimpan ${unsynced} perubahan…` : `${unsynced} menunggu sinyal`}
            </span>
          ) : undefined
        }
      />

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
            onClick={() => setShowStore(true)}
            className="flex min-h-10 items-center gap-1.5 rounded-full border border-dashed border-border px-4 text-sm font-semibold text-muted"
          >
            <Plus className="h-4 w-4" aria-hidden /> Toko
          </button>
        </div>
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

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
        <input
          type="search" value={query} onChange={(e) => setQuery(e.target.value)} enterKeyHint="search"
          className="input pl-10" placeholder="Cari barang di daftar belanja" aria-label="Cari barang"
        />
      </div>

      {planned.length === 0 && !searching && (
        <p className="card text-center text-sm text-muted">Stok masih cukup, tidak ada yang perlu dibeli periode ini. 🎉</p>
      )}
      {searching && shown.length === 0 && spareShown.length === 0 && (
        <p className="card text-center text-sm text-muted">Tidak ada barang “{query.trim()}” di daftar. Mau beli? Tambahkan di bawah.</p>
      )}

      <ul ref={listRef} className="flex flex-col gap-2.5">
        {shown.map((it, idx) => (
          <Fragment key={it.id}>
            {idx === firstUnknown && hasKnownOpen && <Divider>Posisi belum diketahui di toko ini</Divider>}
            {idx === firstChecked && <Divider>Sudah di keranjang</Divider>}
            <Row item={it} stock={it.item_id ? stocks[it.item_id] : undefined} onChange={(p) => patch(it.id, p)} save={(p) => save(it.id, p)} />
          </Fragment>
        ))}
        {spareShown.length > 0 && <Divider>Stok masih ada · tetap bisa dibeli</Divider>}
        {spareShown.map((it) => (
          <Row key={it.id} item={it} stock={it.item_id ? stocks[it.item_id] : undefined} onChange={(p) => patch(it.id, p)} save={(p) => save(it.id, p)} />
        ))}
      </ul>

      <button className="btn-soft border-dashed" onClick={() => setShowExtra(true)}>
        <Plus className="h-4 w-4" aria-hidden /> Beli barang di luar daftar
      </button>

      <div className="grid grid-cols-[auto_1fr] gap-2">
        <form action={refreshList}>
          <SubmitButton iconOnly className="btn-soft h-full px-4" aria-label="Segarkan rekomendasi dari stok" title="Segarkan dari stok">
            <RefreshCw className="h-[18px] w-[18px]" aria-hidden />
          </SubmitButton>
        </form>
        <button className="btn-primary" disabled={actual === 0} onClick={() => { haptic("select"); setShowFinish(true); }}>
          <Check className="h-[18px] w-[18px]" aria-hidden /> Selesai belanja
        </button>
      </div>

      <Sheet open={showStore} onClose={() => setShowStore(false)} title="Tambah toko">
        <form action={async (fd) => { await addStore(fd); setShowStore(false); }} className="flex flex-col gap-3 pb-2">
          <input type="hidden" name="list_id" value={listId} />
          <input
            name="name" required maxLength={40} autoFocus className="input" aria-label="Nama toko"
            placeholder="Nama toko, mis. Hari-Hari" enterKeyHint="done"
          />
          <p className="text-xs text-muted">Urutan rak toko ini akan dipelajari dari urutan kamu mencentang barang.</p>
          <SubmitButton pendingLabel="Menambah…" className="btn-primary">Tambah & pakai toko ini</SubmitButton>
        </form>
      </Sheet>

      <Sheet open={showExtra} onClose={() => setShowExtra(false)} title="Barang di luar daftar">
        <form action={async (fd) => { await addExtra(fd); setShowExtra(false); }} className="grid grid-cols-6 gap-2 pb-2">
          <input type="hidden" name="list_id" value={listId} />
          <input name="name" required autoFocus defaultValue={query.trim()} className="input col-span-6" placeholder="Nama barang" aria-label="Nama barang" enterKeyHint="next" />
          <input name="qty" inputMode="decimal" className="input col-span-2" placeholder="Jml" defaultValue="1" aria-label="Jumlah" />
          <input name="unit" className="input col-span-2" placeholder="pcs" aria-label="Satuan" />
          <input name="price" inputMode="numeric" className="input col-span-2" placeholder="Harga" aria-label="Harga per satuan" enterKeyHint="done" />
          <label className="col-span-6 flex items-center gap-2.5 text-sm text-muted">
            <input type="checkbox" name="save_item" defaultChecked className="h-5 w-5 accent-[var(--color-primary)]" />
            Simpan ke daftar barang (stok ikut tercatat)
          </label>
          <p className="col-span-6 text-xs text-muted">Kalau namanya sudah ada di daftar barang rumah, stok dan harga terakhirnya ikut diperbarui.</p>
          <SubmitButton pendingLabel="Menambah…" className="btn-primary col-span-6">Tambah ke keranjang</SubmitButton>
        </form>
      </Sheet>

      <Sheet open={showFinish} onClose={() => setShowFinish(false)} title="Selesai belanja?">
        <div className="flex flex-col gap-4 pb-2">
          <dl className="card flex flex-col gap-2.5 p-4 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Barang dicentang</dt><dd className="font-semibold tabular-nums">{items.filter((i) => i.checked).length} dari {items.length}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Estimasi</dt><dd className="font-semibold tabular-nums">{rupiah(estimate)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Terbelanja</dt><dd className={`font-bold tabular-nums ${over ? "text-danger" : "text-ok"}`}>{rupiah(actual)}</dd></div>
          </dl>
          {items.some((i) => !i.checked && isPlanned(i)) && (
            <p className="rounded-2xl bg-warn-bg p-3 text-sm text-warn">
              {items.filter((i) => !i.checked && isPlanned(i)).length} barang belum dicentang dan tidak akan masuk ke stok.
            </p>
          )}
          <p className="text-sm text-muted">Stok bertambah sesuai yang dibeli dan {rupiah(actual)} dicatat sebagai pengeluaran.</p>
          <form action={finishList} className="flex flex-col gap-2">
            <input type="hidden" name="list_id" value={listId} />
            <SubmitButton pendingLabel="Mencatat…" className="btn-primary min-h-14 text-base"><Check className="h-5 w-5" aria-hidden /> Ya, selesai &amp; catat</SubmitButton>
            <button type="button" className="btn-ghost" onClick={() => setShowFinish(false)}>Lanjut belanja</button>
          </form>
        </div>
      </Sheet>
    </div>
  );
}

/** Stok masih cukup (rekomendasi 0) dan belum dicentang. Barang yang baru dicentang tetap di tempatnya. */
const isSpare = (i: ListItem, activeId: string | null) =>
  !i.is_extra && i.qty_recommended === 0 && !i.checked && i.id !== activeId;

function Divider({ children }: { children: React.ReactNode }) {
  return (
    <li role="presentation" className="flex items-center gap-3 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
      <span className="h-px flex-1 bg-border" aria-hidden /> {children} <span className="h-px flex-1 bg-border" aria-hidden />
    </li>
  );
}

function Row({
  item, stock, onChange, save,
}: { item: ListItem; stock?: number; onChange: (p: Partial<ListItem>) => void; save: (p: { checked?: boolean; qty_bought?: number; unit_price_actual?: number }) => void }) {
  const [price, setPrice] = useState(item.unit_price_actual ? String(item.unit_price_actual) : "");
  const [seenPrice, setSeenPrice] = useState(item.unit_price_actual);
  if (seenPrice !== item.unit_price_actual) {
    setSeenPrice(item.unit_price_actual);
    setPrice(item.unit_price_actual ? String(item.unit_price_actual) : "");
  }

  function toggle() {
    const checked = !item.checked;
    haptic(checked ? "select" : "tap");
    // Saat pertama dicentang, isi harga dengan estimasi supaya tinggal koreksi sesuai rak.
    const unit_price_actual = checked && !item.unit_price_actual ? item.unit_price_est : item.unit_price_actual;
    onChange({ checked, unit_price_actual, checked_at: checked ? new Date().toISOString() : null });
    setPrice(unit_price_actual ? String(unit_price_actual) : "");
    save({ checked, unit_price_actual });
  }

  function step(delta: number) {
    const q = Math.max(0, Math.round((item.qty_bought + delta) * 100) / 100);
    onChange({ qty_bought: q });
    save({ qty_bought: q });
  }

  function commitPrice() {
    const v = Number(price || 0);
    onChange({ unit_price_actual: v });
    save({ unit_price_actual: v });
  }

  const total = lineTotal(item.qty_bought, item.unit_price_actual);

  return (
    <li data-flip={item.id} className={`card flex flex-col p-3.5 transition-colors duration-300 ${item.checked ? "border-primary/40 bg-primary-soft" : ""}`}>
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
              : item.qty_recommended === 0
                ? `Stok masih ${stock !== undefined ? `${fmtQty(stock)} ${item.unit}` : "ada"} · cukup bulan ini`
                : `Beli ${fmtQty(item.qty_recommended)} ${item.unit}${item.unit_price_est ? ` · est. ${rupiah(item.unit_price_est)}/${item.unit}` : ""}`}
          </div>
        </div>
        {item.is_extra && (
          <form action={removeListItem}>
            <input type="hidden" name="id" value={item.id} />
            <SubmitButton iconOnly aria-label={`Hapus ${item.name}`} className="flex h-9 w-9 items-center justify-center rounded-full text-muted">
              <X className="h-4 w-4" aria-hidden />
            </SubmitButton>
          </form>
        )}
      </div>

      {/* Selalu dirender supaya bisa membuka/menutup mulus; inert saat tertutup agar tak bisa difokus. */}
      <div
        inert={!item.checked} aria-hidden={!item.checked}
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          item.checked ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 pl-11 pt-3">
            <div className="flex items-center rounded-xl border border-border bg-surface" role="group" aria-label="Jumlah dibeli">
              <button className="flex h-10 w-10 items-center justify-center text-muted" aria-label="Kurangi" onClick={() => { haptic("tap"); step(-1); }}>
                <Minus className="h-4 w-4" aria-hidden />
              </button>
              <span key={item.qty_bought} className="animate-tick w-9 text-center font-bold tabular-nums">{fmtQty(item.qty_bought)}</span>
              <button className="flex h-10 w-10 items-center justify-center text-primary" aria-label="Tambah" onClick={() => { haptic("tap"); step(1); }}>
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
        </div>
      </div>
    </li>
  );
}
