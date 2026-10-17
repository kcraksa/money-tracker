"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ChecklistTabs() {
  const onStock = usePathname().startsWith("/checklist/stok");
  const tab = (active: boolean) =>
    `flex-1 rounded-lg py-2.5 text-center text-sm font-semibold ${active ? "bg-surface shadow-sm" : "text-muted"}`;
  return (
    <div className="flex gap-1 rounded-xl bg-surface-2 p-1" role="tablist">
      <Link role="tab" aria-selected={!onStock} href="/checklist" className={tab(!onStock)}>🛒 Belanja</Link>
      <Link role="tab" aria-selected={onStock} href="/checklist/stok" className={tab(onStock)}>📦 Stok rumah</Link>
    </div>
  );
}
