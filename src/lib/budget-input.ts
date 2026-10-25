/** Batas wajar satu anggaran (Rp). Kolom database bigint, jadi batas ini hanya untuk mencegah salah ketik. */
export const MAX_BUDGET = 10_000_000_000;

export type AllocationInput = {
  budgets?: Record<string, unknown>;
  dueDays?: Record<string, unknown>;
};

const whole = (v: unknown) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? n : null;
};

/**
 * Bersihkan isian pembagian anggaran dari klien. Hanya kategori yang benar-benar ada (id dikenal) yang dipakai;
 * nominal dibulatkan ke 0..MAX_BUDGET; tanggal bayar hanya untuk tagihan dan hanya 1..28 (selain itu dikosongkan).
 */
export function cleanAllocation(input: AllocationInput, cats: { id: string; kind: string }[]) {
  const budgets: { id: string; amount: number }[] = [];
  const dues: { id: string; due: number | null }[] = [];
  for (const c of cats) {
    if (input.budgets && c.id in input.budgets) {
      const n = whole(input.budgets[c.id]);
      if (n !== null) budgets.push({ id: c.id, amount: Math.min(MAX_BUDGET, Math.max(0, n)) });
    }
    if (c.kind === "fixed" && input.dueDays && c.id in input.dueDays) {
      const d = whole(input.dueDays[c.id]);
      dues.push({ id: c.id, due: d !== null && d >= 1 && d <= 28 ? d : null });
    }
  }
  return { budgets, dues };
}
