"use client";

import { useState, useTransition } from "react";
import { markBillPaid, unmarkBill } from "@/app/actions/bills";
import { CategoryIcon } from "@/components/category-icon";
import { Check } from "@/components/icons";
import { Sheet } from "@/components/sheet";
import { Spinner } from "@/components/spinner";
import { rupiah } from "@/lib/format";
import { haptic } from "@/lib/haptics";

type Props = {
  categoryId: string;
  name: string;
  icon: string;
  amount: number;
  dueLabel: string | null;
  paid: { onTime: boolean; paidOn: string } | null;
};

export function BillRow({ categoryId, name, icon, amount, dueLabel, paid }: Props) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(amount ? String(amount) : "");
  const [error, setError] = useState("");

  function pay() {
    setError("");
    start(async () => {
      const r = await markBillPaid(categoryId, Number(value));
      if (r.error) { haptic("warn"); setError(r.error); return; }
      haptic("success");
      setOpen(false);
    });
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3.5">
      <CategoryIcon icon={icon} />
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{name}</div>
        <div className="text-xs text-muted">
          {amount ? rupiah(amount) : "Nominal belum diatur"}
          {dueLabel ? ` · jatuh tempo ${dueLabel}` : ""}
        </div>
      </div>
      {paid ? (
        <button
          disabled={pending}
          onClick={() => { haptic("tap"); start(() => unmarkBill(categoryId)); }}
          className={`pill min-h-9 px-3 transition active:scale-95 ${paid.onTime ? "bg-ok-bg text-ok" : "bg-warn-bg text-warn"}`}
          aria-label={`${name} sudah lunas, ketuk untuk membatalkan`}
        >
          {pending ? <Spinner className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" aria-hidden />} Lunas{paid.onTime ? "" : " · telat"}
        </button>
      ) : (
        <button className="btn-soft min-h-9 px-3 text-sm" onClick={() => { haptic("tap"); setOpen(true); }}>
          Bayar
        </button>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title={`Bayar ${name}`}>
        <form
          onSubmit={(e) => { e.preventDefault(); if (value) pay(); }}
          className="flex flex-col gap-3 pb-2"
        >
          <div>
            <label className="label" htmlFor={`pay_${categoryId}`}>Nominal</label>
            <input
              id={`pay_${categoryId}`} inputMode="numeric" autoFocus enterKeyHint="done" placeholder="Rp 0"
              className="input text-lg font-bold tabular-nums"
              value={value ? Number(value).toLocaleString("id-ID") : ""}
              onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
            />
            {dueLabel && <p className="mt-1.5 text-xs text-muted">Jatuh tempo {dueLabel}. Lunas sebelum itu dapat XP tepat waktu.</p>}
          </div>
          {error && <p role="alert" className="rounded-2xl bg-danger-bg p-3 text-sm text-danger">{error}</p>}
          <button className="btn-primary min-h-14 text-base" disabled={pending || !value}>
            {pending ? <><Spinner /> Menyimpan…</> : `Tandai lunas ${value ? rupiah(Number(value)) : ""}`}
          </button>
        </form>
      </Sheet>
    </li>
  );
}
