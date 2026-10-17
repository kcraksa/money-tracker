"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { undoExpense } from "@/app/actions/expense";
import { CategoryIcon } from "@/components/category-icon";
import { X } from "@/components/icons";
import { rupiah } from "@/lib/format";

type Row = { id: string; amount: number; spentOn: string; who: string; mine: boolean; category: string; icon: string };

export function RecentList({ rows, today }: { rows: Row[]; today: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (rows.length === 0) return null;

  return (
    <section aria-label="Catatan terakhir">
      <h2 className="section-title">Catatan terakhir</h2>
      <ul className="card divide-y divide-border p-0">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-3 px-4 py-3">
            <CategoryIcon icon={r.icon} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{r.category}</div>
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-surface-2 text-[9px] font-bold uppercase" aria-hidden>
                  {r.who.slice(0, 1)}
                </span>
                {r.who}{r.spentOn === today ? " · hari ini" : ` · ${r.spentOn.slice(8)}/${r.spentOn.slice(5, 7)}`}
              </div>
            </div>
            <div className="font-bold tabular-nums">{rupiah(r.amount)}</div>
            {r.mine && (
              <button
                aria-label={`Hapus catatan ${r.category}`}
                disabled={pending}
                onClick={() => start(async () => { await undoExpense(r.id); router.refresh(); })}
                className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full text-muted transition hover:bg-surface-2"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
