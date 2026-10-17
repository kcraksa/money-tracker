export default function SetupPage() {
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold">Konfigurasi belum lengkap</h1>
      <p className="mt-2 text-muted">
        Isi <code>NEXT_PUBLIC_SUPABASE_URL</code> dan <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> di{" "}
        <code>.env.local</code> (atau di Vercel → Settings → Environment Variables), lalu jalankan ulang.
        Panduan lengkap ada di README.
      </p>
    </main>
  );
}
