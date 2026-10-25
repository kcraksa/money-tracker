"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Gauge } from "@/components/icons";
import { ProgressBar } from "@/components/progress-bar";
import { kmText } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { dueText, type Summary } from "@/lib/service/logic";
import type { VehicleOverview } from "@/lib/service/types";
import { KIND_ICON, STATUS_UI, agoText } from "@/lib/service/ui";
import { OdometerSheet } from "./odometer-sheet";

export function VehicleCard({ o }: { o: VehicleOverview }) {
  const [open, setOpen] = useState(false);
  const { vehicle, summary, parts, nudge } = o;
  // Tampilkan yang paling mendesak: part bermasalah dulu, lalu yang paling hampir habis.
  const shown = parts.filter((p) => p.status.status !== "unknown").slice(0, 3);

  return (
    <li className="card flex flex-col gap-4 p-4">
      <Link href={`/servis/${vehicle.id}`} transitionTypes={["nav-forward"]} className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-2xl" aria-hidden>{KIND_ICON[vehicle.kind]}</span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-bold tracking-tight">{vehicle.name}</h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            <span>{vehicle.plate || (vehicle.kind === "car" ? "Mobil" : "Motor")}</span>
            <StatusPill summary={summary} />
          </div>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden />
      </Link>

      <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
        <Gauge className="h-5 w-5 shrink-0 text-muted" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="text-xl font-extrabold tabular-nums leading-tight">{kmText(vehicle.odometer_km)}</div>
          <div className={`text-xs ${nudge.due ? "font-semibold text-warn" : "text-muted"}`}>
            diisi {agoText(nudge.daysAgo)}{nudge.due ? " · saatnya isi lagi" : ""}
          </div>
        </div>
        <button
          onClick={() => { haptic("tap"); setOpen(true); }} aria-label={`Isi km ${vehicle.name}`}
          className={`min-h-11 shrink-0 rounded-xl px-4 text-sm font-semibold transition active:scale-95 ${nudge.due ? "bg-primary text-primary-fg" : "border border-border bg-surface"}`}
        >
          Isi km
        </button>
      </div>

      {shown.length > 0 ? (
        <ul className="flex flex-col gap-3" aria-label="Komponen yang paling mendesak">
          {shown.map((p) => {
            const ui = STATUS_UI[p.status.status];
            return (
              <li key={p.id} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{p.name}</span>
                  <span className={`shrink-0 text-xs font-medium tabular-nums ${ui.text}`}>{dueText(p.status)}</span>
                </div>
                <ProgressBar size="sm" tone={ui.bar} pct={Math.min(100, p.status.usedPct * 100)} label={`${p.name} terpakai`} />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted">Belum ada riwayat servis. Catat servis terakhir supaya aplikasi bisa mengingatkan.</p>
      )}

      <OdometerSheet open={open} onClose={() => setOpen(false)} vehicle={{ id: vehicle.id, name: vehicle.name, km: vehicle.odometer_km }} />
    </li>
  );
}

export function StatusPill({ summary }: { summary: Summary }) {
  if (summary.total === 0) return null;
  const n = summary.worst === "overdue" ? summary.overdue : summary.worst === "soon" ? summary.soon : 0;
  const ui = STATUS_UI[summary.worst];
  const label = summary.worst === "ok" ? "Aman" : summary.worst === "unknown" ? "Belum ada data" : `${n} ${ui.label.toLowerCase()}`;
  return <span className={`pill shrink-0 ${ui.pill}`}>{label}</span>;
}
