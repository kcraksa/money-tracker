"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { undoExpense } from "@/app/actions/expense";
import { rupiah } from "@/lib/format";

type Row = { id: string; amount: number; spentOn: string; who: string; mine: boolean; category: string; icon: string };

export function RecentList({ rows, today }: { rows: Row[]; today: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (rows.length === 0) return null;

  return (
    <section aria-label="Catatan terakhir">
      <h2 className="mb-2 text-sm font-semibold text-muted">Catatan terakhir</h2>
      <ul className="card divide-y divide-border p-0">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-3 px-4 py-3">
            <span className="text-xl" aria-hidden>{r.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{r.category}</div>
              <div className="text-xs text-muted">
                {r.who}{r.spentOn === today ? "" : ` · ${r.spentOn}`}
              </div>
            </div>
            <div className="font-semibold tabular-nums">{rupiah(r.amount)}</div>
            {r.mine && (
              <button
                aria-label={`Hapus catatan ${r.category}`}
                disabled={pending}
                onClick={() => start(async () => { await undoExpense(r.id); router.refresh(); })}
                className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-surface-2"
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
