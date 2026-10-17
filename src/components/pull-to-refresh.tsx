"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { haptic } from "@/lib/haptics";
import { RefreshCw } from "./icons";

const THRESHOLD = 72;
const MAX = 128;
const DEAD_ZONE = 10;

/** Tarik ke bawah dari paling atas untuk menyegarkan data, dengan efek karet seperti aplikasi native. */
export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const wrap = useRef<HTMLDivElement>(null);
  const spinner = useRef<HTMLDivElement>(null);
  const refreshing = useRef(false);
  const apply = useRef<(pull: number, animate: boolean, spinning?: boolean) => void>(() => {});

  useEffect(() => {
    const el = wrap.current;
    const sp = spinner.current;
    if (!el || !sp || !navigator.maxTouchPoints) return;

    let y0 = 0;
    let pull = 0;
    let tracking = false;
    let armed = false;

    apply.current = (p, animate, spinning = false) => {
      const t = animate ? "transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s" : "none";
      el.style.transition = t;
      el.style.transform = p ? `translateY(${p}px)` : "";
      sp.style.transition = t;
      sp.style.opacity = String(Math.min(1, p / (THRESHOLD * 0.8)));
      sp.style.transform = `translate(-50%, ${p * 0.5 - 28}px) rotate(${spinning ? 0 : p * 3}deg)`;
    };

    const blocked = (target: EventTarget | null) =>
      target instanceof Element && Boolean(target.closest("[data-no-ptr], input, textarea, select, dialog"));

    const onStart = (e: TouchEvent) => {
      if (refreshing.current || window.scrollY > 0 || document.body.dataset.sheetOpen || blocked(e.target)) return;
      y0 = e.touches[0].clientY;
      tracking = true;
      armed = false;
      pull = 0;
    };
    const onMove = (e: TouchEvent) => {
      if (!tracking) return;
      const dy = e.touches[0].clientY - y0 - DEAD_ZONE;
      if (dy <= 0 || window.scrollY > 0) {
        if (pull > 0) { pull = 0; apply.current(0, true); }
        return;
      }
      pull = MAX * (1 - Math.exp(-dy / (MAX * 1.4))); // efek karet: makin jauh makin berat
      apply.current(pull, false);
      if (pull >= THRESHOLD && !armed) { armed = true; haptic("select"); }
      if (pull < THRESHOLD) armed = false;
    };
    const onEnd = () => {
      if (!tracking) return;
      tracking = false;
      if (armed) {
        refreshing.current = true;
        apply.current(THRESHOLD * 0.7, true, true);
        start(() => router.refresh());
      } else apply.current(0, true);
      pull = 0;
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [router]);

  // Selesai menyegarkan: kembalikan konten ke posisi semula.
  useEffect(() => {
    if (!pending && refreshing.current) {
      refreshing.current = false;
      haptic("tap");
      apply.current(0, true);
    }
  }, [pending]);

  return (
    <>
      <div
        ref={spinner} aria-hidden
        className="pointer-events-none fixed left-1/2 top-[max(env(safe-area-inset-top),0px)] z-30 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-primary opacity-0 shadow-float"
        style={{ transform: "translate(-50%, -28px)" }}
      >
        <RefreshCw className={`h-[18px] w-[18px] ${pending ? "animate-spin" : ""}`} />
      </div>
      <div ref={wrap}>{children}</div>
    </>
  );
}
