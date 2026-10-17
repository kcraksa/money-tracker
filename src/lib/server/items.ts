import type { SupabaseClient } from "@supabase/supabase-js";

type DbError = { code?: string; message?: string };

// 42703 = undefined_column (Postgres), dipakai PostgREST saat kolom belum ada di database.
const isMissingColumn = (e: DbError) => e.code === "42703" || /stock_checked_at/i.test(e.message ?? "");

export type ItemsResult<T> = {
  rows: T[];
  /** Database belum memakai migrasi terbaru (kolom stock_checked_at belum ada). Data tetap ditampilkan. */
  outdated: boolean;
  /** Galat lain saat memuat; daftar kosong BUKAN berarti belum ada barang. */
  error: string | null;
};

/**
 * Muat barang aktif beserta waktu cek stok. Bila migrasi 0003 belum dijalankan, tetap muat barangnya
 * (tanpa waktu cek) dan tandai `outdated`, alih-alih menampilkan daftar kosong tanpa penjelasan.
 */
export async function loadActiveItems<T extends Record<string, unknown>>(
  sb: SupabaseClient,
  columns: string,
): Promise<ItemsResult<T & { stock_checked_at: string | null }>> {
  const run = (cols: string) => sb.from("item").select(cols).eq("active", true).order("name");

  const first = await run(`${columns}, stock_checked_at`);
  if (!first.error) {
    return { rows: (first.data ?? []) as unknown as (T & { stock_checked_at: string | null })[], outdated: false, error: null };
  }
  if (!isMissingColumn(first.error)) return { rows: [], outdated: false, error: first.error.message };

  const second = await run(columns);
  if (second.error) return { rows: [], outdated: true, error: second.error.message };
  const rows = ((second.data ?? []) as unknown as T[]).map((r) => ({ ...r, stock_checked_at: null }));
  return { rows, outdated: true, error: null };
}
