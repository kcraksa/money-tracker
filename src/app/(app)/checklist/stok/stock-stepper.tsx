"use client";

import { useState } from "react";
import { adjustStock } from "@/app/actions/stock";
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
    <div className="flex shrink-0 items-center gap-1" role="group" aria-label="Stok">
      <button onClick={() => step(-1)} aria-label="Kurangi stok" disabled={stock <= 0}
        className="h-12 w-12 rounded-xl bg-surface-2 text-2xl font-bold active:scale-95 disabled:opacity-40">−</button>
      <div className="w-14 text-center leading-tight">
        <div className="text-xl font-bold tabular-nums">{qty(stock)}</div>
        <div className="text-[10px] text-muted">{unit}</div>
      </div>
      <button onClick={() => step(1)} aria-label="Tambah stok"
        className="h-12 w-12 rounded-xl bg-primary text-2xl font-bold text-primary-fg active:scale-95">+</button>
    </div>
  );
}
