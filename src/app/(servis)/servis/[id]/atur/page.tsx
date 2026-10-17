import { notFound } from "next/navigation";
import { archivePart, archiveVehicle, savePart, updateVehicle } from "@/app/actions/service";
import { Check, Plus, Trash2 } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { getCtx } from "@/lib/ctx";
import { todayISO } from "@/lib/date";
import { loadServiceOverview } from "@/lib/server/service";

export const metadata = { title: "Atur kendaraan" };

const ERRORS: Record<string, string> = {
  nama: "Isi nama part.",
  interval: "Part butuh interval km atau bulan (boleh keduanya).",
};

export default async function AturPage({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ tersimpan?: string; err?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await getCtx();
  const { vehicles } = await loadServiceOverview(supabase, todayISO());
  const o = vehicles.find((v) => v.vehicle.id === id);
  if (!o) notFound();
  const { vehicle, parts } = o;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Atur kendaraan" subtitle={vehicle.name} back={`/servis/${id}`} />
      {sp.tersimpan && (
        <p role="status" className="animate-pop flex items-center gap-2 rounded-2xl bg-ok-bg p-3.5 text-sm font-medium text-ok">
          <Check className="h-4 w-4" aria-hidden /> Tersimpan
        </p>
      )}
      {sp.err && ERRORS[sp.err] && <p role="alert" className="rounded-2xl bg-danger-bg p-3.5 text-sm text-danger">{ERRORS[sp.err]}</p>}

      <form action={updateVehicle} className="card flex flex-col gap-4 p-5" aria-label="Data kendaraan">
        <input type="hidden" name="id" value={id} />
        <div>
          <label className="label" htmlFor="nama">Nama</label>
          <input id="nama" name="name" required maxLength={40} className="input" defaultValue={vehicle.name} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="plat">Plat</label>
            <input id="plat" name="plate" maxLength={12} className="input uppercase" defaultValue={vehicle.plate ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="remind">Ingatkan update km tiap</label>
            <div className="relative">
              <input id="remind" name="remind_days" inputMode="numeric" className="input pr-14" defaultValue={vehicle.remind_days} />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">hari</span>
            </div>
          </div>
        </div>
        <SubmitButton className="btn-primary" pendingLabel="Menyimpan…">Simpan</SubmitButton>
      </form>

      <section aria-label="Interval part">
        <h2 className="section-title">Interval servis tiap part</h2>
        <p className="-mt-1 mb-3 text-xs text-muted">Isi km, bulan, atau keduanya (mana yang tercapai lebih dulu). Perubahan langsung dipakai untuk menghitung jadwal.</p>
        <ul className="flex flex-col gap-2.5">
          {parts.map((p) => (
            <li key={p.id} className="card p-3.5">
              <form action={savePart} className="grid grid-cols-6 gap-2">
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="vehicle_id" value={id} />
                <input name="name" required maxLength={40} className="input col-span-6 font-semibold" defaultValue={p.name} aria-label="Nama part" />
                <div className="col-span-3">
                  <label className="label" htmlFor={`k-${p.id}`}>Interval km</label>
                  <input id={`k-${p.id}`} name="interval_km" inputMode="numeric" className="input" defaultValue={p.interval_km ?? ""} placeholder="—" />
                </div>
                <div className="col-span-3">
                  <label className="label" htmlFor={`m-${p.id}`}>Interval bulan</label>
                  <input id={`m-${p.id}`} name="interval_months" inputMode="numeric" className="input" defaultValue={p.interval_months ?? ""} placeholder="—" />
                </div>
                <SubmitButton className="btn-soft col-span-6" pendingLabel="Menyimpan…">Simpan perubahan</SubmitButton>
              </form>
              <form action={archivePart} className="mt-1 flex justify-end">
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="vehicle_id" value={id} />
                <SubmitButton className="flex min-h-10 items-center gap-1.5 px-2 text-xs font-semibold text-muted hover:text-danger" pendingLabel="Mengarsipkan…" aria-label={`Arsipkan ${p.name}`}>
                  <Trash2 className="h-3.5 w-3.5" aria-hidden /> Arsipkan part
                </SubmitButton>
              </form>
            </li>
          ))}
        </ul>

        <form action={savePart} className="card mt-3 grid grid-cols-6 gap-2 p-3.5" aria-label="Tambah part">
          <input type="hidden" name="vehicle_id" value={id} />
          <p className="col-span-6 text-sm font-semibold">Tambah part baru</p>
          <input name="name" required maxLength={40} className="input col-span-6" placeholder="Nama part, mis. Kampas kopling" aria-label="Nama part baru" />
          <input name="interval_km" inputMode="numeric" className="input col-span-3" placeholder="Interval km" aria-label="Interval km" />
          <input name="interval_months" inputMode="numeric" className="input col-span-3" placeholder="Interval bulan" aria-label="Interval bulan" />
          <SubmitButton className="btn-primary col-span-6" pendingLabel="Menambah…"><Plus className="h-4 w-4" aria-hidden /> Tambah part</SubmitButton>
        </form>
      </section>

      <details className="card p-0">
        <summary className="flex min-h-12 cursor-pointer items-center px-4 text-sm font-semibold text-danger">Arsipkan kendaraan ini</summary>
        <form action={archiveVehicle} className="flex flex-col gap-3 px-4 pb-4">
          <input type="hidden" name="id" value={id} />
          <p className="text-sm text-muted">Kendaraan disembunyikan dari daftar. Riwayat servisnya tetap tersimpan di database.</p>
          <SubmitButton className="btn-primary bg-danger text-white" pendingLabel="Mengarsipkan…">Ya, arsipkan {vehicle.name}</SubmitButton>
        </form>
      </details>
    </div>
  );
}
