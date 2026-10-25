"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { undoExpense, updateExpense } from "@/app/actions/expense";
import { CategoryIcon } from "@/components/category-icon";
import { ConfirmButton } from "@/components/confirm-button";
import { Field } from "@/components/field";
import { Pencil, Trash2 } from "@/components/icons";
import { Sheet } from "@/components/sheet";
import { Spinner } from "@/components/spinner";
import { addDays } from "@/lib/date";
import { MAX_BACKDATE_DAYS } from "@/lib/expense-input";
import { rupiah } from "@/lib/format";

type Row = {
  id: string; amount: number; spentOn: string; who: string; mine: boolean; category: string; icon: string; note: string | null;
  categoryId: string;
  /** Hanya pengeluaran harian milik sendiri yang bisa diubah (tagihan diatur dari Beranda). */
  editable: boolean;
};
type Cat = { id: string; name: string; icon: string };

export function RecentList({ rows, today, categories }: { rows: Row[]; today: string; categories: Cat[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  if (rows.length === 0) return null;

  return (
    <section aria-labelledby="terakhir-h">
      <h2 id="terakhir-h" className="section-title">Catatan terakhir</h2>
      <ul className="card divide-y divide-border p-0">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-col gap-1 px-4 py-3">
            <div className="flex items-center gap-3">
              <CategoryIcon icon={r.icon} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="text-base font-semibold">{r.category}</div>
                {r.note && <div className="text-sm">{r.note}</div>}
              </div>
              <div className="text-base font-bold tabular-nums">{rupiah(r.amount)}</div>
            </div>
            <div className="flex min-h-11 items-center justify-between gap-2 pl-12 text-sm text-muted">
              <span>{r.who}{r.spentOn === today ? " · hari ini" : ` · ${Number(r.spentOn.slice(8))}/${Number(r.spentOn.slice(5, 7))}`}</span>
              <span className="-mr-2 flex items-center">
                {r.editable && (
                  <button
                    aria-label={`Ubah catatan ${r.category} ${rupiah(r.amount)}`} onClick={() => setEditing(r)}
                    className="flex min-h-11 items-center gap-1 rounded-full px-3 font-semibold text-primary transition hover:bg-surface-2"
                  >
                    <Pencil className="h-4 w-4" aria-hidden /> Ubah
                  </button>
                )}
                {r.mine && (
                  deleting === r.id ? (
                    <span className="flex min-h-11 w-20 items-center justify-center" role="status" aria-label="Menghapus…"><Spinner /></span>
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
                      className="flex min-h-11 items-center gap-1 rounded-full px-3 font-semibold text-danger transition hover:bg-surface-2"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden /> Hapus
                    </ConfirmButton>
                  )
                )}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <EditSheet row={editing} today={today} categories={categories} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); router.refresh(); }} />
    </section>
  );
}

function EditSheet({
  row, today, categories, onClose, onSaved,
}: { row: Row | null; today: string; categories: Cat[]; onClose: () => void; onSaved: () => void }) {
  return (
    <Sheet open={row !== null} onClose={onClose} title="Ubah catatan">
      {/* key = id catatan: formulir diisi ulang dari catatan yang dipilih */}
      {row && <EditForm key={row.id} row={row} today={today} categories={categories} onClose={onClose} onSaved={onSaved} />}
    </Sheet>
  );
}

function EditForm({
  row, today, categories, onClose, onSaved,
}: { row: Row; today: string; categories: Cat[]; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState(String(row.amount));
  const [categoryId, setCategoryId] = useState(row.categoryId);
  const [date, setDate] = useState(row.spentOn);
  const [note, setNote] = useState(row.note ?? "");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    start(async () => {
      try {
        const r = await updateExpense({ id: row.id, categoryId, amount: Number(amount), spentOn: date, note });
        if (r.ok) onSaved();
        else setError(r.error);
      } catch {
        setError("Tidak ada sinyal. Coba lagi saat sudah tersambung.");
      }
    });
  }

  return (
    <form onSubmit={save} className="grid grid-cols-1 gap-3 pb-2">
      <Field label="Jumlah uang (Rp)">
        <input
          inputMode="numeric" required autoFocus enterKeyHint="next" className="input text-lg font-bold tabular-nums"
          value={amount ? Number(amount).toLocaleString("id-ID") : ""}
          onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 10))}
        />
      </Field>
      <Field label="Kategori">
        <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
      </Field>
      <Field label="Tanggal">
        <input type="date" required className="input" value={date} min={addDays(today, -MAX_BACKDATE_DAYS)} max={today} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="Keterangan" optional>
        <input className="input" maxLength={80} value={note} onChange={(e) => setNote(e.target.value)} enterKeyHint="done" />
      </Field>
      {error && <p role="alert" className="rounded-2xl bg-danger-bg p-3 text-sm text-danger">{error}</p>}
      <button className="btn-primary min-h-14 text-base" disabled={pending || !amount}>
        {pending ? <><Spinner /> Menyimpan…</> : "Simpan perubahan"}
      </button>
      <button type="button" className="btn-ghost" onClick={onClose}>Batal</button>
    </form>
  );
}
