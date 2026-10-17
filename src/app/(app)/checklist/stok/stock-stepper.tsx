"use client";

import { useState } from "react";
import { adjustStock } from "@/app/actions/stock";
import { Minus, Plus } from "@/components/icons";
import { qty } from "@/lib/format";

export function StockStepper({ itemId, initial, unit }: { itemId: string; initial: number; unit: string }) {
  const [stock, setStock] = useState(initial);
  // Pasangan mengubah stok: ikuti nilai server yang baru.
  const [seen, setSeen] = useState(initial);
  if (seen !== initial) {
    setSeen(initial);
    setStock(initial);
  }

  async function step(delta: number) {
    navigator.vibrate?.(8);
    const prev = stock;
    setStock(Math.max(0, Math.round((stock + delta) * 100) / 100)); // langsung terasa, tanpa menunggu server
    const r = await adjustStock(itemId, delta);
    if (r.stock !== undefined) setStock(r.stock);
    else setStock(prev);
  }

  return (
    <div className="flex shrink-0 items-center rounded-2xl bg-surface-2 p-1" role="group" aria-label="Stok">
      <button onClick={() => step(-1)} aria-label="Kurangi stok" disabled={stock <= 0}
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface text-fg shadow-card transition active:scale-95 disabled:opacity-40">
        <Minus className="h-5 w-5" aria-hidden />
      </button>
      <div className="w-14 text-center leading-tight">
        <div className="text-lg font-bold tabular-nums">{qty(stock)}</div>
        <div className="text-[10px] text-muted">{unit}</div>
      </div>
      <button onClick={() => step(1)} aria-label="Tambah stok"
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-fg shadow-card transition active:scale-95">
        <Plus className="h-5 w-5" aria-hidden />
      </button>
    </div>
  );
}
