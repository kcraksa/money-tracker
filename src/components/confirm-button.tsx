"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Sheet } from "./sheet";
import { Spinner } from "./spinner";

/**
 * Tombol untuk aksi yang menghapus/menyembunyikan data. Menanyakan konfirmasi dulu supaya
 * salah pencet tidak langsung menghapus (WCAG 3.3.4). Di dalam <form>, konfirmasi mengirim form itu;
 * di luar form, pakai `onConfirm`.
 */
export function ConfirmButton({
  title, message, confirmLabel = "Ya, hapus", onConfirm, className, children, "aria-label": ariaLabel,
}: {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  onConfirm?: () => void;
  className?: string;
  children: React.ReactNode;
  "aria-label"?: string;
}) {
  const { pending } = useFormStatus();
  const btn = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  function confirm() {
    setOpen(false);
    if (onConfirm) onConfirm();
    else btn.current?.form?.requestSubmit();
  }

  return (
    <>
      <button
        ref={btn} type="button" aria-label={ariaLabel} aria-haspopup="dialog" disabled={pending}
        className={className} onClick={() => setOpen(true)}
      >
        {pending ? <Spinner /> : children}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={title}>
        <div className="flex flex-col gap-3 pb-2">
          <p className="text-[15px] leading-relaxed">{message}</p>
          <button type="button" className="btn bg-danger text-bg" onClick={confirm}>{confirmLabel}</button>
          <button type="button" className="btn-soft" onClick={() => setOpen(false)}>Batal, jangan</button>
        </div>
      </Sheet>
    </>
  );
}
