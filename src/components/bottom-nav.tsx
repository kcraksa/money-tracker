"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { haptic } from "@/lib/haptics";
import { BarChart3, Home, Plus, ShoppingCart, Trophy } from "./icons";

export type NavTab = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  primary?: boolean; // tombol tengah yang menonjol
  match?: (path: string) => boolean; // aturan "aktif" khusus (bawaan: awalan path)
};

const MONEY_TABS: NavTab[] = [
  { href: "/", label: "Beranda", Icon: Home },
  { href: "/checklist", label: "Belanja", Icon: ShoppingCart },
  { href: "/catat", label: "Catat", Icon: Plus, primary: true },
  { href: "/evaluasi", label: "Evaluasi", Icon: BarChart3 },
  { href: "/pencapaian", label: "Prestasi", Icon: Trophy },
];

export function BottomNav({ tabs = MONEY_TABS, fabLabel = "Catat pengeluaran" }: { tabs?: NavTab[]; fabLabel?: string }) {
  const pathname = usePathname();
  // Tab yang disentuh langsung menyala tanpa menunggu halaman tujuan selesai dimuat.
  // Dipakai hanya selama masih di halaman asal; begitu pathname berubah, nilai sebenarnya yang berlaku.
  const [tap, setTap] = useState<{ href: string; from: string } | null>(null);
  const current = tap && tap.from === pathname ? tap.href : pathname;
  const active = (t: NavTab) => (t.match ? t.match(current) : t.href === "/" ? current === "/" : current.startsWith(t.href));

  return (
    <nav
      aria-label="Menu utama"
      className="fixed inset-x-0 bottom-0 z-20 px-3"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
    >
      <ul style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }} className="mx-auto grid max-w-md items-center rounded-3xl border border-border bg-surface/90 px-1.5 py-1.5 shadow-float backdrop-blur-xl">
        {tabs.map((t) => {
          const { href, label, Icon } = t;
          const on = active(t);
          return (
            <li key={href} className="flex justify-center">
              {t.primary ? (
                <Link
                  href={href} aria-label={fabLabel} aria-current={on ? "page" : undefined}
                  onClick={() => { haptic("tap"); setTap({ href, from: pathname }); }}
                  className="-my-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-hero-from to-hero-to text-white shadow-float ring-4 ring-bg transition active:scale-95"
                >
                  <Icon className="h-7 w-7" strokeWidth={2.5} />
                </Link>
              ) : (
                <Link
                  href={href} aria-current={on ? "page" : undefined}
                  onClick={() => { haptic("tap"); setTap({ href, from: pathname }); }}
                  className={`flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[11px] font-medium transition ${
                    on ? "text-primary" : "text-muted hover:text-fg"
                  }`}
                >
                  <span className={`flex h-7 w-12 items-center justify-center rounded-full transition ${on ? "bg-primary-soft" : ""}`}>
                    <Icon className="h-[22px] w-[22px]" strokeWidth={on ? 2.4 : 2} aria-hidden />
                  </span>
                  <span>{label}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
