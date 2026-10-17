import Link from "next/link";
import { ChevronLeft } from "./icons";

export function PageHeader({
  title, subtitle, back, actions,
}: { title: string; subtitle?: string; back?: string; actions?: React.ReactNode }) {
  return (
    <header className="flex items-center gap-3 pb-1">
      {back && (
        <Link href={back} transitionTypes={["nav-back"]} aria-label="Kembali"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-muted shadow-card">
          <ChevronLeft className="h-5 w-5" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[22px] font-bold leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
