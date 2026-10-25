import { addCategory, archiveCategory } from "@/app/actions/plan";
import { CategoryIcon } from "@/components/category-icon";
import { ConfirmButton } from "@/components/confirm-button";
import { Field } from "@/components/field";
import { Check, Plus, Trash2 } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { getCtx } from "@/lib/ctx";
import { CategoryEdit } from "../category-edit";

export const metadata = { title: "Kelola kategori" };

const ERRORS: Record<string, string> = { nama: "Isi nama kategori." };

export default async function KategoriPage({ searchParams }: { searchParams: Promise<{ tersimpan?: string; err?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await getCtx();
  const { data } = await supabase.from("category").select("id, name, icon, kind, lump_sum").eq("active", true).order("sort_order");
  const categories = (data ?? []) as { id: string; name: string; icon: string; kind: "daily" | "fixed"; lump_sum: boolean }[];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Kelola kategori" subtitle="Tambah, ubah, atau hapus" back="/rencana" />
      {sp.tersimpan && (
        <p role="status" className="animate-pop flex items-center gap-2 rounded-2xl bg-ok-bg p-3.5 text-sm font-medium text-ok">
          <Check className="h-4 w-4" aria-hidden /> Tersimpan
        </p>
      )}
      {sp.err && ERRORS[sp.err] && <p role="alert" className="rounded-2xl bg-danger-bg p-3.5 text-sm text-danger">{ERRORS[sp.err]}</p>}

      <p className="text-sm text-muted">
        Kategori = kelompok pengeluaran, mis. Makan atau Listrik. Kategori yang dihapus hilang dari daftar, tapi catatan lamanya tetap tersimpan.
      </p>

      <ul className="card divide-y divide-border p-0">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center gap-2 px-4 py-2.5">
            <CategoryIcon icon={c.icon} size="sm" />
            <span className="min-w-0 flex-1 pl-1">
              <span className="block text-base font-semibold">{c.name}</span>
              <span className="block text-sm text-muted">{c.kind === "fixed" ? "Tagihan bulanan" : c.lump_sum ? "Dibayar sekaligus" : "Sehari-hari"}</span>
            </span>
            <CategoryEdit id={c.id} name={c.name} icon={c.icon} />
            <form action={archiveCategory}>
              <input type="hidden" name="id" value={c.id} />
              <ConfirmButton
                aria-label={`Hapus kategori ${c.name}`} title={`Hapus kategori ${c.name}?`} confirmLabel="Ya, hapus kategori"
                message={<>{c.name} tidak muncul lagi di pilihan kategori. Catatan pengeluaran lamanya tetap tersimpan.</>}
                className="flex h-11 w-11 items-center justify-center rounded-full text-danger hover:bg-surface-2"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </ConfirmButton>
            </form>
          </li>
        ))}
      </ul>

      <section aria-labelledby="tambah-h" className="card flex flex-col gap-3 p-4">
        <h2 id="tambah-h" className="text-[17px] font-bold tracking-tight">Tambah kategori</h2>
        <form action={addCategory} className="grid grid-cols-[5rem_1fr] gap-3">
          <Field label="Ikon">
            <input name="icon" className="input text-center text-xl" placeholder="🍽️" maxLength={4} />
          </Field>
          <Field label="Nama kategori">
            <input name="name" required className="input" placeholder="mis. Makan" maxLength={30} />
          </Field>
          <Field label="Jenis" className="col-span-2">
            <select name="kind" className="input" defaultValue="daily">
              <option value="daily">Sehari-hari: jumlah berubah-ubah (makan, bensin)</option>
              <option value="fixed">Tagihan bulanan: jumlah tetap (listrik, internet)</option>
            </select>
          </Field>
          <label className="col-span-2 flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" name="lump_sum" className="h-5 w-5 accent-[var(--primary)]" />
            Dibayar sekaligus sekali sebulan (mis. belanja bulanan)
          </label>
          <SubmitButton pendingLabel="Menambah…" className="btn-primary col-span-2"><Plus className="h-4 w-4" aria-hidden /> Tambah kategori</SubmitButton>
        </form>
      </section>
    </div>
  );
}
