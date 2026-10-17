export type ExpenseLite = { category_id: string; amount: number; note: string | null; spent_on: string };

export type Frequent = {
  categoryId: string;
  amount: number;
  note: string | null;
  count: number;
  last: string; // tanggal terakhir dicatat
};

const clean = (n: string | null | undefined) => (n ?? "").trim().replace(/\s+/g, " ");

/**
 * Pengeluaran yang sering dicatat: kombinasi kategori + nominal + keterangan yang sama.
 * Dipakai untuk pills aksi cepat di layar Catat. Urut: paling sering, lalu paling baru.
 * Keterangan tidak membedakan huruf besar/kecil; yang ditampilkan adalah penulisan terbaru.
 */
export function frequentExpenses(
  rows: ExpenseLite[],
  opts: { minCount?: number; limit?: number; categories?: Set<string> } = {},
): Frequent[] {
  const { minCount = 2, limit = 6, categories } = opts;
  const groups = new Map<string, Frequent>();

  for (const r of rows) {
    const amount = Math.round(Number(r.amount));
    if (!(amount > 0)) continue;
    if (categories && !categories.has(r.category_id)) continue;
    const note = clean(r.note);
    const key = `${r.category_id}|${amount}|${note.toLowerCase()}`;
    const g = groups.get(key);
    if (!g) {
      groups.set(key, { categoryId: r.category_id, amount, note: note || null, count: 1, last: r.spent_on });
    } else {
      g.count++;
      if (r.spent_on > g.last) {
        g.last = r.spent_on;
        g.note = note || null;
      }
    }
  }

  return [...groups.values()]
    .filter((g) => g.count >= minCount)
    .sort((a, b) => b.count - a.count || b.last.localeCompare(a.last) || b.amount - a.amount)
    .slice(0, limit);
}
