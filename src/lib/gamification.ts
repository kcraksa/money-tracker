import { addDays } from "./date";

export const XP = {
  log: 10, // catatan pertama tiap hari per orang
  streakWeek: 30, // bonus tiap kelipatan 7 hari streak
  bill: 25, // tagihan tetap lunas tepat waktu
  bonus: 40, // belanja aktual tidak melebihi rekomendasi
  budget: 20, // per kategori yang aman di akhir bulan (XP keluarga)
  quest: 50, // quest mingguan selesai (XP keluarga)
  savingPerRupiah: 2000, // 1 poin hemat tiap Rp 2.000 yang dihemat
  savingCap: 100,
} as const;

export const savingPoints = (saved: number) =>
  Math.min(XP.savingCap, Math.max(0, Math.floor(saved / XP.savingPerRupiah)));

/** Level n dimulai di 50 * (n-1)^2 XP. */
export function levelInfo(xp: number) {
  const level = Math.floor(Math.sqrt(xp / 50)) + 1;
  const floor = 50 * (level - 1) ** 2;
  const next = 50 * level ** 2;
  return { level, into: xp - floor, span: next - floor, pct: Math.round(((xp - floor) / (next - floor)) * 100) };
}

/**
 * Streak catat harian keluarga: hari berurutan yang ada catatannya.
 * Streak masih hidup kalau hari ini belum dicatat tapi kemarin sudah.
 */
export function computeStreak(dates: string[], today: string): number {
  const set = new Set(dates);
  let day = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

export const BADGES = [
  { code: "belanja_sesuai", icon: "cart", title: "Belanja Sesuai Rekomendasi", desc: "Semua barang terbeli sesuai daftar, total tidak melebihi estimasi." },
  { code: "budget_aman", icon: "shield", title: "Budget Aman", desc: "Semua kategori harian berakhir di bawah budget bulan itu." },
  { code: "listrik_tepat", icon: "bolt", title: "Listrik Lunas Tepat Waktu", desc: "Tagihan listrik dibayar sebelum jatuh tempo." },
] as const;
export type BadgeCode = (typeof BADGES)[number]["code"];

export const QUESTS = [
  { code: "catat_harian", icon: "notebook", title: "Catat 5 hari minggu ini", desc: "Tiap hari ada catatan, sekecil apa pun." },
  { code: "berdua_kompak", icon: "users", title: "Berdua kompak", desc: "Masing-masing mencatat minimal 3 pengeluaran minggu ini." },
  { code: "stok_rapi", icon: "package", title: "Stok rapi", desc: "Perbarui stok rumah 10 kali minggu ini." },
] as const;
export type QuestCode = (typeof QUESTS)[number]["code"];

export type QuestContext = {
  weekDates: string[]; // tanggal-tanggal yang ada catatannya minggu ini
  expensesByMember: Record<string, number>; // jumlah catatan minggu ini per anggota
  memberCount: number;
  stockChanges: number;
};

export function questProgress(code: QuestCode, ctx: QuestContext): { done: number; target: number } {
  switch (code) {
    case "catat_harian":
      return { done: Math.min(5, new Set(ctx.weekDates).size), target: 5 };
    case "berdua_kompak": {
      const target = Math.max(1, ctx.memberCount);
      const done = Object.values(ctx.expensesByMember).filter((n) => n >= 3).length;
      return { done: Math.min(target, done), target };
    }
    case "stok_rapi":
      return { done: Math.min(10, ctx.stockChanges), target: 10 };
  }
}
