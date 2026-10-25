"use client";

import { useState } from "react";
import { haptic } from "@/lib/haptics";
import { OdometerSheet } from "../odometer-sheet";

export function OdometerButton({ vehicle, highlight }: { vehicle: { id: string; name: string; km: number }; highlight?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => { haptic("tap"); setOpen(true); }} aria-label={`Isi km ${vehicle.name}`}
        className={`min-h-11 shrink-0 rounded-xl px-4 text-sm font-semibold transition active:scale-95 ${highlight ? "bg-primary text-primary-fg" : "border border-control bg-surface"}`}
      >
        Isi km
      </button>
      <OdometerSheet open={open} onClose={() => setOpen(false)} vehicle={vehicle} />
    </>
  );
}
