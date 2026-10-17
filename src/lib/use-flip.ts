"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Animasi FLIP untuk daftar: saat urutan/posisi anak berubah, tiap anak [data-flip="<id>"]
 * meluncur dari posisi lamanya ke posisi baru (bukan melompat). Hanya translateY, jadi ringan.
 */
export function useFlip<T extends HTMLElement>(duration = 280) {
  const ref = useRef<T>(null);
  const prev = useRef(new Map<string, number>());

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nodes = root.querySelectorAll<HTMLElement>("[data-flip]");
    const next = new Map<string, number>();
    nodes.forEach((n) => next.set(n.dataset.flip!, n.getBoundingClientRect().top + window.scrollY));

    if (!reduce) {
      nodes.forEach((n) => {
        const id = n.dataset.flip!;
        const was = prev.current.get(id);
        const now = next.get(id)!;
        if (was !== undefined && Math.abs(was - now) > 1) {
          n.animate(
            [{ transform: `translateY(${was - now}px)` }, { transform: "translateY(0)" }],
            { duration, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
          );
        }
      });
    }
    prev.current = next;
  });

  return ref;
}
