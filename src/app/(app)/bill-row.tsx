"use client";

import { useState, useTransition } from "react";
import { markBillPaid, unmarkBill } from "@/app/actions/bills";
import { rupiah } from "@/lib/format";

type Props = {
  categoryId: string;
  name: string;
  icon: string;
  amount: number;
  dueDay: number | null;
  paid: { onTime: boolean; paidOn: string } | null;
};

export function BillRow({ categoryId, name, icon, amount, dueDay, paid }: Props) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(amount ? String(amount) : "");
  const [error, setError] = useState("");

  function pay() {
    start(async () => {
      const r = await markBillPaid(categoryId, Number(value));
      if (r.error) setError(r.error);
      else setEditing(false);
    });
  }

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-xl" aria-hidden>{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="font-medium">{name}</div>
          <div className="text-xs text-muted">
            {amount ? rupiah(amount) : "Nominal belum diatur"}
            {dueDay ? ` · jatuh tempo tgl ${dueDay}` : ""}
          </div>
        </div>
        {paid ? (
          <button
            disabled={pending}
            onClick={() => start(() => unmarkBill(categoryId))}
            className="min-h-10 rounded-full bg-ok-bg px-3 text-sm font-semibold text-ok"
            aria-label={`${name} sudah lunas, ketuk untuk batalkan`}
          >
            Lunas ✓{paid.onTime ? "" : " (telat)"}
          </button>
        ) : (
          <button className="btn-soft min-h-10 px-3 text-sm" onClick={() => setEditing((v) => !v)}>
            Belum — bayar
          </button>
        )}
      </div>
      {editing && !paid && (
        <div className="flex gap-2">
          <input
            inputMode="numeric" className="input" aria-label={`Nominal ${name}`} placeholder="Nominal"
            value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
          />
          <button className="btn-primary" disabled={pending || !value} onClick={pay}>
            {pending ? "…" : "Tandai lunas"}
          </button>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </li>
  );
}
