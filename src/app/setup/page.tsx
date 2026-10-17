import { Logo } from "@/components/logo";

export default function SetupPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6">
      <Logo size={48} />
      <h1 className="text-2xl font-extrabold tracking-tight">Konfigurasi belum lengkap</h1>
      <p className="text-muted">
        Isi <code className="rounded bg-surface-2 px-1.5 py-0.5 text-sm">NEXT_PUBLIC_SUPABASE_URL</code> dan{" "}
        <code className="rounded bg-surface-2 px-1.5 py-0.5 text-sm">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> di{" "}
        <code className="rounded bg-surface-2 px-1.5 py-0.5 text-sm">.env.local</code> (atau di Vercel → Settings →
        Environment Variables), lalu jalankan ulang. Panduan lengkap ada di README.
      </p>
    </main>
  );
}
