"use client";

import { useState } from "react";
import { saveAllocation } from "@/app/actions/plan";
import { CategoryIcon } from "@/components/category-icon";
import { rupiah } from "@/lib/format";
import { SubmitButton } from "@/components/submit-button";

export type AllocCategory = {
  id: string; name: string; icon: string; kind: "daily" | "fixed"; lump_sum: boolean;
  due_day: number | null; amount: number;
};

const digits = (v: string) => v.replace(/\D/g, "");

export function AllocationForm({ categories, incomeTotal }: { categories: AllocCategory[]; incomeTotal: number }) {
  const [amounts, setAmounts] = useState<Record<string, string>>(
    Object.fromEntries(categories.map((c) => [c.id, c.amount ? String(c.amount) : ""])),
  );
  const allocated = Object.values(amounts).reduce((s, v) => s + Number(v || 0), 0);
  const left = incomeTotal - allocated;
  const pct = incomeTotal > 0 ? Math.min(100, (allocated / incomeTotal) * 100) : 0;
  const tone = left < 0 ? "text-danger" : left === 0 ? "text-ok" : "text-warn";

  const groups = [
    {
      title: "Pengeluaran sehari-hari",
      hint: "Jumlahnya berubah-ubah, mis. makan, bensin, jajan. Isi batas yang kamu mau.",
      items: categories.filter((c) => c.kind === "daily"),
    },
    {
      title: "Tagihan bulanan",
      hint: "Jumlahnya sudah pasti dan dibayar sekali sebulan, mis. listrik, internet, cicilan. Isi nominal tagihannya.",
      items: categories.filter((c) => c.kind === "fixed"),
    },
  ].filter((g) => g.items.length > 0);

  return (
    <form action={saveAllocation} className="flex flex-col gap-4" aria-label="Pembagian anggaran">
      <div className="sticky top-2 z-10 rounded-2xl border border-border bg-surface/95 p-4 shadow-float backdrop-blur" role="status" aria-live="polite">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-muted">
            {incomeTotal > 0 ? (left < 0 ? "Melebihi pemasukan" : left === 0 ? "Semua sudah dibagi" : "Belum dibagi") : "Total sudah dibagi"}
          </span>
          <span className={`text-xl font-extrabold tracking-tight tabular-nums ${incomeTotal > 0 ? tone : ""}`}>
            {rupiah(incomeTotal > 0 ? Math.abs(left) : allocated)}
          </span>
        </div>
        {incomeTotal > 0 && (
          <>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
              <div
                className={`h-full rounded-full transition-[width] duration-300 ${left < 0 ? "bg-danger" : left === 0 ? "bg-ok" : "bg-primary"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-xs text-muted tabular-nums">
              <span>{rupiah(allocated)} sudah dibagi</span>
              <span>dari {rupiah(incomeTotal)}</span>
            </div>
          </>
        )}
      </div>

      {groups.map((g) => (
        <section key={g.title} className="card flex flex-col gap-4 p-4" aria-label={g.title}>
          <div>
            <h3 className="text-[17px] font-bold tracking-tight">{g.title}</h3>
            <p className="text-sm text-muted">{g.hint}</p>
          </div>
          {g.items.map((c) => (
            <div key={c.id} className="flex flex-col gap-2">
              <label className="flex items-center gap-2.5 text-base font-semibold" htmlFor={`a_${c.id}`}>
                <CategoryIcon icon={c.icon} size="sm" />
                <span className="min-w-0 flex-1">
                  {c.name}
                  {c.lump_sum && <span className="ml-2 text-sm font-normal text-muted">dibayar sekaligus</span>}
                </span>
              </label>
              <div className="flex items-end gap-2">
                <input
                  id={`a_${c.id}`} name={`budget_${c.id}`} inputMode="numeric" placeholder="Rp 0" aria-label={`Jumlah untuk ${c.name} (Rp)`}
                  className="input font-semibold tabular-nums"
                  value={amounts[c.id] ? Number(amounts[c.id]).toLocaleString("id-ID") : ""}
                  onChange={(e) => setAmounts((a) => ({ ...a, [c.id]: digits(e.target.value) }))}
                />
                {c.kind === "fixed" && (
                  <label className="flex w-28 shrink-0 flex-col">
                    <span className="mb-1 text-sm text-muted">Bayar tgl</span>
                    <input
                      name={`due_${c.id}`} inputMode="numeric" className="input text-center" placeholder="1–28"
                      aria-label={`Tanggal bayar ${c.name} tiap bulan`} defaultValue={c.due_day ?? ""}
                    />
                  </label>
                )}
              </div>
            </div>
          ))}
        </section>
      ))}
      <p className="-mt-2 text-sm text-muted">
        &quot;Bayar tgl&quot; = tanggal tagihan harus dibayar tiap bulan (1–28). Pembagian ini tetap dipakai sampai kamu mengubahnya.
      </p>
      <SubmitButton pendingLabel="Menyimpan…" className="btn-primary">Simpan pembagian</SubmitButton>
    </form>
  );
}
