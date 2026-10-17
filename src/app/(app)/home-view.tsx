import Link from "next/link";
import { AlertTriangle, Check, ChevronRight, Flame, KeyIcon, Plus, Settings, Sparkles, Wallet } from "@/components/icons";
import { CategoryIcon } from "@/components/category-icon";
import { PageHeader } from "@/components/page-header";
import { ProgressBar } from "@/components/progress-bar";
import { Ring } from "@/components/ring";
import { ThemeToggle } from "@/components/theme-toggle";
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

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`${p.name} 👋`}
        subtitle={p.greeting}
        actions={
          <>
            <ThemeToggle />
            <Link href="/pengaturan" aria-label="Pengaturan"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted shadow-card">
              <Settings className="h-[18px] w-[18px]" />
            </Link>
          </>
        }
      />

      {/* Hero: level keluarga */}
      <section
        aria-label="Level keluarga"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-hero-from to-hero-to p-5 text-white shadow-float"
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" aria-hidden />
        <div className="pointer-events-none absolute -bottom-16 right-10 h-40 w-40 rounded-full bg-white/5" aria-hidden />
        <div className="relative flex items-center gap-4">
          <Ring pct={lvl.pct} size={92}>
            <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Level</span>
            <span className="text-3xl font-extrabold leading-none">{lvl.level}</span>
          </Ring>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium opacity-80">Level keluarga</div>
            <div className="text-2xl font-bold tracking-tight">{p.totalXp.toLocaleString("id-ID")} XP</div>
            <div className="text-xs opacity-80">{lvl.span - lvl.into} XP lagi ke level {lvl.level + 1}</div>
          </div>
        </div>
        <div className="relative mt-4 flex flex-wrap items-center gap-2">
          <span className="pill bg-white/15 text-white">
            <Flame className="h-3.5 w-3.5 text-amber-300" aria-hidden /> {p.streak} hari berturut
          </span>
          <span className={`pill ${p.loggedToday ? "bg-white/15 text-white" : "bg-amber-300/20 text-amber-100"}`}>
            {p.loggedToday ? <><Check className="h-3.5 w-3.5" aria-hidden /> Sudah dicatat hari ini</> : "Belum dicatat hari ini"}
          </span>
        </div>
        {!p.loggedToday && (
          <Link href="/catat"
            className="relative mt-4 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-4 font-semibold text-hero-to transition active:scale-[0.98]">
            <Plus className="h-5 w-5" aria-hidden />
            {p.streak > 0 ? `Catat sekarang, jaga streak ${p.streak} hari` : "Catat pengeluaran pertama"}
          </Link>
        )}
      </section>

      {p.overdue && (
        <Link href="/rencana" className="flex items-center gap-3 rounded-2xl bg-warn-bg p-3.5 text-sm text-warn">
          <AlertTriangle className="h-[18px] w-[18px] shrink-0" aria-hidden />
          <span className="flex-1"><b>Periode sudah lewat sebulan.</b> Catat gajian baru supaya anggaran periode berikutnya mulai.</span>
          <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
        </Link>
      )}

      {/* Ringkasan periode */}
      <section className="card flex flex-col gap-3" aria-label="Ringkasan periode">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-muted">{p.periodLabel}</span>
          <span className="shrink-0 text-xs text-muted">hari ke-{p.day} dari {p.totalDays}</span>
        </div>
        <div>
          <div className="text-[28px] font-bold leading-none tracking-tight tabular-nums">{rupiah(p.totalSpent)}</div>
          <div className="mt-1 text-sm text-muted">
            {p.totalBudget > 0 ? <>terpakai dari anggaran {rupiah(p.totalBudget)}</> : "pengeluaran periode ini"}
          </div>
        </div>
        {p.totalBudget > 0 && (
          <ProgressBar pct={monthPct} tone={monthPct > 100 ? "danger" : "primary"} label="Total pemakaian periode ini" />
        )}
        {p.income ? (
          <Link href="/rencana" className="grid grid-cols-3 divide-x divide-border rounded-xl bg-surface-2 text-center">
            <MiniStat label="Pemasukan" value={rupiah(p.income.total)} />
            <MiniStat label="Dialokasikan" value={rupiah(p.income.allocated)} />
            <MiniStat
              label={p.income.total - p.income.allocated < 0 ? "Kelebihan" : "Belum dibagi"}
              value={rupiah(Math.abs(p.income.total - p.income.allocated))}
              tone={p.income.total - p.income.allocated < 0 ? "danger" : p.income.total - p.income.allocated > 0 ? "warn" : "ok"}
            />
          </Link>
        ) : (
          <Link href="/rencana" className="flex items-center gap-3 rounded-xl bg-primary-soft p-3 text-sm">
            <Wallet className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            <span className="flex-1">
              <b>{p.hasPeriod ? "Catat pemasukan periode ini" : "Catat gajian"}</b> lalu bagi ke tiap pos anggaran.
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          </Link>
        )}
      </section>

      {alerts.length > 0 && (
        <section aria-label="Peringatan" className="flex flex-col gap-2">
          {alerts.map(({ c, f }) => {
            const over = f.status === "over";
            return (
              <div key={c.id} role="alert"
                className={`flex items-start gap-3 rounded-2xl p-3.5 text-sm ${over ? "bg-danger-bg text-danger" : "bg-warn-bg text-warn"}`}>
                <AlertTriangle className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden />
                <p>
                  <b>{c.name}</b>{" "}
                  {over
                    ? `sudah melewati budget ${rupiah(f.spent - f.budget)}.`
                    : `diproyeksi ${rupiah(f.projected)} di akhir bulan, budget ${rupiah(f.budget)}.`}
                </p>
              </div>
            );
          })}
        </section>
      )}

      <section aria-label="Sisa budget">
        <h2 className="section-title">Sisa anggaran</h2>
        {noBudgets && (
          <Link href="/rencana" className="card mb-2 flex items-center justify-between gap-3 text-sm">
            <span className="text-muted">Anggaran belum dibagi. Atur dulu supaya sisa dan forecast muncul.</span>
            <span className="shrink-0 font-semibold text-primary">Atur</span>
          </Link>
        )}
        <ul className="card divide-y divide-border p-0">
          {p.rows.map(({ c, f }) => (
            <li key={c.id} className="flex flex-col gap-2.5 px-4 py-3.5">
              <div className="flex items-center gap-3">
                <CategoryIcon icon={c.icon} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{c.name}</span>
                    {f.status === "over" && <span className="pill bg-danger-bg text-danger">Lewat</span>}
                    {f.status === "warn" && <span className="pill bg-warn-bg text-warn">Waspada</span>}
                  </div>
                  <div className="text-xs text-muted tabular-nums">
                    {f.budget > 0 ? `${rupiah(f.spent)} dari ${rupiah(f.budget)}` : `${rupiah(f.spent)} terpakai`}
                  </div>
                </div>
                {f.budget > 0 && (
                  <div className="text-right">
                    <div className={`text-[15px] font-bold tabular-nums ${f.remaining < 0 ? "text-danger" : ""}`}>
                      {rupiah(Math.abs(f.remaining))}
                    </div>
                    <div className="text-[11px] text-muted">{f.remaining < 0 ? "melebihi" : "sisa"}</div>
                  </div>
                )}
              </div>
              {f.budget > 0 && (
                <ProgressBar size="sm" label={`Pemakaian ${c.name}`} pct={(f.spent / f.budget) * 100} tone={TONE[f.status]} />
              )}
            </li>
          ))}
        </ul>
      </section>

      {p.bills.length > 0 && (
        <section aria-label="Tagihan tetap">
          <h2 className="section-title">Tagihan tetap</h2>
          <ul className="card divide-y divide-border p-0">
            {p.bills.map((b) => <BillRow key={b.categoryId} {...b} />)}
          </ul>
        </section>
      )}

      <section aria-label="Quest minggu ini">
        <h2 className="section-title">
          <span>Quest minggu ini</span>
          <span className="pill bg-accent-soft text-warn"><Sparkles className="h-3.5 w-3.5" aria-hidden /> +50 XP</span>
        </h2>
        <ul className="card divide-y divide-border p-0">
          {p.quests.map((q) => (
            <li key={q.code} className="flex items-center gap-3 px-4 py-3.5">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${q.complete ? "bg-ok-bg text-ok" : "bg-primary-soft text-primary"}`}>
                {q.complete ? <Check className="h-5 w-5" aria-hidden /> : <KeyIcon name={q.icon} className="h-5 w-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-semibold">{q.title}</span>
                  <span className={`shrink-0 text-xs font-semibold tabular-nums ${q.complete ? "text-ok" : "text-muted"}`}>
                    {q.complete ? "Selesai" : `${q.done}/${q.target}`}
                  </span>
                </div>
                <div className="mt-2">
                  <ProgressBar size="sm" pct={(q.done / q.target) * 100} tone={q.complete ? "ok" : "primary"} label={q.title} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" | "danger" }) {
  const color = tone === "danger" ? "text-danger" : tone === "warn" ? "text-warn" : tone === "ok" ? "text-ok" : "";
  return (
    <div className="px-1 py-2.5">
      <div className="text-[10px] font-medium text-muted">{label}</div>
      <div className={`text-[13px] font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
