"use client";

import { useMemo, useState, useTransition } from "react";
import { saveAllocation } from "@/app/actions/plan";
import { CategoryIcon } from "@/components/category-icon";
import { Check } from "@/components/icons";
import { Spinner } from "@/components/spinner";
import { rupiah } from "@/lib/format";

export type AllocCategory = {
  id: string; name: string; icon: string; kind: "daily" | "fixed"; lump_sum: boolean;
  due_day: number | null; amount: number;
};

const digits = (v: string) => v.replace(/\D/g, "").slice(0, 11);

/**
 * Pembagian uang ke tiap kategori: satu baris per kategori, satu tombol Simpan yang selalu terlihat
 * di bawah layar. Setelah simpan halaman tidak berpindah, jadi langsung bisa lanjut mengubah angka.
 */
export function AllocationForm({ categories, incomeTotal }: { categories: AllocCategory[]; incomeTotal: number }) {
  const initial = useMemo(() => ({
    amounts: Object.fromEntries(categories.map((c) => [c.id, c.amount ? String(c.amount) : ""])) as Record<string, string>,
    dues: Object.fromEntries(categories.filter((c) => c.kind === "fixed").map((c) => [c.id, c.due_day ? String(c.due_day) : ""])) as Record<string, string>,
  }), [categories]);
  const [amounts, setAmounts] = useState(initial.amounts);
  const [dues, setDues] = useState(initial.dues);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const dirty = JSON.stringify({ amounts, dues }) !== saved;
  const allocated = Object.values(amounts).reduce((s, v) => s + Number(v || 0), 0);
  const left = incomeTotal - allocated;
  const tone = incomeTotal > 0 ? (left < 0 ? "text-danger" : left === 0 ? "text-ok" : "text-warn") : "";
  const label = incomeTotal > 0 ? (left < 0 ? "Melebihi pemasukan" : left === 0 ? "Semua sudah dibagi" : "Belum dibagi") : "Total anggaran";

  function save(e?: React.FormEvent) {
    e?.preventDefault();
    if (!dirty || pending) return;
    setError("");
    const snapshot = JSON.stringify({ amounts, dues });
    start(async () => {
      try {
        const r = await saveAllocation({
          budgets: Object.fromEntries(Object.entries(amounts).map(([id, v]) => [id, Number(v || 0)])),
          dueDays: Object.fromEntries(Object.entries(dues).map(([id, v]) => [id, Number(v || 0)])),
        });
        if (r.ok) setSaved(snapshot);
        else setError(r.error);
      } catch {
        setError("Tidak ada sinyal. Coba lagi saat sudah tersambung.");
      }
    });
  }

  const groups = [
    { title: "Pengeluaran sehari-hari", hint: "Berubah-ubah, mis. makan dan bensin. Isi batasnya.", items: categories.filter((c) => c.kind === "daily") },
    { title: "Tagihan bulanan", hint: "Jumlahnya tetap, mis. listrik dan internet. Isi nominalnya.", items: categories.filter((c) => c.kind === "fixed") },
  ].filter((g) => g.items.length > 0);

  return (
    <form onSubmit={save} className="flex flex-col gap-5" aria-label="Pembagian anggaran">
      {groups.map((g) => (
        <section key={g.title} aria-labelledby={`g-${g.title}`}>
          <h3 id={`g-${g.title}`} className="text-[17px] font-bold tracking-tight">{g.title}</h3>
          <p className="mb-3 text-sm text-muted">{g.hint}</p>
          <ul className="card divide-y divide-border p-0">
            {g.items.map((c) => (
              <li key={c.id} className="flex flex-col gap-2 px-4 py-3">
                <div className="flex items-center gap-3">
                  <CategoryIcon icon={c.icon} size="sm" />
                  <label htmlFor={`a_${c.id}`} className="min-w-0 flex-1 text-base font-semibold">
                    {c.name}
                    {c.lump_sum && <span className="block text-sm font-normal text-muted">dibayar sekaligus</span>}
                  </label>
                  <input
                    id={`a_${c.id}`} inputMode="numeric" placeholder="Rp 0" autoComplete="off"
                    className="input w-32 shrink-0 px-3 text-right text-base font-semibold tabular-nums"
                    value={amounts[c.id] ? Number(amounts[c.id]).toLocaleString("id-ID") : ""}
                    onChange={(e) => setAmounts((a) => ({ ...a, [c.id]: digits(e.target.value) }))}
                    onFocus={(e) => e.currentTarget.select()}
                  />
                </div>
                {c.kind === "fixed" && (
                  <label className="flex items-center justify-end gap-2 text-sm text-muted">
                    Dibayar tiap tanggal
                    <input
                      inputMode="numeric" placeholder="1–28" autoComplete="off" aria-label={`Tanggal bayar ${c.name} tiap bulan`}
                      className="input min-h-11 w-20 text-center"
                      value={dues[c.id] ?? ""}
                      onChange={(e) => setDues((d) => ({ ...d, [c.id]: digits(e.target.value).slice(0, 2) }))}
                      onFocus={(e) => e.currentTarget.select()}
                    />
                  </label>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      {error && <p role="alert" className="rounded-2xl bg-danger-bg p-3 text-sm text-danger">{error}</p>}

      {/* Selalu terlihat di atas navigasi bawah: tidak perlu scroll untuk menyimpan. */}
      <div className="sticky bottom-28 z-10 flex items-center gap-3 rounded-2xl border border-border bg-surface/95 p-3 shadow-float backdrop-blur" role="group" aria-label="Simpan pembagian">
        <div className="min-w-0 flex-1 pl-1" aria-live="polite">
          <div className="text-sm text-muted">{label}</div>
          <div className={`text-xl font-extrabold tracking-tight tabular-nums ${tone}`}>{rupiah(incomeTotal > 0 ? Math.abs(left) : allocated)}</div>
        </div>
        <button className="btn-primary min-h-12 min-w-32 shrink-0 px-5 text-base disabled:opacity-100 disabled:bg-surface-2 disabled:text-muted disabled:shadow-none" disabled={!dirty || pending}>
          {pending ? <><Spinner /> Menyimpan…</> : dirty ? "Simpan" : <><Check className="h-5 w-5 text-ok" aria-hidden /> Tersimpan</>}
        </button>
      </div>
    </form>
  );
}
