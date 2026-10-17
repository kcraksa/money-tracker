import { addCategory, addIncome, archiveCategory, deleteIncome } from "@/app/actions/plan";
import { CategoryIcon } from "@/components/category-icon";
import { AlertTriangle, Check, Plus, Trash2 } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { getCtx } from "@/lib/ctx";
import { todayISO } from "@/lib/date";
import { rupiah } from "@/lib/format";
import { isOverdue, periodLabel, shortDate } from "@/lib/period";
import { loadPeriodContext } from "@/lib/server/period";
import { AllocationForm, type AllocCategory } from "./allocation-form";

export const metadata = { title: "Rencana gajian" };

const ERRORS: Record<string, string> = {
  nominal: "Isi nominal pemasukan.",
  periode: "Periode gagal dibuat, coba lagi.",
  nama: "Isi nama pos anggaran.",
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
      <PageHeader title="Rencana gajian" subtitle={periodLabel(period)} back="/" />

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
          Periode ini sudah melewati sebulan. Catat gajian baru di bawah untuk memulai periode berikutnya.
        </p>
      )}

      <section aria-label="Pemasukan" className="card flex flex-col gap-4 p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold tracking-tight">Pemasukan</h2>
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
                  <button aria-label={`Hapus ${r.label}`} className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-surface-2">
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form action={addIncome} className="grid grid-cols-2 gap-2">
          <input name="amount" required inputMode="numeric" className="input" placeholder="Nominal, mis. 10000000" aria-label="Nominal pemasukan" />
          <input name="label" className="input" placeholder="Keterangan (Gaji)" aria-label="Keterangan" maxLength={40} />
          <div className="col-span-2">
            <label className="label" htmlFor="received_on">Tanggal diterima</label>
            <input id="received_on" name="received_on" type="date" defaultValue={today} max={today} className="input" />
          </div>
          {period.explicit && (
            <label className="col-span-2 flex min-h-11 items-center gap-3 rounded-xl bg-surface-2 px-3.5 text-sm">
              <input type="checkbox" name="new_period" value="1" className="h-5 w-5 accent-[var(--primary)]" />
              <span><b>Gajian baru</b> · mulai periode baru di tanggal ini</span>
            </label>
          )}
          <button className="btn-primary col-span-2">
            <Plus className="h-4 w-4" aria-hidden /> {period.explicit ? "Tambah pemasukan" : "Catat gajian & mulai periode"}
          </button>
        </form>
        {!period.explicit && (
          <p className="text-xs text-muted">
            Periode anggaran dimulai dari tanggal gajian dan berjalan sampai gajian berikutnya. Sebelum ada gajian tercatat, aplikasi memakai bulan kalender.
          </p>
        )}
      </section>

      <section aria-label="Alokasi">
        <h2 className="section-title">Bagi ke tiap pos</h2>
        <AllocationForm categories={categories} incomeTotal={incomeTotal} />
      </section>

      <section aria-label="Kelola pos" className="card flex flex-col gap-4 p-5">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Kelola pos anggaran</h2>
          <p className="text-xs text-muted">Tambah pos baru (mis. Makan). Pos yang diarsipkan hilang dari daftar, riwayatnya tetap tersimpan.</p>
        </div>
        <ul className="flex flex-col divide-y divide-border">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-2.5">
              <CategoryIcon icon={c.icon} size="sm" />
              <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
              <span className="pill bg-surface-2 text-muted">{c.kind === "fixed" ? "Tagihan" : c.lump_sum ? "Sekali jalan" : "Harian"}</span>
              <form action={archiveCategory}>
                <input type="hidden" name="id" value={c.id} />
                <button className="min-h-10 px-2 text-xs font-semibold text-muted hover:text-danger" aria-label={`Arsipkan ${c.name}`}>Arsipkan</button>
              </form>
            </li>
          ))}
        </ul>
        <form action={addCategory} className="grid grid-cols-[4rem_1fr] gap-2">
          <input name="icon" className="input text-center text-xl" placeholder="🍽️" maxLength={4} aria-label="Emoji" />
          <input name="name" required className="input" placeholder="Nama pos, mis. Makan" maxLength={30} aria-label="Nama pos" />
          <select name="kind" className="input col-span-2" defaultValue="daily" aria-label="Jenis pos">
            <option value="daily">Pengeluaran harian (ada budget & forecast)</option>
            <option value="fixed">Tagihan tetap (lunas / belum)</option>
          </select>
          <label className="col-span-2 flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" name="lump_sum" className="h-5 w-5 accent-[var(--primary)]" />
            Dibayar sekali jalan (tidak diproyeksi per hari)
          </label>
          <button className="btn-soft col-span-2"><Plus className="h-4 w-4" aria-hidden /> Tambah pos</button>
        </form>
      </section>
    </div>
  );
}
