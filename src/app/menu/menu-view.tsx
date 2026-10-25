import Link from "next/link";
import { ChevronRight, Settings, Wallet, Wrench } from "@/components/icons";
import { Logo } from "@/components/logo";
import { MigrationNotice } from "@/components/migration-notice";

export type MenuProps = {
  greeting: string;
  name: string;
  service: {
    vehicles: number;
    overdue: number; // part yang sudah lewat batas
    soon: number; // part yang sebentar lagi
    nudges: number; // kendaraan yang kmnya perlu diperbarui
    outdated: boolean;
    error: string | null;
  };
};

export function MenuView({ greeting, name, service }: MenuProps) {
  const attention = service.overdue + service.soon;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 pb-10 pt-[max(env(safe-area-inset-top),1.5rem)]">
      <header className="flex items-center gap-3">
        <Logo size={44} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">{greeting}</p>
          <h1 className="truncate text-xl font-bold tracking-tight">{name}</h1>
        </div>
        <Link href="/pengaturan" aria-label="Pengaturan" className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-muted shadow-card">
          <Settings className="h-5 w-5" aria-hidden />
        </Link>
      </header>

      <div>
        <h2 className="text-[28px] font-extrabold leading-tight tracking-tight">Mau buka yang mana?</h2>
        <p className="mt-1 text-muted">Ketuk salah satu. Kamu bisa kembali ke sini lewat tombol Menu.</p>
      </div>

      <nav aria-label="Menu utama" className="flex flex-col gap-4">
        <Link
          href="/" transitionTypes={["nav-forward"]}
          className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-hero-from to-hero-to p-6 text-white shadow-float transition active:scale-[0.985]"
        >
          <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" aria-hidden />
          <div className="relative flex items-start justify-between">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15"><Wallet className="h-7 w-7" aria-hidden /></span>
            <ChevronRight className="h-6 w-6 opacity-70 transition group-active:translate-x-0.5" aria-hidden />
          </div>
          <h3 className="relative mt-6 text-2xl font-bold tracking-tight">Keuangan Rumah</h3>
          <p className="relative mt-1 text-[15px]">Catat pengeluaran, belanja bulanan, dan anggaran gajian.</p>
        </Link>

        <Link
          href="/servis" transitionTypes={["nav-forward"]}
          className="group relative overflow-hidden rounded-3xl border border-border bg-surface p-6 shadow-card transition active:scale-[0.985]"
        >
          <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-accent/10" aria-hidden />
          <div className="relative flex items-start justify-between">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-warn"><Wrench className="h-7 w-7" aria-hidden /></span>
            <ChevronRight className="h-6 w-6 text-muted transition group-active:translate-x-0.5" aria-hidden />
          </div>
          <h3 className="relative mt-6 text-2xl font-bold tracking-tight">Servis Kendaraan</h3>
          <p className="relative mt-1 text-[15px] text-muted">Riwayat servis mobil dan motor, plus pengingat kapan harus servis lagi.</p>

          <div className="relative mt-4 flex flex-wrap gap-2">
            {service.vehicles === 0 && !service.outdated && !service.error && (
              <span className="pill bg-primary-soft text-primary">Tambah kendaraan pertamamu</span>
            )}
            {service.overdue > 0 && <span className="pill bg-danger-bg text-danger">{service.overdue} sudah lewat jadwal</span>}
            {service.soon > 0 && <span className="pill bg-warn-bg text-warn">{service.soon} sebentar lagi servis</span>}
            {service.nudges > 0 && <span className="pill bg-primary-soft text-primary">{service.nudges} kendaraan perlu isi km terbaru</span>}
            {service.vehicles > 0 && attention === 0 && service.nudges === 0 && (
              <span className="pill bg-ok-bg text-ok">Semua aman</span>
            )}
          </div>
        </Link>
      </nav>

      {service.outdated && <MigrationNotice file="0004_service_record.sql" />}
      {service.error && (
        <p className="rounded-2xl bg-danger-bg p-3.5 text-sm text-danger"><b>Data servis kendaraan gagal dimuat.</b> {service.error}</p>
      )}
    </main>
  );
}
