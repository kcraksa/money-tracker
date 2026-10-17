import { AlertTriangle } from "./icons";

/** Pesan jelas saat tabel/kolom baru belum ada di database, supaya tidak tampil seperti "data kosong". */
export function MigrationNotice({ file }: { file: string }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-2xl bg-warn-bg p-3.5 text-sm text-warn">
      <AlertTriangle className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden />
      <p>
        <b>Database belum diperbarui.</b> Jalankan migrasi <code>{file}</code> di Supabase (SQL Editor), lalu muat ulang halaman.
      </p>
    </div>
  );
}
