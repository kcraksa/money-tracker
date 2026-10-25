"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { undoExpense } from "@/app/actions/expense";
import { CategoryIcon } from "@/components/category-icon";
import { ConfirmButton } from "@/components/confirm-button";
import { Trash2 } from "@/components/icons";
import { Spinner } from "@/components/spinner";
import { rupiah } from "@/lib/format";

type Row = {
  id: string; amount: number; spentOn: string; who: string; mine: boolean; category: string; icon: string; note: string | null;
};

export function RecentList({ rows, today }: { rows: Row[]; today: string }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [deleting, setDeleting] = useState<string | null>(null);
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
              {r.note && <div className="truncate text-sm text-fg">{r.note}</div>}
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-surface-2 text-[9px] font-bold uppercase" aria-hidden>
                  {r.who.slice(0, 1)}
                </span>
                {r.who}{r.spentOn === today ? " · hari ini" : ` · ${r.spentOn.slice(8)}/${r.spentOn.slice(5, 7)}`}
              </div>
            </div>
            <div className="font-bold tabular-nums">{rupiah(r.amount)}</div>
            {r.mine && (
              deleting === r.id ? (
                <span className="-mr-2 flex h-11 w-11 items-center justify-center" role="status" aria-label="Menghapus…"><Spinner /></span>
              ) : (
                <ConfirmButton
                  aria-label={`Hapus catatan ${r.category} ${rupiah(r.amount)}`}
                  title="Hapus catatan ini?"
                  message={<>{r.category}{r.note ? ` (${r.note})` : ""} sebesar {rupiah(r.amount)} akan dihapus.</>}
                  onConfirm={() => {
                    setDeleting(r.id);
                    start(async () => {
                      try { await undoExpense(r.id); } finally { setDeleting(null); router.refresh(); }
                    });
                  }}
                  className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-muted transition hover:bg-surface-2"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </ConfirmButton>
              )
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
