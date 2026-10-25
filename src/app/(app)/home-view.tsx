import Link from "next/link";
import {
  AlertTriangle, BarChart3, Check, ChevronRight, Coins, PiggyBank, Plus, Receipt, Settings, ShoppingCart, Trophy, Wrench,
} from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { rupiah } from "@/lib/format";

export type HomeProps = {
  /** Mode sederhana: tanpa poin dan prestasi. */
  simple?: boolean;
  greeting: string;
  name: string;
  periodLabel: string;
  day: number;
  totalDays: number;
  hasPeriod: boolean;
  overdue: boolean;
  income: { total: number; allocated: number } | null;
  totalSpent: number;
  totalBudget: number;
  /** Jumlah kategori yang perlu dihemat / sudah lewat anggaran. */
  alertCount: number;
  /** Tagihan bulanan yang belum lunas. */
  unpaidBills: number;
  /** Level keluarga untuk pintasan Prestasi; null bila mode sederhana. */
  level: number | null;
};

type Tile = { href: string; label: string; aria?: string; Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>; badge?: string; primary?: boolean };

/**
 * Beranda = ringkasan + pintasan, tanpa daftar panjang. Rincian dibuka lewat tombol di bawah.
 */
export function HomeView(p: HomeProps) {
  const left = p.totalBudget - p.totalSpent;
  const monthPct = p.totalBudget > 0 ? (p.totalSpent / p.totalBudget) * 100 : 0;
  // Akun yang masih kosong: tampilkan panduan mulai, bukan angka Rp 0.
  const steps = [
    { done: p.income !== null, title: "Catat gajian", hint: "Uang yang masuk bulan ini", href: "/rencana" },
    { done: p.totalBudget > 0, title: "Bagi uang ke kategori", hint: "Mis. makan, listrik, bensin", href: "/rencana" },
    { done: p.totalSpent > 0, title: "Catat pengeluaran", hint: "Boleh langsung sekarang", href: "/catat" },
  ];
  const setupDone = steps.every((x) => x.done);
  const fresh = !steps.some((x) => x.done);

  const tiles: Tile[] = [
    { href: "/catat", label: "Catat", aria: "Catat pengeluaran", Icon: Plus, primary: true },
    { href: "/checklist", label: "Belanja", Icon: ShoppingCart },
    { href: "/anggaran", label: "Anggaran", Icon: PiggyBank, badge: p.alertCount > 0 ? String(p.alertCount) : undefined },
    { href: "/tagihan", label: "Tagihan", Icon: Receipt, badge: p.unpaidBills > 0 ? String(p.unpaidBills) : undefined },
    { href: "/evaluasi", label: "Laporan", aria: "Laporan belanja", Icon: BarChart3 },
    { href: "/rencana", label: "Gajian", aria: "Gajian dan pembagian uang", Icon: Coins },
    ...(p.simple ? [] : [{ href: "/pencapaian", label: "Prestasi", aria: p.level ? `Prestasi, level ${p.level}` : "Prestasi", Icon: Trophy } as Tile]),
    { href: "/servis", label: "Servis", aria: "Servis kendaraan", Icon: Wrench },
    { href: "/pengaturan", label: "Pengaturan", Icon: Settings },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={`Halo, ${p.name} 👋`} subtitle={p.greeting} />

      {!setupDone && <StartCard steps={steps} />}

      {!fresh && (
        <section aria-labelledby="uang-h" className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-hero-from to-hero-to p-4 text-white shadow-float">
          <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" aria-hidden />
          <h2 id="uang-h" className="relative text-sm font-semibold">Pengeluaran periode ini</h2>
          <div className="relative mt-1 text-[36px] font-extrabold leading-none tracking-tight tabular-nums">{rupiah(p.totalSpent)}</div>
          <p className="relative mt-1.5 text-sm">{p.periodLabel} · hari ke-{p.day} dari {p.totalDays}</p>
          {p.totalBudget > 0 && (
            <>
              <div
                role="progressbar" aria-label="Anggaran terpakai" aria-valuenow={Math.round(Math.min(100, monthPct))} aria-valuemin={0} aria-valuemax={100}
                className="relative mt-3 h-2.5 overflow-hidden rounded-full bg-white/20"
              >
                <div className={`h-full rounded-full ${monthPct > 100 ? "bg-red-300" : "bg-white"}`} style={{ width: `${Math.min(100, monthPct)}%` }} />
              </div>
              <div className="relative mt-3 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-sm">{left >= 0 ? "Sisa anggaran" : "Lebih dari anggaran"}</div>
                  <div className="text-lg font-bold tabular-nums">{rupiah(Math.abs(left))}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm">Anggaran</div>
                  <div className="text-lg font-bold tabular-nums">{rupiah(p.totalBudget)}</div>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {(p.overdue || (!fresh && p.alertCount > 0)) && (
        <div className="flex flex-col gap-2">
          {p.overdue && (
            <Link href="/rencana" transitionTypes={["nav-forward"]} className="flex min-h-12 items-center gap-3 rounded-2xl bg-warn-bg px-3.5 py-2.5 text-sm text-warn">
              <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />
              <span className="flex-1 font-semibold">Saatnya catat gajian baru</span>
              <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
            </Link>
          )}
          {!fresh && p.alertCount > 0 && (
            <Link href="/anggaran" transitionTypes={["nav-forward"]} className="flex min-h-12 items-center gap-3 rounded-2xl bg-warn-bg px-3.5 py-2.5 text-sm text-warn">
              <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />
              <span className="flex-1 font-semibold">{p.alertCount} kategori perlu dihemat</span>
              <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
            </Link>
          )}
        </div>
      )}

      <nav aria-label="Menu pintasan">
        <ul className="grid grid-cols-3 gap-3">
          {tiles.map(({ href, label, aria, Icon, badge, primary }) => (
            <li key={href}>
              <Link
                href={href} transitionTypes={["nav-forward"]} aria-label={badge ? `${aria ?? label}, ${badge}` : aria}
                className={`relative flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-2xl border p-2 text-center shadow-card transition active:scale-[0.97] ${
                  primary ? "border-transparent bg-primary text-primary-fg" : "border-border bg-surface"
                }`}
              >
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${primary ? "bg-white/20" : "bg-primary-soft text-primary"}`}>
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <span className="text-[15px] font-semibold leading-tight">{label}</span>
                {badge && (
                  <span className="absolute right-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-warn px-1.5 text-xs font-bold text-bg" aria-hidden>{badge}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

function StartCard({ steps }: { steps: { done: boolean; title: string; hint: string; href: string }[] }) {
  const doneCount = steps.filter((x) => x.done).length;
  return (
    <section aria-labelledby="mulai-h" className="card flex flex-col gap-3.5 border-primary/40 p-4">
      <div>
        <h2 id="mulai-h" className="text-xl font-bold tracking-tight">Mulai dari sini</h2>
        <p className="mt-1 text-[15px] text-muted">
          Tidak harus berurutan. Boleh <b className="text-fg">langsung catat pengeluaran</b> dulu.
          <span className="ml-1 font-semibold text-primary">({doneCount} dari {steps.length} selesai)</span>
        </p>
      </div>
      <ol className="flex flex-col gap-2.5">
        {steps.map((x, i) => (
          <li key={x.title}>
            <Link
              href={x.href} transitionTypes={["nav-forward"]}
              className={`flex min-h-14 items-center gap-3.5 rounded-2xl border px-3.5 py-2.5 transition active:scale-[0.99] ${x.done ? "border-ok/40 bg-ok-bg" : "border-control bg-surface"}`}
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

