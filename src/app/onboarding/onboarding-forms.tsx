"use client";

import { useActionState, useState } from "react";
import { Field } from "@/components/field";
import { ChevronLeft, Home, Users } from "@/components/icons";
import { Logo } from "@/components/logo";
import { SubmitButton } from "@/components/submit-button";
import { createHousehold, joinHousehold, type OnboardingState } from "./actions";

const initial: OnboardingState = {};

/**
 * Satu pertanyaan saja: sudah ada anggota keluarga lain yang memakai aplikasi ini?
 * Jawabannya menentukan satu formulir pendek, bukan dua formulir sekaligus.
 */
export function OnboardingForms({ defaultName }: { defaultName: string }) {
  const [createState, createAction] = useActionState(createHousehold, initial);
  const [joinState, joinAction] = useActionState(joinHousehold, initial);
  const [choice, setChoice] = useState<"new" | "join" | null>(null);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-10">
      <div className="flex flex-col gap-3">
        <Logo size={48} />
        <div>
          <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">Selamat datang</h1>
          <p className="text-muted">Sebelum mulai, satu pertanyaan singkat.</p>
        </div>
      </div>

      {choice === null && (
        <section aria-labelledby="tanya-h" className="flex flex-col gap-3">
          <h2 id="tanya-h" className="text-lg font-bold tracking-tight">Apakah pasangan atau keluargamu sudah memakai aplikasi ini?</h2>
          <button onClick={() => setChoice("new")} className="card flex items-center gap-4 p-4 text-left transition active:scale-[0.99]">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary"><Home className="h-6 w-6" aria-hidden /></span>
            <span>
              <span className="block text-lg font-bold">Belum, saya yang pertama</span>
              <span className="block text-muted">Kamu akan dapat kode untuk dibagikan ke keluarga.</span>
            </span>
          </button>
          <button onClick={() => setChoice("join")} className="card flex items-center gap-4 p-4 text-left transition active:scale-[0.99]">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-warn"><Users className="h-6 w-6" aria-hidden /></span>
            <span>
              <span className="block text-lg font-bold">Sudah, saya punya kode</span>
              <span className="block text-muted">Masukkan kode yang diberikan keluargamu.</span>
            </span>
          </button>
        </section>
      )}

      {choice === "new" && (
        <form action={createAction} className="card animate-pop flex flex-col gap-4 p-5">
          <h2 className="text-lg font-bold tracking-tight">Buat catatan keluarga</h2>
          <Field label="Nama kamu">
            <input name="display_name" required autoFocus defaultValue={defaultName} className="input" placeholder="mis. Budi" />
          </Field>
          <Field label="Nama keluarga" optional>
            <input name="name" className="input" placeholder="mis. Keluarga Budi" />
          </Field>
          <SubmitButton pendingLabel="Membuat…" className="btn-primary min-h-14 text-base">Buat &amp; dapatkan kode</SubmitButton>
          {createState.error && <p role="alert" className="text-sm text-danger">{createState.error}</p>}
          <button type="button" className="btn-ghost" onClick={() => setChoice(null)}><ChevronLeft className="h-4 w-4" aria-hidden /> Kembali</button>
        </form>
      )}

      {choice === "join" && (
        <form action={joinAction} className="card animate-pop flex flex-col gap-4 p-5">
          <h2 className="text-lg font-bold tracking-tight">Gabung dengan kode</h2>
          <Field label="Kode dari keluargamu">
            <input name="code" required autoFocus autoCapitalize="characters" autoComplete="off" className="input text-center text-xl font-bold uppercase tracking-[0.3em]" placeholder="KODE" />
          </Field>
          <Field label="Nama kamu">
            <input name="display_name" required defaultValue={defaultName} className="input" placeholder="mis. Siti" />
          </Field>
          <SubmitButton pendingLabel="Bergabung…" className="btn-primary min-h-14 text-base">Gabung</SubmitButton>
          {joinState.error && <p role="alert" className="text-sm text-danger">{joinState.error}</p>}
          <p className="text-sm text-muted">Kode ada di menu Pengaturan di HP keluargamu yang sudah memakai aplikasi ini.</p>
          <button type="button" className="btn-ghost" onClick={() => setChoice(null)}><ChevronLeft className="h-4 w-4" aria-hidden /> Kembali</button>
        </form>
      )}
    </main>
  );
}
