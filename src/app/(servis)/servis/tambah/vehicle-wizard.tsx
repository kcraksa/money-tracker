"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addVehicle } from "@/app/actions/service";
import { Check, ChevronDown, Plus } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { Segmented } from "@/components/segmented";
import { Spinner } from "@/components/spinner";
import { haptic } from "@/lib/haptics";
import { TEMPLATES, type VehicleKind } from "@/lib/service/templates";
import { intervalText } from "@/lib/service/ui";

type Row = { key: string; on: boolean; name: string; intervalKm: string; intervalMonths: string; lastKm: string; lastOn: string; open: boolean };

const fromTemplate = (kind: VehicleKind): Row[] =>
  TEMPLATES[kind].map((t, i) => ({
    key: `${kind}-${i}`, on: true, name: t.name, intervalKm: t.intervalKm ? String(t.intervalKm) : "",
    intervalMonths: t.intervalMonths ? String(t.intervalMonths) : "", lastKm: "", lastOn: "", open: false,
  }));

const digits = (v: string) => v.replace(/\D/g, "");

export function VehicleWizard({ today }: { today: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<VehicleKind>("car");
  const [name, setName] = useState("");
  const [plate, setPlate] = useState("");
  const [km, setKm] = useState("");
  const [rows, setRows] = useState<Row[]>(() => fromTemplate("car"));
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function pickKind(k: VehicleKind) {
    haptic("select");
    setKind(k);
    setRows(fromTemplate(k)); // daftar part menyesuaikan jenis kendaraan
  }
  const patch = (key: string, p: Partial<Row>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...p } : x)));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Isi nama kendaraan.");
    if (km === "") return setError("Isi km di odometer saat ini.");
    const chosen = rows.filter((r) => r.on);
    if (chosen.length === 0) return setError("Pilih minimal satu part.");
    for (const r of chosen) {
      if (!r.name.trim()) return setError("Ada part tanpa nama.");
      if (!r.intervalKm && !r.intervalMonths) return setError(`Part "${r.name}" butuh interval km atau bulan.`);
    }
    start(async () => {
      let res;
      try {
        res = await addVehicle({
        name, kind, plate, odometerKm: Number(km),
        parts: chosen.map((r) => ({
          name: r.name, intervalKm: r.intervalKm ? Number(r.intervalKm) : null,
          intervalMonths: r.intervalMonths ? Number(r.intervalMonths) : null,
          lastKm: r.lastKm ? Number(r.lastKm) : null, lastOn: r.lastOn || null,
        })),
        });
      } catch {
        haptic("warn");
        return setError("Tidak ada koneksi. Coba lagi saat sinyal kembali.");
      }
      if (!res.ok) { haptic("warn"); return setError(res.error); }
      haptic("success");
      router.push(`/servis/${res.id}`);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <PageHeader title="Tambah kendaraan" subtitle="Isi sekali, pengingat jalan sendiri" back="/servis" />

      <section className="card flex flex-col gap-4 p-5" aria-label="Data kendaraan">
        <Segmented<VehicleKind>
          label="Jenis kendaraan" value={kind} onSelect={pickKind}
          items={[{ key: "car", label: <>🚗 Mobil</> }, { key: "motorcycle", label: <>🏍️ Motor</> }]}
        />
        <div>
          <label className="label" htmlFor="nama">Nama kendaraan</label>
          <input id="nama" className="input" placeholder={kind === "car" ? "mis. Avanza Hitam" : "mis. Vario Merah"} maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="plat">Plat (opsional)</label>
            <input id="plat" className="input uppercase" placeholder="B 1234 XYZ" maxLength={12} value={plate} onChange={(e) => setPlate(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="km">Km sekarang</label>
            <input id="km" className="input font-semibold tabular-nums" inputMode="numeric" placeholder="0" value={km ? Number(km).toLocaleString("id-ID") : ""} onChange={(e) => setKm(digits(e.target.value).slice(0, 7))} />
          </div>
        </div>
      </section>

      <section aria-label="Part">
        <h2 className="section-title">Part yang diservis berkala</h2>
        <p className="-mt-1 mb-3 text-xs text-muted">
          Interval di bawah adalah perkiraan umum, sesuaikan dengan buku servis kendaraanmu. Isi &quot;terakhir diganti&quot; supaya pengingat langsung akurat; boleh dikosongkan dan dicatat belakangan.
        </p>
        <ul className="flex flex-col gap-2.5">
          {rows.map((r) => (
            <li key={r.key} className={`card flex flex-col p-3.5 transition ${r.on ? "" : "opacity-60"}`}>
              <div className="flex items-center gap-3">
                <button
                  type="button" role="checkbox" aria-checked={r.on} aria-label={`Pakai ${r.name}`}
                  onClick={() => patch(r.key, { on: !r.on })}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition ${r.on ? "border-primary bg-primary text-primary-fg" : "border-border"}`}
                >
                  {r.on && <Check className="h-4 w-4" strokeWidth={3} aria-hidden />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{r.name || "Part baru"}</div>
                  <div className="truncate text-xs text-muted">
                    {intervalText(r.intervalKm ? Number(r.intervalKm) : null, r.intervalMonths ? Number(r.intervalMonths) : null)}
                    {r.lastKm ? ` · terakhir ${Number(r.lastKm).toLocaleString("id-ID")} km` : ""}
                  </div>
                </div>
                {r.on && (
                  <button type="button" aria-expanded={r.open} aria-label={`Ubah ${r.name}`} onClick={() => patch(r.key, { open: !r.open })}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-muted">
                    <ChevronDown className={`h-5 w-5 transition ${r.open ? "rotate-180" : ""}`} aria-hidden />
                  </button>
                )}
              </div>
              {r.on && r.open && (
                <div className="animate-pop mt-3 grid grid-cols-2 gap-2">
                  {r.key.startsWith("custom") && (
                    <input className="input col-span-2" placeholder="Nama part" maxLength={40} value={r.name} onChange={(e) => patch(r.key, { name: e.target.value })} aria-label="Nama part" />
                  )}
                  <div>
                    <label className="label" htmlFor={`ik-${r.key}`}>Interval (km)</label>
                    <input id={`ik-${r.key}`} className="input" inputMode="numeric" placeholder="mis. 10000" value={r.intervalKm} onChange={(e) => patch(r.key, { intervalKm: digits(e.target.value).slice(0, 6) })} />
                  </div>
                  <div>
                    <label className="label" htmlFor={`im-${r.key}`}>Interval (bulan)</label>
                    <input id={`im-${r.key}`} className="input" inputMode="numeric" placeholder="mis. 6" value={r.intervalMonths} onChange={(e) => patch(r.key, { intervalMonths: digits(e.target.value).slice(0, 3) })} />
                  </div>
                  <div>
                    <label className="label" htmlFor={`lk-${r.key}`}>Terakhir diganti (km)</label>
                    <input id={`lk-${r.key}`} className="input" inputMode="numeric" placeholder="opsional" value={r.lastKm} onChange={(e) => patch(r.key, { lastKm: digits(e.target.value).slice(0, 7) })} />
                  </div>
                  <div>
                    <label className="label" htmlFor={`lo-${r.key}`}>Tanggalnya</label>
                    <input id={`lo-${r.key}`} type="date" max={today} className="input" value={r.lastOn} onChange={(e) => patch(r.key, { lastOn: e.target.value })} />
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
        <button
          type="button" className="btn-soft mt-3 w-full border-dashed"
          onClick={() => setRows((r) => [...r, { key: `custom-${r.length}-${r.length}`, on: true, name: "", intervalKm: "", intervalMonths: "", lastKm: "", lastOn: "", open: true }])}
        >
          <Plus className="h-4 w-4" aria-hidden /> Part lainnya
        </button>
      </section>

      {error && <p role="alert" className="rounded-2xl bg-danger-bg p-3.5 text-sm text-danger">{error}</p>}
      <button className="btn-primary min-h-14 text-base" disabled={pending}>
        {pending ? <><Spinner /> Menyimpan…</> : "Simpan kendaraan"}
      </button>
    </form>
  );
}
