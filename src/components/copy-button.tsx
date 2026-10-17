"use client";

import { useState } from "react";
import { Check, Copy } from "./icons";

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {}
      }}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white/15 px-4 text-sm font-semibold text-white transition active:scale-95"
      aria-label={label}
    >
      {done ? <><Check className="h-4 w-4" aria-hidden /> Tersalin</> : <><Copy className="h-4 w-4" aria-hidden /> Salin kode</>}
    </button>
  );
}
