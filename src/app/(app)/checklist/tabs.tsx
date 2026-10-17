"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, ShoppingCart } from "@/components/icons";

export function ChecklistTabs() {
  const onStock = usePathname().startsWith("/checklist/stok");
  const tab = (active: boolean) =>
    `flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${
      active ? "bg-surface text-fg shadow-card" : "text-muted"
    }`;
  return (
    <div className="flex gap-1 rounded-2xl bg-surface-2 p-1" role="tablist">
      <Link role="tab" aria-selected={!onStock} href="/checklist" className={tab(!onStock)}>
        <ShoppingCart className="h-4 w-4" aria-hidden /> Belanja
      </Link>
      <Link role="tab" aria-selected={onStock} href="/checklist/stok" className={tab(onStock)}>
        <Package className="h-4 w-4" aria-hidden /> Stok rumah
      </Link>
    </div>
  );
}
