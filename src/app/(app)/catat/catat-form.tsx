"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { getLocal, setLocal, useLocal } from "@/lib/local-store";
import { logExpense, undoExpense } from "@/app/actions/expense";
import { addDays } from "@/lib/date";
import { rupiah } from "@/lib/format";
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
        if (r.streak > 1) bits.push(`🔥 ${r.streak} hari`);
        show({ text: `Tersimpan ✓ ${bits.join(" · ")}`, undoId: r.id, tone: "ok" });
      } catch {
        // Offline: simpan di HP, kirim saat ada sinyal.
        const q = [...readQueue(), p];
        writeQueue(q);
        show({ text: `Offline — ${label} ${rupiah(p.amount)} disimpan di HP`, undoId: p.id, tone: "warn" });
      }
    });
  }

  function submit() {
    if (!amount || !categoryId) return;
    const cat = categories.find((c) => c.id === categoryId);
    setLocal(LAST_CAT_KEY, categoryId);
    save(
      {
        id: crypto.randomUUID(), categoryId, amount,
        spentOn: yesterday ? addDays(today, -1) : undefined,
        note: note.trim() || undefined,
      },
      cat?.name ?? "Pengeluaran",
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
      const rest = q.filter((p) => p.id !== id);
      writeQueue(rest);
      return;
    }
    start(async () => { await undoExpense(id); });
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Catat pengeluaran</h1>
        {queued > 0 && (
          <span className="rounded-full bg-warn-bg px-3 py-1 text-xs font-medium text-warn">
            {queued} menunggu sinyal
          </span>
        )}
      </header>

      {quicks.length > 0 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Tombol cepat">
          {quicks.map((q) => (
            <button
              key={q.id} onClick={() => quick(q)} disabled={pending}
              className="btn-soft shrink-0 whitespace-nowrap border border-border"
            >
              <span aria-hidden>{q.icon}</span> {q.label} {rupiah(q.amount)}
            </button>
          ))}
        </div>
      )}

      <div className="card text-center">
        <div className="text-sm text-muted">Nominal</div>
        <output
          aria-live="polite"
          className={`block text-5xl font-extrabold tabular-nums ${amount ? "" : "text-muted/50"}`}
        >
          {rupiah(amount)}
        </output>
      </div>

      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Pilih kategori">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setPicked(c.id)}
            aria-pressed={categoryId === c.id}
            className={`flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-xl border-2 px-1 text-sm font-medium transition ${
              categoryId === c.id ? "border-primary bg-primary/10" : "border-border bg-surface"
            }`}
          >
            <span className="text-2xl" aria-hidden>{c.icon}</span>
            <span className="text-center leading-tight">{c.name}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Keypad">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "000", "0", "⌫"].map((k) => (
          <button
            key={k} onClick={() => press(k)}
            aria-label={k === "⌫" ? "Hapus angka terakhir" : undefined}
            className="min-h-14 rounded-xl bg-surface-2 text-2xl font-semibold active:scale-95 active:bg-border"
          >
            {k}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => setYesterday((v) => !v)} aria-pressed={yesterday}
          className={`min-h-10 rounded-full border px-3 ${yesterday ? "border-primary bg-primary/10 font-semibold" : "border-border"}`}
        >
          {yesterday ? "Kemarin" : "Hari ini"}
        </button>
        <button
          onClick={() => setShowNote((v) => !v)}
          className="min-h-10 rounded-full border border-border px-3 text-muted"
        >
          {showNote ? "Tutup catatan" : "+ Catatan"}
        </button>
      </div>
      {showNote && (
        <input
          className="input" placeholder="Catatan (opsional)" maxLength={80}
          value={note} onChange={(e) => setNote(e.target.value)}
        />
      )}

      <button className="btn-primary min-h-14 text-lg" onClick={submit} disabled={!amount || !categoryId || pending}>
        {pending ? "Menyimpan…" : "Simpan"}
      </button>

      {toast && (
        <div
          role="status"
          className={`fixed inset-x-4 bottom-24 z-30 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl p-3 shadow-lg ${
            toast.tone === "ok" ? "bg-ok-bg text-ok" : "bg-warn-bg text-warn"
          }`}
        >
          <span className="text-sm font-medium">{toast.text}</span>
          {toast.undoId && (
            <button className="min-h-10 shrink-0 px-2 text-sm font-bold underline" onClick={() => undo(toast.undoId!)}>
              Urungkan
            </button>
          )}
        </div>
      )}
    </div>
  );
}
