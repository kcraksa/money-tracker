"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { GoogleIcon } from "@/components/google-icon";
import { Logo } from "@/components/logo";
import { Spinner } from "@/components/spinner";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ initialError }: { initialError: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);

  async function google() {
    setBusy(true);
    setError("");
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/confirm`, queryParams: { prompt: "select_account" } },
    });
    // Bila berhasil, browser langsung dialihkan ke Google.
    if (error) {
      setBusy(false);
      setError("Login Google belum aktif. Cek pengaturan Google di Supabase (lihat README).");
    }
  }

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${location.origin}/auth/confirm` },
    });
    setBusy(false);
    if (error) {
      setError(/rate limit/i.test(error.message)
        ? "Batas pengiriman email tercapai. Coba lagi nanti, atau masuk dengan Google."
        : error.message);
    } else setSent(true);
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
    router.replace("/menu");
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

      <div className="card relative flex flex-col gap-4 p-5">
        <button
          onClick={google} disabled={busy}
          className="btn-soft min-h-14 text-base shadow-card"
        >
          {busy && !sent ? <Spinner className="h-5 w-5" /> : <GoogleIcon />} {busy && !sent ? "Mengalihkan…" : "Lanjutkan dengan Google"}
        </button>
        <p className="text-center text-xs text-muted">
          Pakai akun Google yang sama di HP kamu dan pasangan. Tidak perlu password.
        </p>

        <details className="group border-t border-border pt-3" open={sent}>
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-center text-sm font-medium text-muted">
            Atau masuk dengan email
          </summary>
          {!sent ? (
            <form onSubmit={sendLink} className="mt-3 flex flex-col gap-3">
              <div>
                <label className="label" htmlFor="email">Email</label>
                <input
                  id="email" type="email" required autoComplete="email" inputMode="email"
                  className="input" placeholder="nama@email.com"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button className="btn-primary" disabled={busy}>
                {busy ? <Spinner className="h-[18px] w-[18px]" /> : <Mail className="h-[18px] w-[18px]" aria-hidden />} {busy ? "Mengirim…" : "Kirim link masuk"}
              </button>
            </form>
          ) : (
            <form onSubmit={verify} className="animate-pop mt-3 flex flex-col gap-3">
              <p className="text-sm text-muted">
                Link masuk dikirim ke <b className="text-fg">{email}</b>. Buka dari HP ini, atau masukkan kode 6 digit dari email.
              </p>
              <input
                inputMode="numeric" autoComplete="one-time-code" maxLength={8} aria-label="Kode 6 digit"
                className="input text-center text-2xl font-bold tracking-[0.4em]" placeholder="••••••"
                value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
              <button className="btn-primary" disabled={busy || code.length < 6}>
                {busy && <Spinner />}{busy ? "Memeriksa…" : "Masuk"}
              </button>
              <button type="button" className="btn-ghost min-h-10 text-sm" onClick={() => setSent(false)}>
                Ganti email
              </button>
            </form>
          )}
        </details>
      </div>

      {error && <p role="alert" className="relative rounded-2xl bg-danger-bg p-3.5 text-sm text-danger">{error}</p>}
    </main>
  );
}
