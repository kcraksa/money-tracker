import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { AlertTriangle, ChevronRight, Gauge, LayoutGrid, Plus, Wrench } from "@/components/icons";
import { MigrationNotice } from "@/components/migration-notice";
import { PageHeader } from "@/components/page-header";
import { dueText } from "@/lib/service/logic";
import { KIND_ICON, STATUS_UI } from "@/lib/service/ui";
import { VehicleCard } from "./vehicle-card";

import type { VehicleOverview } from "@/lib/service/types";

export function ServisHome({ vehicles, outdated, error }: { vehicles: VehicleOverview[]; outdated: boolean; error: string | null }) {
  // Semua part yang perlu perhatian, lintas kendaraan: terlewat dulu, lalu yang paling hampir habis.
  const alerts = vehicles
    .flatMap((o) => o.parts.filter((p) => p.status.status === "overdue" || p.status.status === "soon").map((p) => ({ o, p })))
    .sort((a, b) => (a.p.status.status === b.p.status.status ? b.p.status.usedPct - a.p.status.usedPct : a.p.status.status === "overdue" ? -1 : 1))
    .slice(0, 6);
  const nudges = vehicles.filter((o) => o.nudge.due);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Service Record" subtitle={vehicles.length ? `${vehicles.length} kendaraan` : "Riwayat & pengingat servis"} back="/menu"
        actions={
          <Link href="/servis/tambah" transitionTypes={["nav-forward"]} aria-label="Tambah kendaraan"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-fg shadow-card">
            <Plus className="h-5 w-5" />
          </Link>
        }
      />

      {outdated && <MigrationNotice file="0004_service_record.sql" />}
      {error && <p role="alert" className="rounded-2xl bg-danger-bg p-3.5 text-sm text-danger"><b>Gagal memuat.</b> {error}</p>}

      {nudges.length > 0 && (
        <p className="flex items-start gap-3 rounded-2xl bg-primary-soft p-3.5 text-sm">
          <Gauge className="mt-0.5 h-[18px] w-[18px] shrink-0 text-primary" aria-hidden />
          <span><b>Saatnya update km:</b> {nudges.map((o) => o.vehicle.name).join(", ")}. Ketuk <b>Update km</b> di kartunya.</span>
        </p>
      )}

      {alerts.length > 0 && (
        <section aria-label="Perlu perhatian">
          <h2 className="section-title"><span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warn" aria-hidden /> Perlu perhatian</span></h2>
          <ul className="card divide-y divide-border p-0">
            {alerts.map(({ o, p }) => {
              const ui = STATUS_UI[p.status.status];
              return (
                <li key={p.id}>
                  <Link href={`/servis/${o.vehicle.id}`} transitionTypes={["nav-forward"]} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-xl" aria-hidden>{KIND_ICON[o.vehicle.kind]}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{p.name}</div>
                      <div className="text-xs text-muted">{o.vehicle.name} · {dueText(p.status)}</div>
                    </div>
                    <span className={`pill shrink-0 ${ui.pill}`}>{ui.label}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {vehicles.length > 0 ? (
        <ul className="flex flex-col gap-3" aria-label="Kendaraan">
          {vehicles.map((o) => <VehicleCard key={o.vehicle.id} o={o} />)}
        </ul>
      ) : !outdated && !error ? (
        <EmptyState icon={<Wrench className="h-8 w-8" />} title="Belum ada kendaraan">
          <p className="max-w-xs text-sm text-muted">
            Tambahkan mobil atau motor, isi interval servis tiap part (oli, busi, dan lainnya), lalu aplikasi mengingatkan kapan waktunya servis.
          </p>
          <Link href="/servis/tambah" transitionTypes={["nav-forward"]} className="btn-primary mt-1"><Plus className="h-[18px] w-[18px]" aria-hidden /> Tambah kendaraan</Link>
        </EmptyState>
      ) : null}

      <Link href="/menu" transitionTypes={["nav-back"]} className="btn-ghost self-center text-sm">
        <LayoutGrid className="h-4 w-4" aria-hidden /> Kembali ke menu
      </Link>
    </div>
  );
}
