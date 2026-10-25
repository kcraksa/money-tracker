"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { recordService } from "@/app/actions/service";
import { Check } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { Spinner } from "@/components/spinner";
import { haptic } from "@/lib/haptics";
import { STATUS_UI, KIND_ICON } from "@/lib/service/ui";
import type { Status } from "@/lib/service/logic";

export type FormVehicle = {
  id: string; name: string; kind: "car" | "motorcycle"; km: number;
  parts: { id: string; name: string; status: Status; hint: string }[];
};

const digits = (v: string) => v.replace(/\D/g, "");
const urgent = (v: FormVehicle) => new Set(v.parts.filter((p) => p.status === "overdue" || p.status === "soon").map((p) => p.id));

export function ServiceForm({ vehicles, defaultId, today }: { vehicles: FormVehicle[]; defaultId: string; today: string }) {
  const router = useRouter();
  const first = vehicles.find((v) => v.id === defaultId) ?? vehicles[0];
  const [vehicleId, setVehicleId] = useState(first.id);
  const [date, setDate] = useState(today);
  const [km, setKm] = useState(String(first.km));
  // Part yang sudah mendekati/lewat jadwal langsung tercentang; sisanya dipilih sendiri.
  const [picked, setPicked] = useState<Set<string>>(() => urgent(first));
  const [cost, setCost] = useState("");
  const [workshop, setWorkshop] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const vehicle = vehicles.find((v) => v.id === vehicleId) ?? first;

  function changeVehicle(id: string) {
    const v = vehicles.find((x) => x.id === id)!;
    setVehicleId(id);
    setKm(String(v.km));
    setPicked(urgent(v));
    setError("");
  }
  function toggle(id: string) {
    haptic("tap");
    setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (picked.size === 0) return setError("Pilih minimal satu komponen yang diservis.");
    if (km === "") return setError("Isi km saat servis.");
    start(async () => {
      let r;
      try {
        r = await recordService({
          vehicleId, servicedOn: date, km: Number(km), partIds: [...picked],
          cost: cost ? Number(cost) : null, workshop, note,
        });
      } catch {
        haptic("warn");
        return setError("Tidak ada koneksi. Coba lagi saat sinyal kembali.");
      }
      if (!r.ok) { haptic("warn"); return setError(r.error); }
      haptic("success");
      router.push(`/servis/${vehicleId}?tersimpan=1`);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <PageHeader title="Catat servis" subtitle="Komponen apa saja yang diservis?" back={`/servis/${vehicleId}`} />

      <section className="card flex flex-col gap-4 p-5" aria-label="Data servis">
        {vehicles.length > 1 && (
          <div>
            <label className="label" htmlFor="kendaraan">Kendaraan</label>
            <select id="kendaraan" className="input font-semibold" value={vehicleId} onChange={(e) => changeVehicle(e.target.value)}>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{KIND_ICON[v.kind]} {v.name}</option>)}
            </select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="tgl">Tanggal servis</label>
            <input id="tgl" type="date" max={today} className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="kmservis">Km saat servis</label>
            <input id="kmservis" className="input font-semibold tabular-nums" inputMode="numeric" value={km ? Number(km).toLocaleString("id-ID") : ""} onChange={(e) => setKm(digits(e.target.value).slice(0, 7))} />
          </div>
        </div>
      </section>

      <section aria-labelledby="diservis-h">
        <h2 id="diservis-h" className="section-title"><span>Komponen yang diservis</span><span className="text-xs font-medium text-muted">{picked.size} dipilih</span></h2>
        <ul className="card divide-y divide-border p-0">
          {vehicle.parts.map((p) => {
            const on = picked.has(p.id);
            const ui = STATUS_UI[p.status];
            return (
              <li key={p.id}>
                <button type="button" role="checkbox" aria-checked={on} onClick={() => toggle(p.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition ${on ? "border-primary bg-primary text-primary-fg" : "border-control"}`}>
                    {on && <Check className="h-4 w-4" strokeWidth={3} aria-hidden />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{p.name}</span>
                    <span className={`block truncate text-xs ${ui.text}`}>{p.hint}</span>
                  </span>
                  {(p.status === "overdue" || p.status === "soon") && <span className={`pill shrink-0 ${ui.pill}`}>{ui.label}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card flex flex-col gap-4 p-5" aria-label="Detail tambahan">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="biaya">Biaya <span className="font-normal text-muted">(boleh kosong)</span></label>
            <input id="biaya" className="input tabular-nums" inputMode="numeric" placeholder="Rp 0" value={cost ? Number(cost).toLocaleString("id-ID") : ""} onChange={(e) => setCost(digits(e.target.value).slice(0, 10))} />
          </div>
          <div>
            <label className="label" htmlFor="bengkel">Bengkel <span className="font-normal text-muted">(boleh kosong)</span></label>
            <input id="bengkel" className="input" maxLength={60} value={workshop} onChange={(e) => setWorkshop(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="catatan">Catatan <span className="font-normal text-muted">(boleh kosong)</span></label>
          <input id="catatan" className="input" maxLength={200} placeholder="mis. ganti oli sintetis" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </section>

      {error && <p role="alert" className="rounded-2xl bg-danger-bg p-3.5 text-sm text-danger">{error}</p>}
      <button className="btn-primary min-h-14 text-base" disabled={pending || picked.size === 0}>
        {pending ? <><Spinner /> Menyimpan…</> : `Simpan servis${picked.size ? ` (${picked.size} komponen)` : ""}`}
      </button>
    </form>
  );
}
