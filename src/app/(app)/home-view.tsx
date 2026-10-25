import Link from "next/link";
import { AlertTriangle, Check, ChevronRight, Flame, KeyIcon, LayoutGrid, Plus, Settings, Sparkles, Wallet } from "@/components/icons";
import { CategoryIcon } from "@/components/category-icon";
import { PageHeader } from "@/components/page-header";
import { ProgressBar } from "@/components/progress-bar";
import { Ring } from "@/components/ring";
import type { Forecast } from "@/lib/forecast";
import { rupiah } from "@/lib/format";
import { levelInfo } from "@/lib/gamification";
import type { Category } from "@/lib/types";
import { BillRow } from "./bill-row";

export type HomeProps = {
  greeting: string;
  name: string;
  periodLabel: string;
  day: number;
  totalDays: number;
  hasPeriod: boolean;
  overdue: boolean;
  income: { total: number; allocated: number } | null;
  totalXp: number;
  streak: number;
  loggedToday: boolean;
  totalSpent: number;
  totalBudget: number;
  rows: { c: Category; f: Forecast }[];
  bills: {
    categoryId: string; name: string; icon: string; amount: number; dueLabel: string | null;
    paid: { onTime: boolean; paidOn: string } | null;
  }[];
  quests: { code: string; title: string; icon: string; done: number; target: number; complete: boolean }[];
};

const TONE = { ok: "ok", warn: "warn", over: "danger", nobudget: "primary" } as const;

export function HomeView(p: HomeProps) {
  const lvl = levelInfo(p.totalXp);
  const alerts = p.rows.filter((r) => r.f.status === "warn" || r.f.status === "over");
  const noBudgets = p.rows.every((r) => r.f.budget === 0);
  const monthPct = p.totalBudget > 0 ? (p.totalSpent / p.totalBudget) * 100 : 0;
  const left = p.totalBudget - p.totalSpent;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`Halo, ${p.name} 👋`}
        subtitle={p.greeting}
        actions={
          <>
            <Link href="/menu" transitionTypes={["nav-back"]}
              className="flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-sm font-semibold shadow-card">
              <LayoutGrid className="h-4 w-4 text-primary" aria-hidden /> Menu
            </Link>
            <Link href="/pengaturan" transitionTypes={["nav-forward"]} aria-label="Pengaturan"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-muted shadow-card">
              <Settings className="h-5 w-5" aria-hidden />
            </Link>
          </>
        }
      />

      {/* Uang periode ini: hal pertama yang dicari */}
      <section aria-labelledby="uang-h" className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-hero-from to-hero-to p-5 text-white shadow-float">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" aria-hidden />
        <div className="relative flex items-baseline justify-between gap-2">
          <h2 id="uang-h" className="text-sm font-semibold">Pengeluaran {p.periodLabel}</h2>
          <span className="shrink-0 text-sm opacity-90">hari ke-{p.day} dari {p.totalDays}</span>
        </div>
        <div className="relative mt-2 text-[34px] font-extrabold leading-none tracking-tight tabular-nums">{rupiah(p.totalSpent)}</div>
        {p.totalBudget > 0 ? (
          <>
            <p className="relative mt-2 text-[15px]">
              {left >= 0
                ? <>Sisa anggaran <b className="tabular-nums">{rupiah(left)}</b> dari {rupiah(p.totalBudget)}</>
                : <>Lebih <b className="tabular-nums">{rupiah(-left)}</b> dari anggaran {rupiah(p.totalBudget)}</>}
            </p>
            <div
              role="progressbar" aria-label="Anggaran terpakai" aria-valuenow={Math.round(Math.min(100, monthPct))} aria-valuemin={0} aria-valuemax={100}
              className="relative mt-3 h-2.5 overflow-hidden rounded-full bg-white/20"
            >
              <div className={`h-full rounded-full ${monthPct > 100 ? "bg-red-300" : "bg-white"}`} style={{ width: `${Math.min(100, monthPct)}%` }} />
            </div>
          </>
        ) : (
          <p className="relative mt-2 text-[15px]">terpakai periode ini</p>
        )}
        <Link href="/catat"
          className="relative mt-4 flex min-h-13 items-center justify-center gap-2 rounded-xl bg-white px-4 text-base font-bold text-hero-to transition active:scale-[0.98]">
          <Plus className="h-5 w-5" aria-hidden /> Catat pengeluaran
        </Link>
        <p className="relative mt-2 flex items-center justify-center gap-1.5 text-sm">
          {p.loggedToday
            ? <><Check className="h-4 w-4" aria-hidden /> Hari ini sudah dicatat</>
            : "Hari ini belum ada catatan"}
        </p>
      </section>

      {p.overdue && (
        <Link href="/rencana" transitionTypes={["nav-forward"]} className="flex items-center gap-3 rounded-2xl bg-warn-bg p-3.5 text-sm text-warn">
          <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />
          <span className="flex-1"><b>Sudah lebih dari sebulan sejak gajian terakhir.</b> Ketuk di sini untuk mencatat gajian baru.</span>
          <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
        </Link>
      )}

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
        <h2 id="sisa-h" className="section-title">Sisa uang tiap pos</h2>
        {noBudgets && (
          <Link href="/rencana" transitionTypes={["nav-forward"]} className="card mb-2 flex items-center justify-between gap-3 text-sm">
            <span>Anggaran belum diatur. Atur dulu supaya sisa uang tiap pos terlihat.</span>
            <span className="shrink-0 font-semibold text-primary">Atur</span>
          </Link>
        )}
        <ul className="card divide-y divide-border p-0">
          {p.rows.map(({ c, f }) => (
            <li key={c.id} className="flex flex-col gap-2.5 px-4 py-3.5">
              <div className="flex items-center gap-3">
                <CategoryIcon icon={c.icon} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2">
                    <span className="truncate font-semibold">{c.name}</span>
                    {f.status === "over" && <span className="pill bg-danger-bg text-danger">Lewat anggaran</span>}
                    {f.status === "warn" && <span className="pill bg-warn-bg text-warn">Hati-hati</span>}
                  </div>
                  <div className="text-xs text-muted tabular-nums">
                    {f.budget > 0 ? `terpakai ${rupiah(f.spent)} dari ${rupiah(f.budget)}` : `terpakai ${rupiah(f.spent)}`}
                  </div>
                </div>
                {f.budget > 0 && (
                  <div className="text-right">
                    <div className={`text-[15px] font-bold tabular-nums ${f.remaining < 0 ? "text-danger" : ""}`}>
                      {rupiah(Math.abs(f.remaining))}
                    </div>
                    <div className="text-xs text-muted">{f.remaining < 0 ? "kelebihan" : "sisa"}</div>
                  </div>
                )}
              </div>
              {f.budget > 0 && (
                <ProgressBar size="sm" label={`Terpakai ${c.name}`} pct={(f.spent / f.budget) * 100} tone={TONE[f.status]} />
              )}
            </li>
          ))}
        </ul>
      </section>

      {p.income ? (
        <section aria-labelledby="masuk-h">
          <h2 id="masuk-h" className="section-title">
            <span>Uang masuk</span>
            <Link href="/rencana" transitionTypes={["nav-forward"]} className="flex min-h-11 items-center gap-0.5 text-sm font-semibold text-primary">
              Atur <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          </h2>
          <dl className="card grid grid-cols-3 divide-x divide-border p-0 text-center">
            <MiniStat label="Pemasukan" value={rupiah(p.income.total)} />
            <MiniStat label="Sudah dibagi" value={rupiah(p.income.allocated)} />
            <MiniStat
              label={p.income.total - p.income.allocated < 0 ? "Kelebihan" : "Belum dibagi"}
              value={rupiah(Math.abs(p.income.total - p.income.allocated))}
              tone={p.income.total - p.income.allocated < 0 ? "danger" : p.income.total - p.income.allocated > 0 ? "warn" : "ok"}
            />
          </dl>
        </section>
      ) : (
        <Link href="/rencana" transitionTypes={["nav-forward"]} className="card flex items-center gap-3 p-4 text-sm">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary"><Wallet className="h-5 w-5" aria-hidden /></span>
          <span className="flex-1">
            <b className="block text-[15px]">{p.hasPeriod ? "Catat pemasukan periode ini" : "Catat gajian"}</b>
            <span className="text-muted">Lalu bagi uangnya ke tiap pos anggaran.</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden />
        </Link>
      )}

      {p.bills.length > 0 && (
        <section aria-labelledby="tagihan-h">
          <h2 id="tagihan-h" className="section-title">Tagihan bulanan</h2>
          <ul className="card divide-y divide-border p-0">
            {p.bills.map((b) => <BillRow key={b.categoryId} {...b} />)}
          </ul>
        </section>
      )}

      {/* Poin keluarga: penyemangat, bukan informasi utama */}
      <section aria-labelledby="poin-h">
        <h2 id="poin-h" className="section-title">
          <span>Poin keluarga</span>
          <Link href="/pencapaian" transitionTypes={["nav-forward"]} className="flex min-h-11 items-center gap-0.5 text-sm font-semibold text-primary">
            Lihat semua <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </h2>
        <div className="card flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Ring pct={lvl.pct} size={64} tone="primary">
              <span className="text-xl font-extrabold leading-none text-primary">{lvl.level}</span>
            </Ring>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">Level {lvl.level} · {p.totalXp.toLocaleString("id-ID")} poin</div>
              <div className="text-sm text-muted">{lvl.span - lvl.into} poin lagi ke level {lvl.level + 1}</div>
              {p.streak > 0 && (
                <div className="mt-1 flex items-center gap-1 text-sm font-medium text-warn">
                  <Flame className="h-4 w-4" aria-hidden /> Mencatat {p.streak} hari berturut-turut
                </div>
              )}
            </div>
          </div>
          {p.quests.length > 0 && (
            <div className="border-t border-border pt-3">
              <h3 className="mb-2 flex items-center justify-between text-sm font-semibold">
                <span>Tantangan minggu ini</span>
                <span className="flex items-center gap-1 text-warn"><Sparkles className="h-4 w-4" aria-hidden /> +50 poin tiap selesai</span>
              </h3>
              <ul className="flex flex-col gap-3">
                {p.quests.map((q) => (
                  <li key={q.code} className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${q.complete ? "bg-ok-bg text-ok" : "bg-primary-soft text-primary"}`}>
                      {q.complete ? <Check className="h-5 w-5" aria-hidden /> : <KeyIcon name={q.icon} className="h-5 w-5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-semibold">{q.title}</span>
                        <span className={`shrink-0 text-xs font-semibold tabular-nums ${q.complete ? "text-ok" : "text-muted"}`}>
                          {q.complete ? "Selesai" : `${q.done} dari ${q.target}`}
                        </span>
                      </div>
                      <div className="mt-1.5">
                        <ProgressBar size="sm" pct={(q.done / q.target) * 100} tone={q.complete ? "ok" : "primary"} label={q.title} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" | "danger" }) {
  const color = tone === "danger" ? "text-danger" : tone === "warn" ? "text-warn" : tone === "ok" ? "text-ok" : "";
  return (
    <div className="flex flex-col-reverse px-1 py-3">
      <dd className={`text-sm font-bold tabular-nums ${color}`}>{value}</dd>
      <dt className="text-xs font-medium text-muted">{label}</dt>
    </div>
  );
}
