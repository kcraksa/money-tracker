import type { SupabaseClient } from "@supabase/supabase-js";

export type QuickRow = { id: string; label: string; amount: number; category_id: string; note: string | null };

/**
 * Muat tombol cepat tetap. Bila migrasi 0006 (kolom note) belum dijalankan, tombolnya tetap dimuat
 * tanpa keterangan alih-alih daftar kosong.
 */
export async function loadQuicks(sb: SupabaseClient): Promise<QuickRow[]> {
  const first = await sb.from("quick_expense").select("id, label, amount, category_id, note").order("created_at");
  if (!first.error) {
    return (first.data ?? []).map((q) => ({ ...q, amount: Number(q.amount), note: (q.note as string | null) ?? null })) as QuickRow[];
  }
  const second = await sb.from("quick_expense").select("id, label, amount, category_id").order("created_at");
  return (second.data ?? []).map((q) => ({ ...q, amount: Number(q.amount), note: null })) as QuickRow[];
}

/** Keterangan yang dipakai saat tombol diketuk: keterangan sendiri, kalau kosong memakai nama tombol. */
export const quickNote = (q: Pick<QuickRow, "label" | "note">) => (q.note?.trim() || q.label).slice(0, 80);
