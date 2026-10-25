import Link from "next/link";
import { AlertTriangle, ChevronRight, Pencil } from "@/components/icons";
import { CategoryIcon } from "@/components/category-icon";
import { PageHeader } from "@/components/page-header";
import { ProgressBar } from "@/components/progress-bar";
import type { Forecast } from "@/lib/forecast";
import { rupiah } from "@/lib/format";
import type { Category } from "@/lib/types";

const TONE = { ok: "ok", warn: "warn", over: "danger", nobudget: "primary" } as const;

export function AnggaranView({ periodLabel, rows }: { periodLabel: string; rows: { c: Category; f: Forecast }[] }) {
  const alerts = rows.filter((r) => r.f.status === "warn" || r.f.status === "over");
  const noBudgets = rows.every((r) => r.f.budget === 0);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Anggaran" subtitle={periodLabel} back="/"
        actions={
          <Link href="/rencana" transitionTypes={["nav-forward"]}
            className="flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-sm font-semibold shadow-card">
            <Pencil className="h-4 w-4 text-primary" aria-hidden /> Atur
          </Link>
        }
      />

      {alerts.length > 0 && (
        <section aria-labelledby="awas-h" className="flex flex-col gap-2">
          <h2 id="awas-h" className="sr-only">Peringatan anggaran</h2>
          {alerts.map(({ c, f }) => {
            const over = f.status === "over";
            return (
              <div key={c.id} className={`flex items-start gap-3 rounded-2xl p-3.5 text-sm ${over ? "bg-danger-bg text-danger" : "bg-warn-bg text-warn"}`}>
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                <p>
                  <b>{c.name}</b>{" "}
                  {over
                    ? <>sudah lebih {rupiah(f.spent - f.budget)} dari anggaran.</>
                    : <>perlu dihemat. Kalau terus begini, habis {rupiah(f.projected)} sampai akhir periode, padahal anggarannya {rupiah(f.budget)}.</>}
                </p>
              </div>
            );
          })}
        </section>
      )}

      <section aria-labelledby="sisa-h">
        <h2 id="sisa-h" className="section-title"><span>Sisa uang tiap kategori</span></h2>
        <p className="section-hint">Jumlahnya berubah-ubah, mis. makan dan bensin. Batasnya bisa kamu ubah lewat tombol Atur.</p>
        {noBudgets && (
          <Link href="/rencana" transitionTypes={["nav-forward"]} className="card mb-3 flex items-center justify-between gap-3 text-sm">
            <span>Anggaran belum diatur. Atur dulu supaya sisa uang tiap kategori terlihat.</span>
            <span className="flex shrink-0 items-center font-semibold text-primary">Atur <ChevronRight className="h-4 w-4" aria-hidden /></span>
          </Link>
        )}
        <ul className="card divide-y divide-border p-0">
          {rows.map(({ c, f }) => (
            <li key={c.id} className="flex flex-col gap-2.5 px-4 py-3.5">
              <div className="flex items-center gap-3">
                <CategoryIcon icon={c.icon} />
                <div className="min-w-0 flex-1 text-base font-semibold">{c.name}</div>
                {f.budget > 0 && (
                  <div className="text-right leading-tight">
                    <div className={`text-base font-bold tabular-nums ${f.remaining < 0 ? "text-danger" : ""}`}>{rupiah(Math.abs(f.remaining))}</div>
                    <div className="text-xs text-muted">{f.remaining < 0 ? "kelebihan" : "sisa"}</div>
                  </div>
                )}
              </div>
              {f.budget > 0 && (
                <ProgressBar size="sm" label={`Terpakai ${c.name}`} pct={(f.spent / f.budget) * 100} tone={TONE[f.status]} />
              )}
              <div className="flex items-center justify-between gap-3 text-sm text-muted">
                <span className="tabular-nums">
                  {f.budget > 0 ? `Terpakai ${rupiah(f.spent)} dari ${rupiah(f.budget)}` : `Terpakai ${rupiah(f.spent)}`}
                </span>
                {f.status === "over" && <span className="pill shrink-0 bg-danger-bg text-danger">Lewat anggaran</span>}
                {f.status === "warn" && <span className="pill shrink-0 bg-warn-bg text-warn">Hati-hati</span>}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
