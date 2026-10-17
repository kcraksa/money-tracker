"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { logExpense, undoExpense } from "@/app/actions/expense";
import { Check, Delete, StickyNote, Undo2, WifiOff } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { addDays } from "@/lib/date";
import { rupiah } from "@/lib/format";
import { getLocal, setLocal, useLocal } from "@/lib/local-store";
import type { Category } from "@/lib/types";

type Quick = { id: string; label: string; amount: number; categoryId: string; icon: string };
type Pending = { id: string; categoryId: string; amount: number; spentOn?: string; note?: string };
type Toast = { text: string; undoId?: string; tone: "ok" | "warn" };

const QUEUE_KEY = "mt-queue";
const LAST_CAT_KEY = "mt-last-cat";
const MAX_DIGITS = 9;

function readQueue(): Pending[] {
  try { return JSON.parse(getLocal(QUEUE_KEY) || "[]"); } catch { return []; }
}
function writeQueue(q: Pending[]) {
  setLocal(QUEUE_KEY, JSON.stringify(q));
}

export function CatatForm({
  categories, quicks, today,
}: { categories: Category[]; quicks: Quick[]; today: string }) {
  const [digits, setDigits] = useState("");
  const [picked, setPicked] = useState<string>("");
  const lastCat = useLocal(LAST_CAT_KEY);
  const queueRaw = useLocal(QUEUE_KEY);
  let queued = 0;
  try { queued = (JSON.parse(queueRaw || "[]") as unknown[]).length; } catch {}
  const valid = (id: string) => categories.some((c) => c.id === id);
  const categoryId = valid(picked) ? picked : valid(lastCat) ? lastCat : (categories[0]?.id ?? "");
  const [yesterday, setYesterday] = useState(false);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [pending, start] = useTransition();
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const amount = Number(digits || 0);
  const selected = categories.find((c) => c.id === categoryId);

  const show = useCallback((t: Toast) => {
    clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = setTimeout(() => setToast(null), 6000);
  }, []);

  // Kirim antrean offline begitu ada sinyal.
  const flush = useCallback(async () => {
    let queue = readQueue();
    while (queue.length > 0) {
      try {
        const r = await logExpense(queue[0]);
        if (!r.ok && r.error === "Gagal menyimpan, coba lagi.") break; // coba lagi nanti
      } catch {
        break; // masih offline
      }
      queue = queue.slice(1);
      writeQueue(queue);
    }
  }, []);

  useEffect(() => {
    flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [flush]);

  function press(key: string) {
    navigator.vibrate?.(8);
    setDigits((d) => {
      if (key === "⌫") return d.slice(0, -1);
      const next = (d + key).replace(/^0+/, "");
      return next.length > MAX_DIGITS ? d : next;
    });
  }

  function save(p: Pending, label: string) {
    start(async () => {
      try {
        const r = await logExpense(p);
        if (!r.ok) return show({ text: r.error, tone: "warn" });
        const bits = [`${label} ${rupiah(p.amount)}`];
        if (r.xp > 0) bits.push(`+${r.xp} XP`);
        if (r.streak > 1) bits.push(`${r.streak} hari beruntun`);
        show({ text: bits.join(" · "), undoId: r.id, tone: "ok" });
      } catch {
        // Offline: simpan di HP, kirim saat ada sinyal.
        writeQueue([...readQueue(), p]);
        show({ text: `Offline: ${label} ${rupiah(p.amount)} disimpan di HP`, undoId: p.id, tone: "warn" });
      }
    });
  }

  function submit() {
    if (!amount || !categoryId) return;
    setLocal(LAST_CAT_KEY, categoryId);
    save(
      {
        id: crypto.randomUUID(), categoryId, amount,
        spentOn: yesterday ? addDays(today, -1) : undefined,
        note: note.trim() || undefined,
      },
      selected?.name ?? "Pengeluaran",
    );
    setDigits("");
    setNote("");
    setShowNote(false);
    setYesterday(false);
  }

  function quick(q: Quick) {
    navigator.vibrate?.(12);
    save({ id: crypto.randomUUID(), categoryId: q.categoryId, amount: q.amount }, q.label);
  }

  function undo(id: string) {
    setToast(null);
    const q = readQueue();
    if (q.some((p) => p.id === id)) {
      writeQueue(q.filter((p) => p.id !== id));
      return;
    }
    start(async () => { await undoExpense(id); });
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Catat"
        subtitle="Nominal, kategori, simpan."
        actions={
          queued > 0 ? (
            <span className="pill bg-warn-bg text-warn">
              <WifiOff className="h-3.5 w-3.5" aria-hidden /> {queued} menunggu sinyal
            </span>
          ) : undefined
        }
      />

      {quicks.length > 0 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Tombol cepat">
          {quicks.map((q) => (
            <button
              key={q.id} onClick={() => quick(q)} disabled={pending}
              className="flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-border bg-surface py-1.5 pl-2 pr-4 text-sm font-semibold shadow-card transition active:scale-95 disabled:opacity-50"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-base" aria-hidden>{q.icon}</span>
              <span>{q.label}</span>
              <span className="text-muted tabular-nums">{rupiah(q.amount)}</span>
            </button>
          ))}
        </div>
      )}

      <section className="card flex flex-col gap-1 px-5 py-4" aria-label="Nominal">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium text-muted">
            <span aria-hidden>{selected?.icon}</span> {selected?.name ?? "Pilih kategori"}
          </span>
          <div className="flex rounded-full bg-surface-2 p-0.5 text-xs font-semibold" role="group" aria-label="Tanggal">
            {[false, true].map((y) => (
              <button
                key={String(y)} onClick={() => setYesterday(y)} aria-pressed={yesterday === y}
                className={`min-h-8 rounded-full px-3 transition ${yesterday === y ? "bg-surface text-fg shadow-card" : "text-muted"}`}
              >
                {y ? "Kemarin" : "Hari ini"}
              </button>
            ))}
          </div>
        </div>
        <output
          aria-live="polite"
          className={`block py-1 text-center text-[44px] font-extrabold leading-tight tracking-tight tabular-nums ${amount ? "" : "text-muted/40"}`}
        >
          {rupiah(amount)}
        </output>
        {showNote ? (
          <input
            className="input min-h-10 text-sm" placeholder="Catatan (opsional)" maxLength={80} autoFocus
            value={note} onChange={(e) => setNote(e.target.value)}
          />
        ) : (
          <button onClick={() => setShowNote(true)} className="mx-auto flex min-h-8 items-center gap-1.5 text-xs font-medium text-muted">
            <StickyNote className="h-3.5 w-3.5" aria-hidden /> Tambah catatan
          </button>
        )}
      </section>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Pilih kategori">
        {categories.map((c) => {
          const on = categoryId === c.id;
          return (
            <button
              key={c.id} onClick={() => setPicked(c.id)} aria-pressed={on}
              className={`flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition active:scale-95 ${
                on ? "border-primary bg-primary text-primary-fg shadow-sm" : "border-border bg-surface"
              }`}
            >
              <span aria-hidden>{c.icon}</span> {c.name}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Keypad">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "000", "0", "⌫"].map((k) => (
          <button
            key={k} onClick={() => press(k)}
            aria-label={k === "⌫" ? "Hapus angka terakhir" : undefined}
            className="flex h-[52px] items-center justify-center rounded-2xl border border-border bg-surface text-[22px] font-semibold shadow-card transition active:scale-95 active:bg-surface-2"
          >
            {k === "⌫" ? <Delete className="h-6 w-6 text-muted" aria-hidden /> : k}
          </button>
        ))}
      </div>

      <button className="btn-primary min-h-14 text-base" onClick={submit} disabled={!amount || !categoryId || pending}>
        {pending ? "Menyimpan…" : amount ? `Simpan ${rupiah(amount)}` : "Simpan"}
      </button>

      {toast && (
        <div
          role="status"
          className={`animate-pop fixed inset-x-4 bottom-28 z-30 mx-auto flex max-w-md items-center gap-3 rounded-2xl p-3.5 shadow-float ${
            toast.tone === "ok" ? "bg-fg text-bg" : "bg-warn-bg text-warn"
          }`}
        >
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${toast.tone === "ok" ? "bg-ok text-bg" : "bg-warn/20"}`}>
            {toast.tone === "ok" ? <Check className="h-4 w-4" aria-hidden /> : <WifiOff className="h-4 w-4" aria-hidden />}
          </span>
          <span className="min-w-0 flex-1 text-sm font-medium">{toast.text}</span>
          {toast.undoId && (
            <button className="flex min-h-10 shrink-0 items-center gap-1 px-2 text-sm font-bold" onClick={() => undo(toast.undoId!)}>
              <Undo2 className="h-4 w-4" aria-hidden /> Urungkan
            </button>
          )}
        </div>
      )}
    </div>
  );
}
