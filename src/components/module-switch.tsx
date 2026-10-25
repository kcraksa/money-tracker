import Link from "next/link";
import { Car, Wallet } from "./icons";

/** Pindah antar modul (Keuangan / Servis) dengan dua tombol sejajar yang selalu terlihat. */
export function ModuleSwitch({ current }: { current: "keuangan" | "servis" }) {
  const items = [
    { key: "keuangan" as const, href: "/", label: "Keuangan", Icon: Wallet },
    { key: "servis" as const, href: "/servis", label: "Servis kendaraan", Icon: Car },
  ];
  return (
    <nav aria-label="Pindah antar bagian aplikasi" className="grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1">
      {items.map(({ key, href, label, Icon }) => {
        const on = key === current;
        return (
          <Link
            key={key} href={href} aria-current={on ? "page" : undefined} transitionTypes={on ? undefined : [key === "servis" ? "nav-forward" : "nav-back"]}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 text-sm font-semibold transition ${
              on ? "bg-surface text-fg shadow-card" : "text-muted hover:text-fg"
            }`}
          >
            <Icon className={`h-4 w-4 ${on ? "text-primary" : ""}`} aria-hidden /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
