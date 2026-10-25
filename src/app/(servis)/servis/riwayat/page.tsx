import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { History, Plus } from "@/components/icons";
import { MigrationNotice } from "@/components/migration-notice";
import { PageHeader } from "@/components/page-header";
import { getCtx } from "@/lib/ctx";
import { todayISO } from "@/lib/date";
import { rupiah } from "@/lib/format";
import { KIND_ICON } from "@/lib/service/ui";
import { loadHistory, loadServiceOverview } from "@/lib/server/service";
import { HistoryList } from "./history-list";

export const metadata = { title: "Riwayat servis" };

export default async function RiwayatPage({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const { v } = await searchParams;
  const { supabase } = await getCtx();
  const [overview, history] = await Promise.all([loadServiceOverview(supabase, todayISO()), loadHistory(supabase, v)]);
  const vehicles = overview.vehicles.map((o) => o.vehicle);
  const names = Object.fromEntries(vehicles.map((x) => [x.id, x.name]));
  const total = history.visits.reduce((s, x) => s + x.cost, 0);

  const chip = (active: boolean) =>
    `flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition active:scale-95 ${active ? "border-primary bg-primary text-primary-fg" : "border-border bg-surface"}`;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Riwayat servis" subtitle={`${history.visits.length} servis${total > 0 ? ` · ${rupiah(total)}` : ""}`} back="/servis" />
      {(overview.outdated || history.outdated) && <MigrationNotice file="0004_service_record.sql" />}
      {history.error && <p role="alert" className="rounded-2xl bg-danger-bg p-3.5 text-sm text-danger"><b>Gagal memuat.</b> {history.error}</p>}

      {vehicles.length > 1 && (
        <div data-no-ptr className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Filter kendaraan">
          <Link href="/servis/riwayat" className={chip(!v)}>Semua</Link>
          {vehicles.map((x) => (
            <Link key={x.id} href={`/servis/riwayat?v=${x.id}`} className={chip(v === x.id)}>
              <span aria-hidden>{KIND_ICON[x.kind]}</span> {x.name}
            </Link>
          ))}
        </div>
      )}

      {history.visits.length > 0 ? (
        <HistoryList visits={history.visits} names={names} />
      ) : !overview.outdated && !history.error ? (
        <EmptyState icon={<History className="h-8 w-8" />} title="Belum ada riwayat">
          <p className="max-w-xs text-sm text-muted">Servis yang kamu catat muncul di sini, lengkap dengan komponen, km, dan biayanya.</p>
          <Link href={v ? `/servis/catat?v=${v}` : "/servis/catat"} transitionTypes={["nav-forward"]} className="btn-primary mt-1"><Plus className="h-[18px] w-[18px]" aria-hidden /> Catat servis</Link>
        </EmptyState>
      ) : null}
    </div>
  );
}
