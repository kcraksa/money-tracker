"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { logExpense, undoExpense } from "@/app/actions/expense";
import { Check, ChevronDown, Delete, StickyNote, Undo2, WifiOff, Zap } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { Segmented } from "@/components/segmented";
import { haptic } from "@/lib/haptics";
import { addDays } from "@/lib/date";
import { rupiah } from "@/lib/format";
import { getLocal, setLocal, useLocal } from "@/lib/local-store";
import type { Category } from "@/lib/types";

type Quick = {
  id: string; label: string; amount: number; categoryId: string; icon: string;
  note: string | null; // keterangan yang ikut tersimpan (pill otomatis dari kebiasaan)
  pinned: boolean; // true = tombol cepat tetap dari Pengaturan
};
type Pending = { id: string; categoryId: string; amount: number; spentOn?: string; note?: string };
type Toast = { text: string; undoId?: string; tone: "ok" | "warn" };

const QUEUE_KEY = "mt-queue";
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
  const queueRaw = useLocal(QUEUE_KEY);
  let queued = 0;
  try { queued = (JSON.parse(queueRaw || "[]") as unknown[]).length; } catch {}
  // Kategori sengaja tidak punya nilai awal: dipilih sendiri tiap kali supaya tidak salah masuk.
  const categoryId = categories.some((c) => c.id === picked) ? picked : "";
  const [yesterday, setYesterday] = useState(false);
  const [note, setNote] = useState("");
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
    haptic("tap");
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
        if (!r.ok) { haptic("warn"); return show({ text: r.error, tone: "warn" }); }
        haptic("success");
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
    const keterangan = note.trim();
    save(
      {
        id: crypto.randomUUID(), categoryId, amount,
        spentOn: yesterday ? addDays(today, -1) : undefined,
        note: keterangan || undefined,
      },
      `${selected?.name ?? "Pengeluaran"}${keterangan ? ` · ${keterangan}` : ""}`,
    );
    setDigits("");
    setNote("");
    setPicked(""); // kategori berikutnya dipilih lagi
    setYesterday(false);
  }

  function quick(q: Quick) {
    haptic("select");
    save({ id: crypto.randomUUID(), categoryId: q.categoryId, amount: q.amount, note: q.note ?? undefined }, q.label);
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
        subtitle="Nominal, pilih kategori, simpan."
        actions={
          queued > 0 ? (
            <span className="pill bg-warn-bg text-warn">
              <WifiOff className="h-3.5 w-3.5" aria-hidden /> {queued} menunggu sinyal
            </span>
          ) : undefined
        }
      />

      {quicks.length > 0 && (
        <section aria-label="Aksi cepat" className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
            <Zap className="h-3.5 w-3.5" aria-hidden /> Sering dicatat · satu ketuk langsung tersimpan
          </p>
          <div data-no-ptr className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Pengeluaran yang sering dicatat">
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
        </section>
      )}

      <section className="card flex flex-col gap-1 px-5 py-3" aria-label="Nominal">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium text-muted">
            {selected ? <><span aria-hidden>{selected.icon}</span> {selected.name}</> : "Belum pilih kategori"}
          </span>
          <div className="w-44">
            <Segmented<"today" | "yesterday">
              label="Tanggal" size="sm" value={yesterday ? "yesterday" : "today"}
              onSelect={(k) => setYesterday(k === "yesterday")}
              items={[{ key: "today", label: "Hari ini" }, { key: "yesterday", label: "Kemarin" }]}
            />
          </div>
        </div>
        <output
          aria-live="polite"
          className={`block py-1 text-center text-[44px] font-extrabold leading-tight tracking-tight tabular-nums ${amount ? "" : "text-muted/40"}`}
        >
          {rupiah(amount)}
        </output>
        <label className="relative mt-1 block">
          <span className="sr-only">Keterangan</span>
          <StickyNote className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            className="input min-h-11 pl-10" placeholder="Keterangan (opsional)" maxLength={80}
            enterKeyHint="done" value={note} onChange={(e) => setNote(e.target.value)}
          />
        </label>
      </section>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="kategori" className="text-sm font-semibold">Kategori</label>
          {!categoryId && amount > 0 && <span className="animate-pop text-xs font-semibold text-warn">Pilih satu dulu</span>}
        </div>
        {/* Select native: di HP membuka pemilih bawaan sistem (roda/dialog) dan tetap mudah dijangkau. */}
        <div className="relative">
          <select
            id="kategori" value={categoryId} onChange={(e) => { haptic("select"); setPicked(e.target.value); }}
            className={`input appearance-none pr-11 font-semibold ${categoryId ? "" : "text-muted"}`}
          >
            <option value="" disabled>Pilih kategori…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Keypad">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "000", "0", "⌫"].map((k) => (
          <button
            key={k} onClick={() => press(k)}
            aria-label={k === "⌫" ? "Hapus angka terakhir" : undefined}
            className="flex h-12 items-center justify-center rounded-2xl border border-border bg-surface text-[22px] font-semibold shadow-card transition active:scale-95 active:bg-surface-2"
          >
            {k === "⌫" ? <Delete className="h-6 w-6 text-muted" aria-hidden /> : k}
          </button>
        ))}
      </div>

      <button className="btn-primary min-h-14 text-base" onClick={submit} disabled={!amount || !categoryId || pending}>
        {pending ? "Menyimpan…" : !amount ? "Simpan" : !categoryId ? "Pilih kategori dulu" : `Simpan ${rupiah(amount)}`}
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
