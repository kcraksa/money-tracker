import Link from "next/link";
import { BarChart3, Check, ChevronLeft, ChevronRight, ShoppingCart, Sparkles } from "@/components/icons";
import { EmptyState } from "@/components/empty-state";
import { qty, rupiah } from "@/lib/format";

export type EvalRow = {
  id: string; name: string; unit: string; qtyRec: number; qtyBought: number; priceActual: number;
  skipped: boolean; diff: number;
};

export type EvalProps = {
  monthLabel: string;
  prevHref: string | null;
  nextHref: string | null;
  state: "none" | "open" | "done";
  saving?: number;
  completedBy?: string;
  xpGained?: number;
  withinRecommendation?: boolean;
  estimateTotal?: number;
  recommendedActual?: number;
  extrasTotal?: number;
  rows?: EvalRow[];
  extras?: { id: string; name: string; unit: string; qty: number; total: number }[];
  notBoughtCount?: number;
};

export function EvaluasiView(p: EvalProps) {
  const nav = (
    <nav className="card flex items-center justify-between p-2" aria-label="Pilih periode">
      {p.prevHref ? (
        <Link href={p.prevHref} aria-label="Periode sebelumnya" className="flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-surface-2">
          <ChevronLeft className="h-5 w-5" />
        </Link>
      ) : <span className="h-10 w-10" />}
      <h1 className="truncate px-2 text-center text-base font-bold tracking-tight">Evaluasi {p.monthLabel}</h1>
      {p.nextHref ? (
        <Link href={p.nextHref} aria-label="Periode berikutnya" className="flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-surface-2">
          <ChevronRight className="h-5 w-5" />
        </Link>
      ) : <span className="h-10 w-10" />}
    </nav>
  );

  if (p.state === "none") {
    return (
      <div className="flex flex-col gap-4">
        {nav}
        <EmptyState icon={<BarChart3 className="h-8 w-8" />} title="Belum ada belanja">
          <p className="max-w-xs text-sm text-muted">Belum ada checklist belanja untuk periode ini.</p>
          <Link href="/checklist" className="btn-primary mt-1">Ke checklist</Link>
        </EmptyState>
      </div>
    );
  }

  const open = p.state === "open";
  return (
    <div className="flex flex-col gap-4">
      {nav}

      {open && (
        <div role="status" className="flex items-center justify-between gap-3 rounded-2xl bg-warn-bg p-3.5 text-sm text-warn">
          <span>Belanja belum diselesaikan. Ini gambaran sementara.</span>
          <Link href="/checklist" className="shrink-0 font-bold underline">Lanjut</Link>
        </div>
      )}

      <section
        aria-label="Ringkasan hemat"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-hero-from to-hero-to p-5 text-white shadow-float"
      >
        <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/10" aria-hidden />
        <div className="relative text-sm font-medium opacity-80">Uang yang dihemat</div>
        <div className="relative mt-1 text-[40px] font-extrabold leading-none tracking-tight tabular-nums">{rupiah(p.saving ?? 0)}</div>
        <div className="relative mt-3 flex flex-wrap gap-2">
          {!open && p.completedBy && <span className="pill bg-white/15 text-white">oleh {p.completedBy}</span>}
          {!!p.xpGained && <span className="pill bg-white/15 text-white"><Sparkles className="h-3.5 w-3.5 text-amber-300" aria-hidden /> +{p.xpGained} XP</span>}
          {p.withinRecommendation && <span className="pill bg-white text-hero-to"><ShoppingCart className="h-3.5 w-3.5" aria-hidden /> Sesuai rekomendasi</span>}
        </div>
      </section>

      <section className="card grid grid-cols-3 divide-x divide-border p-0 text-center" aria-label="Perbandingan total">
        <Stat label="Rekomendasi" value={rupiah(p.estimateTotal ?? 0)} />
        <Stat label="Dibeli" value={rupiah(p.recommendedActual ?? 0)} />
        <Stat label="Di luar daftar" value={rupiah(p.extrasTotal ?? 0)} warn={(p.extrasTotal ?? 0) > 0} />
      </section>

      <section aria-label="Rekomendasi vs dibeli">
        <h2 className="section-title">Rekomendasi vs dibeli</h2>
        <ul className="card divide-y divide-border p-0">
          {(p.rows ?? []).map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate font-semibold">{r.name}</div>
                <div className="text-xs text-muted">
                  Rekomendasi {qty(r.qtyRec)} · {r.skipped ? "belum dibeli" : `dibeli ${qty(r.qtyBought)} ${r.unit} @ ${rupiah(r.priceActual)}`}
                </div>
              </div>
              {r.skipped ? (
                <span className="pill shrink-0 bg-surface-2 text-muted">Belum</span>
              ) : r.diff >= 0 ? (
                <span className="pill shrink-0 bg-ok-bg text-ok">Hemat {rupiah(r.diff)}</span>
              ) : (
                <span className="pill shrink-0 bg-danger-bg text-danger">Lebih {rupiah(-r.diff)}</span>
              )}
            </li>
          ))}
          {(p.rows ?? []).length === 0 && <li className="px-4 py-3 text-sm text-muted">Tidak ada barang yang direkomendasikan.</li>}
        </ul>
      </section>

      {(p.extras ?? []).length > 0 && (
        <section aria-label="Di luar daftar">
          <h2 className="section-title">Barang di luar daftar</h2>
          <ul className="card divide-y divide-border p-0">
            {p.extras!.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0 truncate font-medium">{i.name} <span className="text-xs font-normal text-muted">{qty(i.qty)} {i.unit}</span></span>
                <span className="font-semibold tabular-nums">{rupiah(i.total)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!open && (p.notBoughtCount ?? 0) > 0 && (
        <p className="flex items-start gap-2 rounded-2xl bg-surface-2 p-3.5 text-sm text-muted">
          <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {p.notBoughtCount} barang belum terbeli sesuai rekomendasi, jadi tidak dihitung sebagai hemat dan tidak dapat bonus.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="px-2 py-3.5">
      <div className="text-[11px] font-medium text-muted">{label}</div>
      <div className={`mt-0.5 text-sm font-bold tabular-nums ${warn ? "text-warn" : ""}`}>{value}</div>
    </div>
  );
}
