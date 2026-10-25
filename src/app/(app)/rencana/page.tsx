import { addCategory, addIncome, archiveCategory, deleteIncome } from "@/app/actions/plan";
import { CategoryIcon } from "@/components/category-icon";
import { ConfirmButton } from "@/components/confirm-button";
import { Field } from "@/components/field";
import { AlertTriangle, Check, Plus, Trash2 } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { getCtx } from "@/lib/ctx";
import { todayISO } from "@/lib/date";
import { rupiah } from "@/lib/format";
import { isOverdue, periodLabel, shortDate } from "@/lib/period";
import { loadPeriodContext } from "@/lib/server/period";
import { AllocationForm, type AllocCategory } from "./allocation-form";
import { CategoryEdit } from "./category-edit";
import { SubmitButton } from "@/components/submit-button";

export const metadata = { title: "Atur anggaran" };

const ERRORS: Record<string, string> = {
  nominal: "Isi nominal pemasukan.",
  periode: "Gagal menyimpan gajian baru, coba lagi.",
  nama: "Isi nama kategori.",
};

export default async function RencanaPage({
  searchParams,
}: { searchParams: Promise<{ tersimpan?: string; err?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await getCtx();
  const today = todayISO();
  const { period, periodId, budgets } = await loadPeriodContext(supabase, today);

  const [cats, incomes] = await Promise.all([
    supabase.from("category").select("id, name, icon, kind, lump_sum, due_day, sort_order").eq("active", true).order("sort_order"),
    periodId
      ? supabase.from("income").select("id, amount, label, received_on").eq("period_id", periodId).order("received_on")
      : Promise.resolve({ data: [] }),
  ]);

  const categories: AllocCategory[] = (cats.data ?? []).map((c) => ({
    id: c.id, name: c.name, icon: c.icon, kind: c.kind, lump_sum: c.lump_sum,
    due_day: c.due_day, amount: budgets.get(c.id) ?? 0,
  }));
  const incomeRows = (incomes.data ?? []) as { id: string; amount: number; label: string; received_on: string }[];
  const incomeTotal = incomeRows.reduce((s, r) => s + Number(r.amount), 0);
  const overdue = isOverdue(period, today);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Atur anggaran" subtitle={periodLabel(period)} back="/" />

      <section aria-labelledby="cara-h" className="card flex flex-col gap-3 p-5">
        <h2 id="cara-h" className="text-base font-semibold tracking-tight">Cara kerjanya</h2>
        <ol className="flex flex-col gap-2.5 text-[15px]">
          {[
            <><b>Catat gajian</b> yang masuk (langkah 1 di bawah).</>,
            <><b>Bagi uangnya</b> ke tiap kategori, mis. makan Rp 2 juta, listrik Rp 450 ribu (langkah 2).</>,
            <>Selama sebulan, <b>pantau sisanya di Beranda</b>. Kamu bisa kembali ke sini kapan saja untuk mengubah angkanya.</>,
          ].map((t, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary" aria-hidden>{i + 1}</span>
              <span className="pt-0.5">{t}</span>
            </li>
          ))}
        </ol>
      </section>

      {sp.tersimpan && (
        <p role="status" className="animate-pop flex items-center gap-2 rounded-2xl bg-ok-bg p-3.5 text-sm font-medium text-ok">
          <Check className="h-4 w-4" aria-hidden /> Tersimpan
        </p>
      )}
      {sp.err && ERRORS[sp.err] && (
        <p role="alert" className="rounded-2xl bg-danger-bg p-3.5 text-sm text-danger">{ERRORS[sp.err]}</p>
      )}
      {overdue && (
        <p className="flex items-start gap-3 rounded-2xl bg-warn-bg p-3.5 text-sm text-warn">
          <AlertTriangle className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden />
          Sudah lebih dari sebulan sejak gajian terakhir. Catat gajian baru di bawah supaya hitungan anggaran dimulai lagi.
        </p>
      )}

      <section aria-label="Pemasukan" className="card flex flex-col gap-4 p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold tracking-tight">1. Catat gajian / pemasukan</h2>
          {incomeTotal > 0 && <span className="text-lg font-extrabold tabular-nums">{rupiah(incomeTotal)}</span>}
        </div>

        {incomeRows.length > 0 && (
          <ul className="flex flex-col divide-y divide-border">
            {incomeRows.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{r.label}</div>
                  <div className="text-xs text-muted">{shortDate(r.received_on)}</div>
                </div>
                <span className="font-semibold tabular-nums">{rupiah(Number(r.amount))}</span>
                <form action={deleteIncome}>
                  <input type="hidden" name="id" value={r.id} />
                  <ConfirmButton
                    aria-label={`Hapus ${r.label}`} title={`Hapus pemasukan ${r.label}?`}
                    message={<>Pemasukan {r.label} sebesar {rupiah(Number(r.amount))} akan dihapus dari periode ini.</>}
                    className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-surface-2"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </ConfirmButton>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form action={addIncome} className="grid grid-cols-2 gap-3">
          <Field label="Jumlah uang (Rp)">
            <input name="amount" required inputMode="numeric" className="input" placeholder="mis. 10000000" />
          </Field>
          <Field label="Dari mana" optional>
            <input name="label" className="input" placeholder="Gaji" maxLength={40} />
          </Field>
          <Field label="Tanggal diterima" className="col-span-2">
            <input name="received_on" type="date" defaultValue={today} max={today} className="input" />
          </Field>
          {period.explicit && (
            <label className="col-span-2 flex min-h-11 items-center gap-3 rounded-xl bg-surface-2 px-3.5 text-sm">
              <input type="checkbox" name="new_period" value="1" className="h-5 w-5 accent-[var(--primary)]" />
              <span><b>Ini gajian baru</b> · hitungan bulan anggaran dimulai lagi dari tanggal ini</span>
            </label>
          )}
          <SubmitButton pendingLabel="Menyimpan…" className="btn-primary col-span-2">
            <Plus className="h-4 w-4" aria-hidden /> {period.explicit ? "Tambah pemasukan" : "Catat gajian & mulai periode"}
          </SubmitButton>
        </form>
        {!period.explicit && (
          <p className="text-xs text-muted">
            Hitungan anggaran dimulai dari tanggal gajian sampai gajian berikutnya. Sebelum gajian dicatat, aplikasi memakai tanggal 1 sampai akhir bulan.
          </p>
        )}
      </section>

      <section aria-labelledby="bagi-h">
        <h2 id="bagi-h" className="section-title">2. Bagi uang ke tiap kategori</h2>
        <AllocationForm categories={categories} incomeTotal={incomeTotal} />
      </section>

      <section aria-labelledby="kelola-h" className="card flex flex-col gap-4 p-5">
        <div>
          <h2 id="kelola-h" className="text-base font-semibold tracking-tight">Tambah atau hapus kategori</h2>
          <p className="text-sm text-muted">Kategori = kelompok pengeluaran, mis. Makan atau Listrik. Kategori yang dihapus hilang dari daftar, tapi catatan lamanya tetap tersimpan.</p>
        </div>
        <ul className="flex flex-col divide-y divide-border">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-2.5">
              <CategoryIcon icon={c.icon} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{c.name}</span>
                <span className="block text-sm text-muted">{c.kind === "fixed" ? "Tagihan bulanan" : c.lump_sum ? "Dibayar sekaligus" : "Sehari-hari"}</span>
              </span>
              <CategoryEdit id={c.id} name={c.name} icon={c.icon} />
              <form action={archiveCategory}>
                <input type="hidden" name="id" value={c.id} />
                <ConfirmButton
                  aria-label={`Hapus kategori ${c.name}`} title={`Hapus kategori ${c.name}?`} confirmLabel="Ya, hapus kategori"
                  message={<>{c.name} tidak muncul lagi di pilihan kategori. Catatan pengeluaran lamanya tetap tersimpan.</>}
                  className="min-h-11 px-2 text-sm font-semibold text-danger"
                >
                  Hapus
                </ConfirmButton>
              </form>
            </li>
          ))}
        </ul>
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
          <SubmitButton pendingLabel="Menambah…" className="btn-soft col-span-2"><Plus className="h-4 w-4" aria-hidden /> Tambah kategori</SubmitButton>
        </form>
      </section>
    </div>
  );
}
