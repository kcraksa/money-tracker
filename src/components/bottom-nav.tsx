"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Beranda", icon: "🏠" },
  { href: "/checklist", label: "Checklist", icon: "🛒" },
  { href: "/catat", label: "Catat", icon: "＋", primary: true },
  { href: "/evaluasi", label: "Evaluasi", icon: "📊" },
  { href: "/pencapaian", label: "Pencapaian", icon: "🏆" },
];

export function BottomNav() {
  const pathname = usePathname();
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <nav
      aria-label="Menu utama"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-md grid-cols-5 items-end px-2">
        {TABS.map((t) => (
          <li key={t.href} className="flex justify-center">
            <Link
              href={t.href}
              aria-current={active(t.href) ? "page" : undefined}
              className={
                t.primary
                  ? "-mt-5 flex h-14 w-14 flex-col items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-fg shadow-lg"
                  : `flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[11px] ${
                      active(t.href) ? "font-semibold text-primary" : "text-muted"
                    }`
              }
            >
              <span className={t.primary ? "" : "text-xl leading-none"} aria-hidden>{t.icon}</span>
              <span className={t.primary ? "sr-only" : ""}>{t.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
