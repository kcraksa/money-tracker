"use server";

import { after } from "next/server";
import { getCtx } from "@/lib/ctx";
import { addDays, todayISO } from "@/lib/date";
import { XP, computeStreak } from "@/lib/gamification";
import { cleanAmount, cleanSpentOn } from "@/lib/expense-input";
import { afterActivity, award } from "@/lib/server/xp";

export type LogResult =
  | { ok: true; id: string; xp: number; streak: number; duplicate?: boolean }
  | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function logExpense(input: {
  id?: string; // dibuat di klien supaya pengiriman ulang (antrean offline) tidak menggandakan
  categoryId: string;
  amount: number;
  spentOn?: string;
  note?: string;
}): Promise<LogResult> {
  const { supabase, me, householdId } = await getCtx();
  const today = todayISO();

  const amount = cleanAmount(input.amount);
  if (amount === null) return { ok: false, error: "Nominal tidak valid" };
  const spentOn = cleanSpentOn(input.spentOn, today, 31) ?? today;

  const row = {
    ...(input.id && UUID.test(input.id) ? { id: input.id } : {}),
    household_id: householdId,
    category_id: input.categoryId,
    member_id: me.id,
    amount,
    spent_on: spentOn,
    note: input.note?.trim() || null,
  };
  // Jalur kritis: hanya yang perlu sebelum pengguna melihat "tersimpan".
  const { data, error } = await supabase.from("expense").insert(row).select("id").single();
  if (error) {
    if (error.code === "23505" && row.id) return { ok: true, id: row.id, xp: 0, streak: 0, duplicate: true };
    return { ok: false, error: "Gagal menyimpan, coba lagi." };
  }

  // XP catat harian + data streak diambil bersamaan (satu putaran, bukan berurutan).
  const [logged, days] = await Promise.all([
    award(supabase, {
      householdId, memberId: me.id, kind: "log", points: XP.log,
      ref: `log:${me.id}:${spentOn}`, note: "Catat harian",
    }).catch(() => false), // gagal memberi XP tidak boleh menggagalkan simpan pengeluaran
    supabase.from("expense").select("spent_on").gte("spent_on", addDays(today, -120)),
  ]);
  const streak = computeStreak((days.data ?? []).map((d) => d.spent_on as string), today);

  // Sisanya (bonus streak, quest, penutupan periode) tidak perlu ditunggu pengguna.
  after(async () => {
    try {
      if (spentOn === today && streak > 0 && streak % 7 === 0) {
        await award(supabase, {
          householdId, memberId: me.id, kind: "streak", points: XP.streakWeek,
          ref: `streak:${today}`, note: `Mencatat ${streak} hari berturut-turut`,
        });
      }
      await afterActivity(supabase, householdId, today);
    } catch (e) {
      console.error("logExpense after()", e);
    }
  });

  return { ok: true, id: data.id as string, xp: logged ? XP.log : 0, streak };
}

export async function undoExpense(id: string): Promise<{ ok: boolean }> {
  const { supabase } = await getCtx();
  const { error } = await supabase.from("expense").delete().eq("id", id);
  return { ok: !error };
}

/**
 * Ubah catatan pengeluaran sendiri (nominal, kategori, tanggal, keterangan). Aturan akses database
 * hanya mengizinkan pencatat aslinya; XP yang sudah diberikan tidak ditarik kembali.
 */
export async function updateExpense(input: {
  id: string; categoryId: string; amount: number; spentOn: string; note?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase } = await getCtx();
  const amount = cleanAmount(input.amount);
  if (amount === null) return { ok: false, error: "Isi jumlah uang dengan angka." };
  const spentOn = cleanSpentOn(input.spentOn, todayISO());
  if (!spentOn) return { ok: false, error: "Tanggalnya tidak bisa dipakai. Pilih tanggal dalam 2 bulan terakhir." };
  if (!UUID.test(input.id) || !UUID.test(input.categoryId)) return { ok: false, error: "Data tidak lengkap." };

  const { data, error } = await supabase.from("expense")
    .update({ category_id: input.categoryId, amount, spent_on: spentOn, note: input.note?.trim().slice(0, 80) || null })
    .eq("id", input.id).select("id");
  // 42501 = aturan akses database: catatan ini milik anggota lain.
  if (error?.code === "42501") return { ok: false, error: "Catatan ini dicatat oleh orang lain, jadi hanya dia yang bisa mengubahnya." };
  if (error) return { ok: false, error: "Gagal menyimpan, coba lagi." };
  // Tidak ada baris berubah = bukan catatan milikmu (atau sudah dihapus).
  if (!data || data.length === 0) return { ok: false, error: "Catatan ini tidak bisa diubah. Mungkin dicatat oleh orang lain atau sudah dihapus." };
  return { ok: true };
}
