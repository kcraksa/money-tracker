"use client";

import { useState, useTransition } from "react";
import { applyStockCheck } from "@/app/actions/stock";
import { ClipboardCheck, Minus, Plus } from "@/components/icons";
import { qty } from "@/lib/format";
import { haptic } from "@/lib/haptics";

type Item = { id: string; name: string; unit: string; stock: number; need: number; checked: string };

const parse = (v: string, fallback: number) => {
  if (v.trim() === "") return fallback;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? Math.max(0, Math.round(n * 100) / 100) : fallback;
};

export function StockCheck({ items }: { items: Item[] }) {
  const [counts, setCounts] = useState<Record<string, string>>(
    Object.fromEntries(items.map((i) => [i.id, String(i.stock)])),
  );
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  const value = (i: Item) => parse(counts[i.id] ?? "", i.stock);
  const changed = items.filter((i) => value(i) !== i.stock);

  function set(i: Item, v: number) {
    haptic("tap");
    setCounts((c) => ({ ...c, [i.id]: String(Math.max(0, Math.round(v * 100) / 100)) }));
  }

  function submit() {
    setError("");
    start(async () => {
      const r = await applyStockCheck(items.map((i) => ({ itemId: i.id, count: value(i) })));
      if (r?.error) setError(r.error);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="rounded-2xl bg-primary-soft p-3.5 text-sm text-fg">
        Angka di bawah adalah stok menurut aplikasi. Ubah yang tidak sesuai dengan yang ada di rumah, lalu tekan
        <b> Selesai cek</b>. Checklist belanja otomatis diperbarui.
      </p>

      <ul className="flex flex-col gap-2.5">
        {items.map((i) => {
          const v = value(i);
          const diff = Math.round((v - i.stock) * 100) / 100;
          return (
            <li key={i.id} className={`card flex flex-col gap-3 p-3.5 transition ${diff !== 0 ? "border-primary/40 bg-primary-soft" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-semibold">{i.name}</div>
                  <div className="text-xs text-muted">
                    Di aplikasi {qty(i.stock)} {i.unit} · butuh {qty(i.need)}/periode · {i.checked}
                  </div>
                </div>
                {diff !== 0 && (
                  <span className={`pill shrink-0 ${diff < 0 ? "bg-warn-bg text-warn" : "bg-ok-bg text-ok"}`}>
                    {diff > 0 ? "+" : "−"}{qty(Math.abs(diff))}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex min-w-0 flex-1 items-center rounded-2xl bg-surface-2 p-1">
                  <button
                    onClick={() => set(i, v - 1)} disabled={v <= 0} aria-label={`Kurangi ${i.name}`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface shadow-card transition active:scale-95 disabled:opacity-40"
                  >
                    <Minus className="h-5 w-5" aria-hidden />
                  </button>
                  <input
                    inputMode="decimal" aria-label={`Stok ${i.name} di rumah`}
                    className="w-0 min-w-0 flex-1 bg-transparent text-center text-xl font-bold tabular-nums outline-none"
                    value={counts[i.id] ?? ""}
                    onChange={(e) => setCounts((c) => ({ ...c, [i.id]: e.target.value.replace(/[^0-9.,]/g, "") }))}
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <button
                    onClick={() => set(i, v + 1)} aria-label={`Tambah ${i.name}`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-fg shadow-card transition active:scale-95"
                  >
                    <Plus className="h-5 w-5" aria-hidden />
                  </button>
                </div>
                <button
                  onClick={() => set(i, 0)} disabled={v === 0}
                  className="btn-soft min-h-[3.25rem] shrink-0 px-4 text-sm disabled:opacity-40"
                >
                  Habis
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {error && <p role="alert" className="rounded-2xl bg-danger-bg p-3.5 text-sm text-danger">{error}</p>}

      <div className="sticky bottom-28 z-10 flex items-center gap-3 rounded-2xl border border-border bg-surface/95 p-3 shadow-float backdrop-blur">
        <div className="min-w-0 flex-1 pl-1 text-sm">
          <div className="font-semibold">{changed.length === 0 ? "Semua sesuai" : `${changed.length} barang berubah`}</div>
          <div className="text-xs text-muted">{items.length} barang dicek</div>
        </div>
        <button className="btn-primary shrink-0" onClick={submit} disabled={pending}>
          <ClipboardCheck className="h-[18px] w-[18px]" aria-hidden /> {pending ? "Menyimpan…" : "Selesai cek"}
        </button>
      </div>
    </div>
  );
}
