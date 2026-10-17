"use client";

import { useActionState } from "react";
import { Home, Users } from "@/components/icons";
import { Logo } from "@/components/logo";
import { createHousehold, joinHousehold, type OnboardingState } from "./actions";

const initial: OnboardingState = {};

export function OnboardingForms({ defaultName }: { defaultName: string }) {
  const [createState, createAction, creating] = useActionState(createHousehold, initial);
  const [joinState, joinAction, joining] = useActionState(joinHousehold, initial);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-10">
      <div className="flex flex-col gap-3">
        <Logo size={48} />
        <div>
          <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">Selamat datang</h1>
          <p className="text-muted">Satu rumah tangga dibuat sekali, pasangan tinggal gabung pakai kode.</p>
        </div>
      </div>

      <form action={createAction} className="card flex flex-col gap-3 p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary"><Home className="h-5 w-5" aria-hidden /></span>
          <h2 className="font-semibold">Buat rumah tangga baru</h2>
        </div>
        <input name="name" className="input" placeholder="Nama rumah tangga (opsional)" aria-label="Nama rumah tangga" />
        <input name="display_name" required defaultValue={defaultName} className="input" placeholder="Nama kamu, mis. Budi" aria-label="Nama kamu" />
        <button className="btn-primary" disabled={creating}>{creating ? "Membuat…" : "Buat & dapatkan kode"}</button>
        {createState.error && <p role="alert" className="text-sm text-danger">{createState.error}</p>}
      </form>

      <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-muted" aria-hidden>
        <span className="h-px flex-1 bg-border" /> atau <span className="h-px flex-1 bg-border" />
      </div>

      <form action={joinAction} className="card flex flex-col gap-3 p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-warn"><Users className="h-5 w-5" aria-hidden /></span>
          <h2 className="font-semibold">Gabung pakai kode undangan</h2>
        </div>
        <input name="code" required className="input text-center font-bold uppercase tracking-[0.3em]" placeholder="KODE" aria-label="Kode undangan" />
        <input name="display_name" required defaultValue={defaultName} className="input" placeholder="Nama kamu, mis. Siti" aria-label="Nama kamu" />
        <button className="btn-soft" disabled={joining}>{joining ? "Bergabung…" : "Gabung"}</button>
        {joinState.error && <p role="alert" className="text-sm text-danger">{joinState.error}</p>}
      </form>
    </main>
  );
}
