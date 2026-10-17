"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
      <div>
        <div className="text-5xl">🪙</div>
        <h1 className="mt-3 text-3xl font-bold">Catatan Kita</h1>
        <p className="mt-1 text-muted">Catat pengeluaran rumah tangga berdua, tanpa ribet.</p>
      </div>

      {!sent ? (
        <form onSubmit={sendLink} className="card flex flex-col gap-3">
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email" type="email" required autoComplete="email" inputMode="email"
            className="input" placeholder="nama@email.com"
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
          <button className="btn-primary" disabled={busy}>
            {busy ? "Mengirim…" : "Kirim link masuk"}
          </button>
          <p className="text-sm text-muted">Tanpa password. Kami kirim link ke email kamu.</p>
        </form>
      ) : (
        <form onSubmit={verify} className="card flex flex-col gap-3">
          <p>
            Link masuk dikirim ke <b>{email}</b>. Buka dari HP ini, atau masukkan kode 6 digit dari
            email di bawah (cara ini paling aman kalau aplikasi sudah dipasang di layar utama).
          </p>
          <input
            inputMode="numeric" autoComplete="one-time-code" maxLength={8}
            className="input text-center text-2xl tracking-widest" placeholder="123456"
            value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
          <button className="btn-primary" disabled={busy || code.length < 6}>
            {busy ? "Memeriksa…" : "Masuk"}
          </button>
          <button type="button" className="text-sm text-muted underline" onClick={() => setSent(false)}>
            Ganti email
          </button>
        </form>
      )}

      {error && <p role="alert" className="rounded-xl bg-danger-bg p-3 text-danger">{error}</p>}
    </main>
  );
}
