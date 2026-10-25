"use client";

import { useState } from "react";
import { addIncome, deleteIncome } from "@/app/actions/plan";
import { ConfirmButton } from "@/components/confirm-button";
import { Field } from "@/components/field";
import { Plus, Trash2 } from "@/components/icons";
import { Sheet } from "@/components/sheet";
import { SubmitButton } from "@/components/submit-button";
import { rupiah } from "@/lib/format";

export type IncomeItem = { id: string; label: string; amount: number; dateLabel: string };

/** Ringkasan uang masuk satu kartu; mencatat dan menghapus pemasukan dibuka di panel supaya halaman tetap pendek. */
export function IncomeCard({
  incomes, total, today, minDate, explicitPeriod,
}: { incomes: IncomeItem[]; total: number; today: string; minDate: string; explicitPeriod: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <section aria-labelledby="masuk-h" className="card flex items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <h2 id="masuk-h" className="text-sm text-muted">Uang masuk periode ini</h2>
          <div className="text-2xl font-extrabold tracking-tight tabular-nums">{total > 0 ? rupiah(total) : "Belum ada"}</div>
          {incomes.length > 0 && <div className="text-sm text-muted">{incomes.length} pemasukan</div>}
        </div>
        <button className={total > 0 ? "btn-soft shrink-0" : "btn-primary shrink-0"} onClick={() => setOpen(true)} aria-haspopup="dialog">
          {total > 0 ? "Tambah / ubah" : <><Plus className="h-4 w-4" aria-hidden /> Catat gajian</>}
        </button>
      </section>

      <Sheet open={open} onClose={() => setOpen(false)} title="Uang masuk">
        <div className="flex flex-col gap-5 pb-2">
          {incomes.length > 0 && (
            <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border px-4">
              {incomes.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-semibold">{r.label}</div>
                    <div className="text-sm text-muted">{r.dateLabel}</div>
                  </div>
                  <span className="text-base font-bold tabular-nums">{rupiah(r.amount)}</span>
                  <form action={deleteIncome}>
                    <input type="hidden" name="id" value={r.id} />
                    <ConfirmButton
                      aria-label={`Hapus ${r.label}`} title={`Hapus pemasukan ${r.label}?`}
                      message={<>Pemasukan {r.label} sebesar {rupiah(r.amount)} akan dihapus dari periode ini.</>}
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
            <Field label="Jumlah uang (Rp)" className="col-span-2">
              <input name="amount" required autoFocus inputMode="numeric" className="input text-lg font-bold" placeholder="mis. 10000000" />
            </Field>
            <Field label="Dari mana" optional>
              <input name="label" className="input" placeholder="Gaji" maxLength={40} />
            </Field>
            <Field label="Tanggal diterima">
              <input name="received_on" type="date" defaultValue={today} min={minDate} max={today} className="input" />
            </Field>
            {explicitPeriod && (
              <label className="col-span-2 flex min-h-11 items-center gap-3 rounded-xl bg-surface-2 px-3.5 text-sm">
                <input type="checkbox" name="new_period" value="1" className="h-5 w-5 accent-[var(--primary)]" />
                <span><b>Ini gajian baru</b> · hitungan bulan anggaran dimulai lagi dari tanggal ini</span>
              </label>
            )}
            <SubmitButton pendingLabel="Menyimpan…" className="btn-primary col-span-2 min-h-14 text-base">
              <Plus className="h-4 w-4" aria-hidden /> {explicitPeriod ? "Tambah pemasukan" : "Catat gajian & mulai periode"}
            </SubmitButton>
            {!explicitPeriod && (
              <p className="col-span-2 text-sm text-muted">Hitungan anggaran dimulai dari tanggal gajian sampai gajian berikutnya.</p>
            )}
          </form>
        </div>
      </Sheet>
    </>
  );
}
