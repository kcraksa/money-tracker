"use client";

import { useState } from "react";
import { Eye, EyeOff } from "@/components/icons";
import { rupiah } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { HIDE_COOKIE, MASK } from "@/lib/hide-balance";

type Props = {
  periodLabel: string; day: number; totalDays: number;
  totalSpent: number; totalBudget: number;
  /** Nilai awal dari cookie (dibaca di server) supaya tidak berkedip saat halaman dibuka. */
  initialHidden: boolean;
};

/** Kartu ringkasan Beranda dengan tombol Sembunyikan/Tampilkan untuk semua nominal. */
export function BalanceHero({ periodLabel, day, totalDays, totalSpent, totalBudget, initialHidden }: Props) {
  const [hidden, setHidden] = useState(initialHidden);
  const left = totalBudget - totalSpent;
  const pct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  function toggle() {
    const next = !hidden;
    haptic("tap");
    setHidden(next);
    document.cookie = `${HIDE_COOKIE}=${next ? "1" : "0"}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }
  const money = (n: number) =>
    hidden ? <span role="img" aria-label="disembunyikan">{MASK}</span> : <>{rupiah(n)}</>;

  return (
    <section aria-labelledby="uang-h" className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-hero-from to-hero-to p-4 text-white shadow-float">
      <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" aria-hidden />
      <div className="relative flex items-start justify-between gap-2">
        <h2 id="uang-h" className="pt-1 text-sm font-semibold">Pengeluaran periode ini</h2>
        <button
          type="button" onClick={toggle} aria-pressed={hidden}
          aria-label={hidden ? "Tampilkan saldo" : "Sembunyikan saldo"}
          className="-mr-1 -mt-1 flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 text-sm font-semibold transition active:scale-95"
        >
          {hidden ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
          {hidden ? "Tampilkan" : "Sembunyikan"}
        </button>
      </div>
      <div className="relative mt-0.5 text-[36px] font-extrabold leading-none tracking-tight tabular-nums">{money(totalSpent)}</div>
      <p className="relative mt-1.5 text-sm">{periodLabel} · hari ke-{day} dari {totalDays}</p>
      {totalBudget > 0 && (
        <>
          <div
            role="progressbar" aria-label="Anggaran terpakai" aria-valuenow={Math.round(Math.min(100, pct))} aria-valuemin={0} aria-valuemax={100}
            className="relative mt-3 h-2.5 overflow-hidden rounded-full bg-white/20"
          >
            <div className={`h-full rounded-full ${pct > 100 ? "bg-red-300" : "bg-white"}`} style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
          <div className="relative mt-3 grid grid-cols-2 gap-3">
            <div>
              <div className="text-sm">{left >= 0 ? "Sisa anggaran" : "Lebih dari anggaran"}</div>
              <div className="text-lg font-bold tabular-nums">{money(Math.abs(left))}</div>
            </div>
            <div className="text-right">
              <div className="text-sm">Anggaran</div>
              <div className="text-lg font-bold tabular-nums">{money(totalBudget)}</div>
            </div>
          </div>
        </>
      )}
      <p className="sr-only" role="status">{hidden ? "Saldo disembunyikan" : "Saldo ditampilkan"}</p>
    </section>
  );
}
