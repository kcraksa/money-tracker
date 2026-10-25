"use client";

import { useState } from "react";
import { renameCategory } from "@/app/actions/plan";
import { Field } from "@/components/field";
import { Pencil } from "@/components/icons";
import { Sheet } from "@/components/sheet";
import { SubmitButton } from "@/components/submit-button";

/** Tombol "Ubah" + sheet untuk mengganti nama dan ikon kategori. */
export function CategoryEdit({ id, name, icon }: { id: string; name: string; icon: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button" onClick={() => setOpen(true)} aria-label={`Ubah nama ${name}`} aria-haspopup="dialog"
        className="flex min-h-11 items-center gap-1 rounded-full px-2.5 text-sm font-semibold text-primary hover:bg-surface-2"
      >
        <Pencil className="h-4 w-4" aria-hidden /> Ubah
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Ubah kategori">
        <form action={async (fd) => { await renameCategory(fd); setOpen(false); }} className="grid grid-cols-[5rem_1fr] gap-3 pb-2">
          <input type="hidden" name="id" value={id} />
          <Field label="Ikon">
            <input name="icon" className="input text-center text-xl" defaultValue={icon} maxLength={4} />
          </Field>
          <Field label="Nama kategori">
            <input name="name" required autoFocus className="input" defaultValue={name} maxLength={30} />
          </Field>
          <p className="col-span-2 text-sm text-muted">Catatan lama ikut memakai nama baru.</p>
          <SubmitButton pendingLabel="Menyimpan…" className="btn-primary col-span-2">Simpan</SubmitButton>
        </form>
      </Sheet>
    </>
  );
}
