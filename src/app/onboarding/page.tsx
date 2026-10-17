"use client";

import { useActionState } from "react";
import { createHousehold, joinHousehold, type OnboardingState } from "./actions";

const initial: OnboardingState = {};

export default function OnboardingPage() {
  const [createState, createAction, creating] = useActionState(createHousehold, initial);
  const [joinState, joinAction, joining] = useActionState(joinHousehold, initial);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 p-6">
      <div>
        <h1 className="text-2xl font-bold">Selamat datang 👋</h1>
        <p className="text-muted">Satu rumah tangga dibuat sekali, pasangan tinggal gabung pakai kode.</p>
      </div>

      <form action={createAction} className="card flex flex-col gap-3">
        <h2 className="font-semibold">Buat rumah tangga baru</h2>
        <input name="name" className="input" placeholder="Nama rumah tangga (opsional)" />
        <input name="display_name" required className="input" placeholder="Nama kamu, mis. Budi" />
        <button className="btn-primary" disabled={creating}>{creating ? "Membuat…" : "Buat & dapatkan kode"}</button>
        {createState.error && <p role="alert" className="text-danger">{createState.error}</p>}
      </form>

      <form action={joinAction} className="card flex flex-col gap-3">
        <h2 className="font-semibold">Gabung pakai kode undangan</h2>
        <input name="code" required className="input uppercase tracking-widest" placeholder="Kode 6 karakter" />
        <input name="display_name" required className="input" placeholder="Nama kamu, mis. Siti" />
        <button className="btn-soft" disabled={joining}>{joining ? "Bergabung…" : "Gabung"}</button>
        {joinState.error && <p role="alert" className="text-danger">{joinState.error}</p>}
      </form>
    </main>
  );
}
