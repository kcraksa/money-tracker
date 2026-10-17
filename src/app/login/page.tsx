"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${location.origin}/auth/confirm` },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await createClient().auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    if (error) {
      setBusy(false);
      setError("Kode salah atau sudah kedaluwarsa.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 overflow-hidden px-6 py-10">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-accent/15 blur-3xl" aria-hidden />

      <div className="relative flex flex-col gap-4">
        <Logo size={64} />
        <div>
          <h1 className="text-[32px] font-extrabold leading-tight tracking-tight">Catatan Kita</h1>
          <p className="mt-1 text-base text-muted">Catat pengeluaran rumah tangga berdua, cepat dan tanpa ribet.</p>
        </div>
      </div>

      {!sent ? (
        <form onSubmit={sendLink} className="card relative flex flex-col gap-4 p-5">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email" type="email" required autoComplete="email" inputMode="email"
              className="input" placeholder="nama@email.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button className="btn-primary" disabled={busy}>
            <Mail className="h-[18px] w-[18px]" aria-hidden /> {busy ? "Mengirim…" : "Kirim link masuk"}
          </button>
          <p className="text-center text-xs text-muted">Tanpa password. Kami kirim link masuk ke emailmu.</p>
        </form>
      ) : (
        <form onSubmit={verify} className="card animate-pop relative flex flex-col gap-4 p-5">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Cek emailmu</h2>
            <p className="mt-1 text-sm text-muted">
              Link masuk dikirim ke <b className="text-fg">{email}</b>. Buka dari HP ini, atau masukkan kode 6 digit
              dari email (paling mudah kalau aplikasi sudah dipasang di layar utama).
            </p>
          </div>
          <input
            inputMode="numeric" autoComplete="one-time-code" maxLength={8} aria-label="Kode 6 digit"
            className="input text-center text-2xl font-bold tracking-[0.4em]" placeholder="••••••"
            value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
          <button className="btn-primary" disabled={busy || code.length < 6}>
            {busy ? "Memeriksa…" : "Masuk"}
          </button>
          <button type="button" className="btn-ghost min-h-10 text-sm" onClick={() => setSent(false)}>
            Ganti email
          </button>
        </form>
      )}

      {error && <p role="alert" className="relative rounded-2xl bg-danger-bg p-3.5 text-sm text-danger">{error}</p>}
    </main>
  );
}
