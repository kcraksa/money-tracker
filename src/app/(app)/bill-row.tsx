"use client";

import { useState, useTransition } from "react";
import { markBillPaid, unmarkBill } from "@/app/actions/bills";
import { CategoryIcon } from "@/components/category-icon";
import { Check } from "@/components/icons";
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
    <li className="flex flex-col gap-3 px-4 py-3.5">
      <div className="flex items-center gap-3">
        <CategoryIcon icon={icon} />
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{name}</div>
          <div className="text-xs text-muted">
            {amount ? rupiah(amount) : "Nominal belum diatur"}
            {dueDay ? ` · jatuh tempo tgl ${dueDay}` : ""}
          </div>
        </div>
        {paid ? (
          <button
            disabled={pending}
            onClick={() => start(() => unmarkBill(categoryId))}
            className={`pill min-h-9 px-3 ${paid.onTime ? "bg-ok-bg text-ok" : "bg-warn-bg text-warn"}`}
            aria-label={`${name} sudah lunas, ketuk untuk membatalkan`}
          >
            <Check className="h-3.5 w-3.5" aria-hidden /> Lunas{paid.onTime ? "" : " · telat"}
          </button>
        ) : (
          <button className="btn-soft min-h-9 px-3 text-sm" onClick={() => setEditing((v) => !v)} aria-expanded={editing}>
            Bayar
          </button>
        )}
      </div>
      {editing && !paid && (
        <div className="animate-pop flex gap-2">
          <input
            inputMode="numeric" className="input" aria-label={`Nominal ${name}`} placeholder="Nominal"
            value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
          />
          <button className="btn-primary shrink-0" disabled={pending || !value} onClick={pay}>
            {pending ? "…" : "Tandai lunas"}
          </button>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </li>
  );
}
