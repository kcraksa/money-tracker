"use client";

import { useFormStatus } from "react-dom";
import { Spinner } from "./spinner";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Teks saat memproses; bila kosong, teks aslinya tetap tampil dengan spinner di depannya. */
  pendingLabel?: React.ReactNode;
  /** Tombol berisi ikon saja: ikon diganti spinner saat memproses. */
  iconOnly?: boolean;
};

/**
 * Tombol kirim untuk <form action={...}>: otomatis menampilkan spinner dan menonaktifkan diri
 * selama aksi berjalan (termasuk sampai pindah halaman selesai), jadi tidak bisa terkirim ganda.
 */
export function SubmitButton({ children, pendingLabel, iconOnly, disabled, className, ...rest }: Props) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" {...rest} className={className} disabled={pending || disabled} aria-busy={pending}>
      {pending ? (
        iconOnly ? <Spinner className="h-[18px] w-[18px]" /> : <><Spinner />{pendingLabel ?? children}</>
      ) : children}
    </button>
  );
}
