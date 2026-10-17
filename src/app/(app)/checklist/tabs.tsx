"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Package, ShoppingCart } from "@/components/icons";
import { Segmented } from "@/components/segmented";

type Tab = "belanja" | "stok";

export function ChecklistTabs() {
  const path = usePathname();
  const real: Tab = path.startsWith("/checklist/stok") || path.startsWith("/checklist/cek") ? "stok" : "belanja";
  // Penanda langsung bergeser saat disentuh; berlaku sampai pathname berubah.
  const [tap, setTap] = useState<{ tab: Tab; from: string } | null>(null);
  const value = tap && tap.from === path ? tap.tab : real;

  return (
    <Segmented<Tab>
      label="Belanja atau stok" value={value} onSelect={(tab) => setTap({ tab, from: path })}
      items={[
        { key: "belanja", href: "/checklist", label: <><ShoppingCart className="h-4 w-4" aria-hidden /> Belanja</> },
        { key: "stok", href: "/checklist/stok", label: <><Package className="h-4 w-4" aria-hidden /> Stok rumah</> },
      ]}
    />
  );
}
