"use client";

import { useSyncExternalStore } from "react";

// localStorage sebagai sumber data eksternal yang aman untuk SSR (server selalu melihat "").
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export function getLocal(key: string): string {
  try { return localStorage.getItem(key) ?? ""; } catch { return ""; }
}

export function setLocal(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch {}
  listeners.forEach((l) => l());
}

export function useLocal(key: string): string {
  return useSyncExternalStore(subscribe, () => getLocal(key), () => "");
}
