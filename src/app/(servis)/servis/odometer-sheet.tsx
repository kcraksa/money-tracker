"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateOdometer } from "@/app/actions/service";
import { Sheet } from "@/components/sheet";
import { Spinner } from "@/components/spinner";
import { haptic } from "@/lib/haptics";
import { kmText } from "@/lib/format";
import { checkKm } from "@/lib/service/logic";

type Props = { open: boolean; onClose: () => void; vehicle: { id: string; name: string; km: number } };

/** Sheet untuk memperbarui km terkini: cukup ketik angkanya. Turun/lonjakan besar diminta konfirmasi. */
export function OdometerSheet({ open, onClose, vehicle }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(String(vehicle.km));
  const [confirmMsg, setConfirmMsg] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const km = value === "" ? NaN : Number(value);
  const delta = Number.isFinite(km) ? km - vehicle.km : 0;

  function submit(confirmed: boolean) {
    setError("");
    const check = checkKm(km, vehicle.km);
    if (check.level === "invalid") return setError(check.message);
    if (check.level === "confirm" && !confirmed) { haptic("warn"); return setConfirmMsg(check.message); }
    start(async () => {
      let r;
      try {
        r = await updateOdometer(vehicle.id, km, confirmed);
      } catch {
        haptic("warn");
        return setError("Tidak ada koneksi. Coba lagi saat sinyal kembali.");
      }
      if (!r.ok) {
        if (r.needsConfirm) { setConfirmMsg(r.error); return; }
        haptic("warn");
        return setError(r.error);
      }
      haptic("success");
      setConfirmMsg("");
      onClose();
      router.refresh();
    });
  }

  return (
    <Sheet open={open} onClose={onClose} title={`Isi km ${vehicle.name}`}>
      <form onSubmit={(e) => { e.preventDefault(); submit(Boolean(confirmMsg)); }} className="flex flex-col gap-3 pb-2">
        <div>
          <label className="label" htmlFor={`km_${vehicle.id}`}>Angka km di speedometer sekarang</label>
          <input
            id={`km_${vehicle.id}`} inputMode="numeric" autoFocus enterKeyHint="done" placeholder="0"
            className="input text-center text-3xl font-extrabold tabular-nums"
            value={value === "" ? "" : Number(value).toLocaleString("id-ID")}
            onChange={(e) => { setValue(e.target.value.replace(/\D/g, "").slice(0, 7)); setConfirmMsg(""); setError(""); }}
            onFocus={(e) => e.currentTarget.select()}
          />
          <p className="mt-1.5 text-center text-xs text-muted">
            Terakhir {kmText(vehicle.km)}
            {Number.isFinite(km) && delta !== 0 && <> · <b className={delta < 0 ? "text-warn" : "text-ok"}>{delta > 0 ? "+" : "−"}{Math.abs(delta).toLocaleString("id-ID")} km</b></>}
          </p>
        </div>
        {confirmMsg && <p role="alert" className="animate-pop rounded-2xl bg-warn-bg p-3 text-sm text-warn">{confirmMsg}</p>}
        {error && <p role="alert" className="rounded-2xl bg-danger-bg p-3 text-sm text-danger">{error}</p>}
        <button className="btn-primary min-h-14 text-base" disabled={pending || !Number.isFinite(km)}>
          {pending ? <><Spinner /> Menyimpan…</> : confirmMsg ? "Ya, simpan" : "Simpan km"}
        </button>
      </form>
    </Sheet>
  );
}
