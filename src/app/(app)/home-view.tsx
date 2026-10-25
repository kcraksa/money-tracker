import Link from "next/link";
import { AlertTriangle, Check, ChevronRight, Flame, KeyIcon, Plus, Settings, Sparkles, Wallet } from "@/components/icons";
import { CategoryIcon } from "@/components/category-icon";
import { ModuleSwitch } from "@/components/module-switch";
import { PageHeader } from "@/components/page-header";
import { ProgressBar } from "@/components/progress-bar";
import { Ring } from "@/components/ring";
import type { Forecast } from "@/lib/forecast";
import { rupiah } from "@/lib/format";
import { levelInfo } from "@/lib/gamification";
import type { Category } from "@/lib/types";
import { BillRow } from "./bill-row";
import { setSimpleMode } from "@/app/actions/settings";
import { SubmitButton } from "@/components/submit-button";

export type HomeProps = {
  /** Mode sederhana: tanpa poin, level, hari berturut-turut, dan tantangan. */
  simple?: boolean;
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
  // Akun yang masih kosong: tampilkan panduan mulai, bukan angka Rp 0 dan daftar kosong.
  const steps = [
    { done: p.income !== null, title: "Catat gajian", hint: "Uang yang masuk bulan ini.", href: "/rencana" },
    { done: p.totalBudget > 0, title: "Bagi uang ke kategori", hint: "Mis. makan Rp 2 juta, listrik Rp 450 ribu.", href: "/rencana" },
    { done: p.totalSpent > 0, title: "Catat pengeluaran pertama", hint: "Boleh langsung, tidak perlu menunggu langkah lain.", href: "/catat" },
  ];
  const setupDone = steps.every((x) => x.done);
  const fresh = !steps.some((x) => x.done);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`Halo, ${p.name} 👋`}
        subtitle={p.greeting}
        actions={
          <Link href="/pengaturan" transitionTypes={["nav-forward"]} aria-label="Pengaturan"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-muted shadow-card">
            <Settings className="h-5 w-5" aria-hidden />
          </Link>
        }
      />
      <ModuleSwitch current="keuangan" />

      {!setupDone && <StartCard steps={steps} />}

      {/* Uang periode ini: hal pertama yang dicari */}
      {!fresh && (
      <section aria-labelledby="uang-h" className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-hero-from to-hero-to p-5 text-white shadow-float">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" aria-hidden />
        <h2 id="uang-h" className="relative text-sm font-semibold">Pengeluaran periode ini</h2>
        <div className="relative mt-1 text-[36px] font-extrabold leading-none tracking-tight tabular-nums">{rupiah(p.totalSpent)}</div>
        <p className="relative mt-2 text-sm">{p.periodLabel} · hari ke-{p.day} dari {p.totalDays}</p>
        {p.totalBudget > 0 && (
          <>
            <div className="relative mt-4 grid grid-cols-2 gap-3 border-t border-white/25 pt-3">
              <div>
                <div className="text-sm">{left >= 0 ? "Sisa anggaran" : "Lebih dari anggaran"}</div>
                <div className="text-lg font-bold tabular-nums">{rupiah(Math.abs(left))}</div>
              </div>
              <div className="text-right">
                <div className="text-sm">Anggaran</div>
                <div className="text-lg font-bold tabular-nums">{rupiah(p.totalBudget)}</div>
              </div>
            </div>
            <div
              role="progressbar" aria-label="Anggaran terpakai" aria-valuenow={Math.round(Math.min(100, monthPct))} aria-valuemin={0} aria-valuemax={100}
              className="relative mt-3 h-2.5 overflow-hidden rounded-full bg-white/20"
            >
              <div className={`h-full rounded-full ${monthPct > 100 ? "bg-red-300" : "bg-white"}`} style={{ width: `${Math.min(100, monthPct)}%` }} />
            </div>
          </>
        )}
        <Link href="/catat"
          className="relative mt-4 flex min-h-13 items-center justify-center gap-2 rounded-xl bg-white px-4 text-base font-bold text-hero-to transition active:scale-[0.98]">
          <Plus className="h-5 w-5" aria-hidden /> Catat pengeluaran
        </Link>
        {!p.simple && (
          <p className="relative mt-2.5 flex items-center justify-center gap-1.5 text-sm">
            {p.loggedToday
              ? <><Check className="h-4 w-4" aria-hidden /> Hari ini sudah dicatat</>
              : "Hari ini belum ada catatan"}
          </p>
        )}
      </section>
      )}

      {p.overdue && (
        <Link href="/rencana" transitionTypes={["nav-forward"]} className="flex items-center gap-3 rounded-2xl bg-warn-bg p-3.5 text-sm text-warn">
          <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />
          <span className="flex-1"><b>Sudah lebih dari sebulan sejak gajian terakhir.</b> Ketuk di sini untuk mencatat gajian baru dan mengatur anggarannya.</span>
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

      {!fresh && (<>
      <section aria-labelledby="sisa-h">
        <h2 id="sisa-h" className="section-title">
          <span>Pengeluaran sehari-hari</span>
          <Link href="/rencana" transitionTypes={["nav-forward"]} className="section-link">
            Atur anggaran <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </h2>
        <p className="section-hint">Jumlahnya berubah-ubah, mis. makan dan bensin. Batasnya bisa kamu ubah kapan saja.</p>
        {noBudgets && (
          <Link href="/rencana" transitionTypes={["nav-forward"]} className="card mb-3 flex items-center justify-between gap-3 text-sm">
            <span>Anggaran belum diatur. Atur dulu supaya sisa uang tiap kategori terlihat.</span>
            <span className="shrink-0 font-semibold text-primary">Atur</span>
          </Link>
        )}
        <ul className="card divide-y divide-border p-0">
          {p.rows.map(({ c, f }) => (
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

      {p.income ? (
        <section aria-labelledby="masuk-h">
          <h2 id="masuk-h" className="section-title">
            <span>Uang masuk periode ini</span>
            <Link href="/rencana" transitionTypes={["nav-forward"]} className="section-link">
              Ubah <ChevronRight className="h-4 w-4" aria-hidden />
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
            <b className="block text-base">{p.hasPeriod ? "Catat pemasukan periode ini" : "Catat gajian"}</b>
            <span className="text-muted">Lalu bagi uangnya ke tiap kategori pengeluaran.</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden />
        </Link>
      )}

      {p.bills.length > 0 && (
        <section aria-labelledby="tagihan-h">
          <h2 id="tagihan-h" className="section-title"><span>Tagihan bulanan</span></h2>
          <p className="section-hint">Jumlahnya tetap dan dibayar sekali sebulan, mis. listrik. Ketuk Bayar kalau sudah lunas.</p>
          <ul className="card divide-y divide-border p-0">
            {p.bills.map((b) => <BillRow key={b.categoryId} {...b} simple={p.simple} />)}
          </ul>
        </section>
      )}
      </>)}

      {/* Poin keluarga: penyemangat, bukan informasi utama. Disembunyikan di mode sederhana. */}
      {!p.simple && !fresh && (
      <section aria-labelledby="poin-h">
        <h2 id="poin-h" className="section-title">
          <span>Poin keluarga</span>
          <Link href="/pencapaian" transitionTypes={["nav-forward"]} className="section-link">
            Lihat semua <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </h2>
        <div className="card flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Ring pct={lvl.pct} size={64} tone="primary">
              <span className="text-xl font-extrabold leading-none text-primary">{lvl.level}</span>
            </Ring>
            <div className="min-w-0 flex-1">
              <div className="text-base font-semibold">Level {lvl.level} · {p.totalXp.toLocaleString("id-ID")} poin</div>
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
              <h3 className="mb-3 flex items-center justify-between gap-2 text-sm font-semibold">
                <span>Tantangan minggu ini</span>
                <span className="flex items-center gap-1 text-warn"><Sparkles className="h-4 w-4" aria-hidden /> +50 poin tiap selesai</span>
              </h3>
              <ul className="flex flex-col gap-3.5">
                {p.quests.map((q) => (
                  <li key={q.code} className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${q.complete ? "bg-ok-bg text-ok" : "bg-primary-soft text-primary"}`}>
                      {q.complete ? <Check className="h-5 w-5" aria-hidden /> : <KeyIcon name={q.icon} className="h-5 w-5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-semibold">{q.title}</span>
                        <span className={`shrink-0 text-sm font-semibold tabular-nums ${q.complete ? "text-ok" : "text-muted"}`}>
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
          <form action={setSimpleMode} className="border-t border-border pt-2">
            <input type="hidden" name="simple" value="1" />
            <SubmitButton pendingLabel="Menyembunyikan…" className="min-h-11 w-full text-sm font-semibold text-muted">
              Tidak perlu poin &amp; tantangan? Sembunyikan
            </SubmitButton>
          </form>
        </div>
      </section>
      )}
    </div>
  );
}

function StartCard({ steps }: { steps: { done: boolean; title: string; hint: string; href: string }[] }) {
  const doneCount = steps.filter((x) => x.done).length;
  return (
    <section aria-labelledby="mulai-h" className="card flex flex-col gap-4 border-primary/40 p-5">
      <div>
        <h2 id="mulai-h" className="text-xl font-bold tracking-tight">Mulai dari sini</h2>
        <p className="mt-1 text-[15px] text-muted">
          Tenang, tidak harus berurutan. Kamu boleh <b className="text-fg">langsung mencatat pengeluaran dulu</b>; anggaran bisa diatur belakangan.
        </p>
        <p className="mt-1 text-sm font-semibold text-primary">{doneCount} dari {steps.length} langkah selesai</p>
      </div>
      <ol className="flex flex-col gap-2.5">
        {steps.map((x, i) => (
          <li key={x.title}>
            <Link
              href={x.href} transitionTypes={["nav-forward"]}
              className={`flex min-h-16 items-center gap-3.5 rounded-2xl border p-3.5 transition active:scale-[0.99] ${x.done ? "border-ok/40 bg-ok-bg" : "border-control bg-surface"}`}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-bold ${x.done ? "bg-ok text-bg" : "bg-primary-soft text-primary"}`} aria-hidden>
                {x.done ? <Check className="h-5 w-5" strokeWidth={3} /> : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-bold">{x.title}{x.done && <span className="sr-only"> (sudah selesai)</span>}</span>
                <span className="block text-sm text-muted">{x.hint}</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" | "danger" }) {
  const color = tone === "danger" ? "text-danger" : tone === "warn" ? "text-warn" : tone === "ok" ? "text-ok" : "";
  return (
    <div className="flex flex-col-reverse px-1 py-3">
      <dd className={`text-[15px] font-bold tabular-nums ${color}`}>{value}</dd>
      <dt className="text-sm text-muted">{label}</dt>
    </div>
  );
}
