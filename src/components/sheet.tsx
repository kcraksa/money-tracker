"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X } from "./icons";

const subscribe = () => () => {};
const useMounted = () => useSyncExternalStore(subscribe, () => true, () => false);

const EXIT_MS = 260;

// Elemen terakhir yang difokus di luar dialog = tombol pembuka sheet. Dicatat lewat focusin karena
// saat efek sheet berjalan, kolom ber-autoFocus di dalam sheet sudah lebih dulu mengambil fokus.
let lastOutside: HTMLElement | null = null;
if (typeof document !== "undefined") {
  document.addEventListener("focusin", (e) => {
    if (e.target instanceof HTMLElement && !e.target.closest('[role="dialog"]')) lastOutside = e.target;
  });
}
const CLOSE_DISTANCE = 110;

/**
 * Bottom sheet ala aplikasi native: naik dari bawah, bisa diseret ke bawah untuk menutup,
 * latar menggelap, Esc/klik latar/tombol Tutup menutup, dan halaman di belakangnya terkunci.
 * Selama terbuka, isi halaman lain dibuat `inert` sehingga fokus keyboard & pembaca layar
 * tetap di dalam sheet; saat ditutup fokus kembali ke tombol yang membukanya.
 */
export function Sheet({
  open, onClose, title, children,
}: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const mounted = useMounted();
  const [rendered, setRendered] = useState(open);
  if (open && !rendered) setRendered(true);
  const closing = !open && rendered;

  const panel = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const drag = useRef<{ y0: number; dy: number; t0: number } | null>(null);

  // Unmount setelah animasi keluar selesai.
  useEffect(() => {
    if (open || !rendered) return;
    const t = setTimeout(() => setRendered(false), EXIT_MS);
    return () => clearTimeout(t);
  }, [open, rendered]);

  // Kunci scroll halaman, Esc untuk menutup, fokus ke sheet.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.dataset.sheetOpen = "1";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const opener = lastOutside;
    const muted = [...document.body.children].filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el !== root.current && !el.inert,
    );
    muted.forEach((el) => { el.inert = true; });
    // Fokus ke sheet, kecuali isinya sudah punya elemen terfokus (mis. input dengan autoFocus).
    if (!panel.current?.contains(document.activeElement)) panel.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = prev;
      delete document.body.dataset.sheetOpen;
      window.removeEventListener("keydown", onKey);
      muted.forEach((el) => { el.inert = false; });
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [open, onClose]);

  if (!mounted || !rendered) return null;

  function onPointerDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { y0: e.clientY, dy: 0, t0: performance.now() };
    if (panel.current) panel.current.style.animation = "none";
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || !panel.current) return;
    d.dy = Math.max(0, e.clientY - d.y0);
    panel.current.style.transition = "none";
    panel.current.style.transform = `translateY(${d.dy}px)`;
  }
  function onPointerUp() {
    const d = drag.current;
    drag.current = null;
    const el = panel.current;
    if (!d || !el) return;
    const fast = d.dy / Math.max(1, performance.now() - d.t0) > 0.6; // lemparan cepat
    if (d.dy > CLOSE_DISTANCE || (fast && d.dy > 30)) {
      el.style.setProperty("--drag", `${d.dy}px`);
      el.style.transform = "";
      el.style.animation = "";
      onClose();
    } else {
      el.style.transition = "transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)";
      el.style.transform = "";
    }
  }

  return createPortal(
    <div ref={root} className="fixed inset-0 z-50 flex items-end justify-center" role="presentation">
      <div
        className={`absolute inset-0 bg-black/45 ${closing ? "animate-backdrop-out" : "animate-backdrop-in"}`}
        onClick={onClose} aria-hidden
      />
      <div
        ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
        className={`relative w-full max-w-md rounded-t-[28px] bg-surface shadow-float outline-none ${
          closing ? "animate-sheet-down" : "animate-sheet-up"
        }`}
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}
      >
        <div
          className="flex cursor-grab touch-none justify-center pb-2 pt-3 active:cursor-grabbing"
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
        >
          <span className="h-1.5 w-10 rounded-full bg-border" aria-hidden />
        </div>
        <div className="flex items-center gap-3 px-5 pb-3">
          <h2 id={titleId} className="min-w-0 flex-1 text-lg font-bold tracking-tight">{title}</h2>
          <button
            type="button" onClick={onClose}
            className="-mr-2 flex min-h-11 shrink-0 items-center gap-1 rounded-full px-3 text-sm font-semibold text-muted hover:bg-surface-2"
          >
            <X className="h-4 w-4" aria-hidden /> Tutup
          </button>
        </div>
        <div className="max-h-[72dvh] overflow-y-auto overscroll-contain px-5 pb-2">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
