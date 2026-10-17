"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Home, Plus, ShoppingCart, Trophy } from "./icons";

const TABS = [
  { href: "/", label: "Beranda", Icon: Home },
  { href: "/checklist", label: "Belanja", Icon: ShoppingCart },
  { href: "/catat", label: "Catat", Icon: Plus, primary: true },
  { href: "/evaluasi", label: "Evaluasi", Icon: BarChart3 },
  { href: "/pencapaian", label: "Prestasi", Icon: Trophy },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <nav
      aria-label="Menu utama"
      className="fixed inset-x-0 bottom-0 z-20 px-3"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
    >
      <ul className="mx-auto grid max-w-md grid-cols-5 items-center rounded-3xl border border-border bg-surface/90 px-1.5 py-1.5 shadow-float backdrop-blur-xl">
        {TABS.map(({ href, label, Icon, ...t }) => {
          const on = active(href);
          return (
            <li key={href} className="flex justify-center">
              {"primary" in t ? (
                <Link
                  href={href} aria-label="Catat pengeluaran" aria-current={on ? "page" : undefined}
                  className="-my-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-hero-from to-hero-to text-white shadow-float ring-4 ring-bg transition active:scale-95"
                >
                  <Icon className="h-7 w-7" strokeWidth={2.5} />
                </Link>
              ) : (
                <Link
                  href={href} aria-current={on ? "page" : undefined}
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
