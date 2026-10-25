import { notFound } from "next/navigation";
import { archivePart, archiveVehicle, savePart, updateVehicle } from "@/app/actions/service";
import { ConfirmButton } from "@/components/confirm-button";
import { Field } from "@/components/field";
import { Check, Plus, Trash2 } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { getCtx } from "@/lib/ctx";
import { todayISO } from "@/lib/date";
import { loadServiceOverview } from "@/lib/server/service";

export const metadata = { title: "Atur kendaraan" };

const ERRORS: Record<string, string> = {
  nama: "Isi nama komponen.",
  interval: "Isi kapan komponen perlu diganti: tiap berapa km, tiap berapa bulan, atau keduanya.",
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
          <label className="label" htmlFor="nama">Nama kendaraan</label>
          <input id="nama" name="name" required maxLength={40} className="input" defaultValue={vehicle.name} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="plat">Plat nomor <span className="font-normal text-muted">(boleh kosong)</span></label>
            <input id="plat" name="plate" maxLength={12} className="input uppercase" defaultValue={vehicle.plate ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="remind">Ingatkan isi km tiap</label>
            <div className="relative">
              <input id="remind" name="remind_days" inputMode="numeric" className="input pr-14" defaultValue={vehicle.remind_days} />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">hari</span>
            </div>
          </div>
        </div>
        <SubmitButton className="btn-primary" pendingLabel="Menyimpan…">Simpan</SubmitButton>
      </form>

      <section aria-labelledby="komponen-h">
        <h2 id="komponen-h" className="section-title">Kapan tiap komponen diganti</h2>
        <p className="-mt-1 mb-3 text-sm text-muted">Isi tiap berapa km, tiap berapa bulan, atau keduanya. Mana yang lebih dulu tercapai, itu yang dipakai untuk pengingat.</p>
        <ul className="flex flex-col gap-2.5">
          {parts.map((p) => (
            <li key={p.id} className="card p-3.5">
              <form action={savePart} className="grid grid-cols-2 gap-3">
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="vehicle_id" value={id} />
                <Field label="Nama komponen" className="col-span-2">
                  <input name="name" required maxLength={40} className="input font-semibold" defaultValue={p.name} />
                </Field>
                <Field label="Ganti tiap (km)">
                  <input name="interval_km" inputMode="numeric" className="input" defaultValue={p.interval_km ?? ""} placeholder="mis. 3000" />
                </Field>
                <Field label="Atau tiap (bulan)">
                  <input name="interval_months" inputMode="numeric" className="input" defaultValue={p.interval_months ?? ""} placeholder="mis. 4" />
                </Field>
                <SubmitButton className="btn-soft col-span-2" pendingLabel="Menyimpan…">Simpan perubahan</SubmitButton>
              </form>
              <form action={archivePart} className="mt-1 flex justify-end">
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="vehicle_id" value={id} />
                <ConfirmButton
                  title={`Hapus ${p.name}?`} confirmLabel="Ya, hapus komponen"
                  message={<>{p.name} tidak lagi muncul di jadwal servis. Riwayat servis yang sudah dicatat tetap tersimpan.</>}
                  className="flex min-h-11 items-center gap-1.5 px-2 text-sm font-semibold text-danger"
                >
                  <Trash2 className="h-4 w-4" aria-hidden /> Hapus komponen
                </ConfirmButton>
              </form>
            </li>
          ))}
        </ul>

        <form action={savePart} className="card mt-3 grid grid-cols-2 gap-3 p-3.5" aria-labelledby="tambah-komponen-h">
          <input type="hidden" name="vehicle_id" value={id} />
          <h3 id="tambah-komponen-h" className="col-span-2 font-semibold">Tambah komponen baru</h3>
          <Field label="Nama komponen" className="col-span-2">
            <input name="name" required maxLength={40} className="input" placeholder="mis. Kampas kopling" />
          </Field>
          <Field label="Ganti tiap (km)">
            <input name="interval_km" inputMode="numeric" className="input" placeholder="mis. 10000" />
          </Field>
          <Field label="Atau tiap (bulan)">
            <input name="interval_months" inputMode="numeric" className="input" placeholder="mis. 12" />
          </Field>
          <SubmitButton className="btn-primary col-span-2" pendingLabel="Menambah…"><Plus className="h-4 w-4" aria-hidden /> Tambah komponen</SubmitButton>
        </form>
      </section>

      <form action={archiveVehicle} className="card flex flex-col gap-3 p-4">
        <input type="hidden" name="id" value={id} />
        <h2 className="font-semibold">Hapus kendaraan</h2>
        <p className="text-sm text-muted">Kendaraan disembunyikan dari daftar. Riwayat servisnya tetap tersimpan.</p>
        <ConfirmButton
          title={`Hapus ${vehicle.name}?`} confirmLabel={`Ya, hapus ${vehicle.name}`}
          message={<>{vehicle.name} tidak akan muncul lagi di daftar kendaraan. Riwayat servisnya tetap tersimpan.</>}
          className="btn-soft text-danger"
        >
          <Trash2 className="h-4 w-4" aria-hidden /> Hapus {vehicle.name}
        </ConfirmButton>
      </form>
    </div>
  );
}
