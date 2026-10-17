"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteVisit } from "@/app/actions/service";
import { Trash2 } from "@/components/icons";
import { Sheet } from "@/components/sheet";
import { Spinner } from "@/components/spinner";
import { kmText, rupiah } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import type { VisitView } from "@/lib/service/types";
import { dateText } from "@/lib/service/ui";

export function HistoryList({ visits, names }: { visits: VisitView[]; names: Record<string, string> }) {
  const router = useRouter();
  const [target, setTarget] = useState<VisitView | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function confirmDelete() {
    if (!target) return;
    setError("");
    start(async () => {
      let r;
      try {
        r = await deleteVisit(target.id);
      } catch {
        haptic("warn");
        return setError("Tidak ada koneksi. Coba lagi saat sinyal kembali.");
      }
      if (!r.ok) { haptic("warn"); return setError(r.error); }
      haptic("success");
      setTarget(null);
      router.refresh();
    });
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {visits.map((v) => (
          <li key={v.id} className="card flex flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-bold tracking-tight">{dateText(v.serviced_on)}</div>
                <div className="truncate text-xs text-muted">{names[v.vehicle_id] ?? "Kendaraan"} · {kmText(v.odometer_km)}</div>
              </div>
              <button
                aria-label={`Hapus servis ${dateText(v.serviced_on)}`} onClick={() => { haptic("tap"); setError(""); setTarget(v); }}
                className="-mr-2 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface-2"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
            {v.parts.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {v.parts.map((p) => <span key={p} className="pill bg-primary-soft text-primary">{p}</span>)}
              </div>
            )}
            {(v.cost > 0 || v.workshop) && (
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-muted">{v.workshop ?? ""}</span>
                {v.cost > 0 && <span className="font-semibold tabular-nums">{rupiah(v.cost)}</span>}
              </div>
            )}
            {v.note && <p className="text-xs text-muted">{v.note}</p>}
          </li>
        ))}
      </ul>

      <Sheet open={target !== null} onClose={() => setTarget(null)} title="Hapus riwayat servis?">
        <div className="flex flex-col gap-3 pb-2">
          <p className="text-sm text-muted">
            Servis {target ? dateText(target.serviced_on) : ""} ({target?.parts.join(", ")}) akan dihapus dan jadwal part terkait dihitung ulang dari servis sebelumnya. Km kendaraan tidak berubah.
          </p>
          {error && <p role="alert" className="rounded-2xl bg-danger-bg p-3 text-sm text-danger">{error}</p>}
          <button className="btn-primary min-h-14 bg-danger text-base text-white" onClick={confirmDelete} disabled={pending}>
            {pending ? <><Spinner /> Menghapus…</> : "Ya, hapus"}
          </button>
          <button className="btn-ghost" onClick={() => setTarget(null)}>Batal</button>
        </div>
      </Sheet>
    </>
  );
}
