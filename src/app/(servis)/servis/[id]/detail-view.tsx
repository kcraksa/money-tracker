import Link from "next/link";
import { Check, ChevronRight, Gauge, Plus, Settings2 } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { ProgressBar } from "@/components/progress-bar";
import { kmText, rupiah } from "@/lib/format";
import { dueText } from "@/lib/service/logic";
import { KIND_ICON, STATUS_UI, agoText, dateText, intervalText } from "@/lib/service/ui";
import { StatusPill } from "../vehicle-card";
import { OdometerButton } from "./odometer-button";

import type { VehicleOverview, VisitView } from "@/lib/service/types";

export function DetailView({ id, o, visits, saved }: { id: string; o: VehicleOverview; visits: VisitView[]; saved: boolean }) {
  const { vehicle, parts, summary, nudge, kmPerDay } = o;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={vehicle.name} subtitle={vehicle.plate || (vehicle.kind === "car" ? "Mobil" : "Motor")} back="/servis"
        actions={
          <Link href={`/servis/${id}/atur`} transitionTypes={["nav-forward"]} aria-label={`Atur ${vehicle.name}`}
            className="flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-sm font-semibold shadow-card">
            <Settings2 className="h-4 w-4 text-primary" aria-hidden /> Atur
          </Link>
        }
      />

      {saved && (
        <p role="status" className="animate-pop flex items-center gap-2 rounded-2xl bg-ok-bg p-3.5 text-sm font-medium text-ok">
          <Check className="h-4 w-4" aria-hidden /> Servis tersimpan
        </p>
      )}

      <section className="card flex flex-col gap-4" aria-label="Km kendaraan">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-2xl" aria-hidden>{KIND_ICON[vehicle.kind]}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-sm text-muted"><Gauge className="h-4 w-4" aria-hidden /> Km sekarang</div>
            <div className="text-[28px] font-extrabold leading-tight tracking-tight tabular-nums">{kmText(vehicle.odometer_km)}</div>
          </div>
          <StatusPill summary={summary} />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2 p-3">
          <p className={`text-sm ${nudge.due ? "font-semibold text-warn" : "text-muted"}`}>
            Diperbarui {agoText(nudge.daysAgo)}
            {kmPerDay ? <> · rata-rata ±{Math.round(kmPerDay).toLocaleString("id-ID")} km/hari</> : null}
          </p>
          <OdometerButton vehicle={{ id, name: vehicle.name, km: vehicle.odometer_km }} highlight={nudge.due} />
        </div>
        <Link href={`/servis/catat?v=${id}`} transitionTypes={["nav-forward"]} className="btn-primary">
          <Plus className="h-[18px] w-[18px]" aria-hidden /> Catat servis
        </Link>
      </section>

      <section aria-labelledby="jadwal-h">
        <h2 id="jadwal-h" className="section-title">Jadwal servis tiap komponen</h2>
        {parts.length === 0 ? (
          <p className="card text-sm text-muted">Belum ada komponen. Tambahkan lewat tombol Atur di kanan atas.</p>
        ) : (
          <ul className="card divide-y divide-border p-0">
            {parts.map((p) => {
              const ui = STATUS_UI[p.status.status];
              const noReminder = !p.interval_km && !p.interval_months;
              return (
                <li key={p.id} className="flex flex-col gap-2 px-4 py-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{p.name}</span>
                    <span className={`pill shrink-0 ${noReminder ? "bg-surface-2 text-muted" : ui.pill}`}>{noReminder ? "Tanpa pengingat" : ui.label}</span>
                  </div>
                  {p.status.status !== "unknown" && (
                    <ProgressBar size="sm" tone={ui.bar} pct={Math.min(100, p.status.usedPct * 100)} label={`${p.name} terpakai`} />
                  )}
                  <div className={`text-sm font-semibold ${noReminder ? "text-muted" : ui.text}`}>
                    {noReminder ? "Hanya dicatat riwayatnya" : dueText(p.status)}
                  </div>
                  {!noReminder && <div className="text-sm text-muted">Ganti {intervalText(p.interval_km, p.interval_months)}</div>}
                  <div className="text-sm text-muted">
                    {p.lastOn && p.lastKm !== null
                      ? <>Terakhir {dateText(p.lastOn)} · {kmText(p.lastKm)}</>
                      : noReminder ? "Belum ada riwayat servis." : "Belum ada riwayat. Catat servis terakhirnya."}
                    {p.status.dueKm !== null && p.status.status !== "unknown" && <> · batas {kmText(p.status.dueKm)}</>}
                    {p.status.dueOn && p.status.status !== "unknown" && <> · batas {dateText(p.status.dueOn)}</>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="riwayat-h">
        <h2 id="riwayat-h" className="section-title">
          <span>Riwayat terbaru</span>
          <Link href={`/servis/riwayat?v=${id}`} transitionTypes={["nav-forward"]} className="section-link">
            Lihat semua <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </h2>
        {visits.length === 0 ? (
          <p className="card text-sm text-muted">Belum ada servis tercatat.</p>
        ) : (
          <ul className="card divide-y divide-border p-0">
            {visits.map((v) => (
              <li key={v.id} className="flex flex-col gap-1 px-4 py-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-base font-semibold">{dateText(v.serviced_on)}</span>
                  <span className="text-sm tabular-nums text-muted">{kmText(v.odometer_km)}</span>
                </div>
                <div className="text-sm text-muted">{v.parts.join(", ") || "—"}</div>
                {v.cost > 0 && <div className="text-sm font-semibold tabular-nums">{rupiah(v.cost)}</div>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
