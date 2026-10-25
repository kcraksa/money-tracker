import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { MigrationNotice } from "@/components/migration-notice";
import { Plus, Wrench } from "@/components/icons";
import { getCtx } from "@/lib/ctx";
import { todayISO } from "@/lib/date";
import { dueText } from "@/lib/service/logic";
import { loadServiceOverview } from "@/lib/server/service";
import { ServiceForm } from "./service-form";

export const metadata = { title: "Catat servis" };

export default async function CatatServisPage({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const { v } = await searchParams;
  const { supabase } = await getCtx();
  const today = todayISO();
  const { vehicles, outdated } = await loadServiceOverview(supabase, today);

  if (outdated) return <MigrationNotice file="0004_service_record.sql" />;
  if (vehicles.length === 0) {
    return (
      <EmptyState icon={<Wrench className="h-8 w-8" />} title="Belum ada kendaraan">
        <p className="max-w-xs text-sm text-muted">Tambahkan kendaraan dulu, baru servisnya bisa dicatat.</p>
        <Link href="/servis/tambah" transitionTypes={["nav-forward"]} className="btn-primary mt-1"><Plus className="h-[18px] w-[18px]" aria-hidden /> Tambah kendaraan</Link>
      </EmptyState>
    );
  }

  return (
    <ServiceForm
      today={today}
      defaultId={v ?? vehicles[0].vehicle.id}
      vehicles={vehicles.map((o) => ({
        id: o.vehicle.id, name: o.vehicle.name, kind: o.vehicle.kind, km: o.vehicle.odometer_km,
        parts: o.parts.map((p) => ({ id: p.id, name: p.name, status: p.status.status, hint: p.interval_km || p.interval_months ? dueText(p.status) : "Tanpa pengingat" })),
      }))}
    />
  );
}
