import { AlertTriangle } from "./icons";

const SQL = "alter table public.item add column if not exists stock_checked_at timestamptz;";

/** Peringatan terlihat saat data gagal dimuat atau database belum diperbarui, supaya tidak tampak "kosong". */
export function DataNotice({ outdated, error }: { outdated?: boolean; error?: string | null }) {
  if (!outdated && !error) return null;
  return (
    <div role="alert" className={`flex items-start gap-3 rounded-2xl p-3.5 text-sm ${error ? "bg-danger-bg text-danger" : "bg-warn-bg text-warn"}`}>
      <AlertTriangle className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden />
      <div className="min-w-0">
        {error ? (
          <p><b>Gagal memuat barang.</b> {error}</p>
        ) : (
          <>
            <p>
              <b>Database belum diperbarui.</b> Jalankan migrasi <code>0003_stock_check.sql</code> di Supabase
              (SQL Editor) agar waktu cek stok tersimpan. Barang tetap ditampilkan.
            </p>
            <code className="mt-2 block overflow-x-auto whitespace-nowrap rounded-lg bg-surface/70 p-2 text-xs text-fg">{SQL}</code>
          </>
        )}
      </div>
    </div>
  );
}
