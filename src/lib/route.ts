import type { ListItem } from "./types";

/**
 * Urutan rak dipelajari dari urutan centang saat belanja.
 * Posisi 0 = paling awal rute, 1 = paling akhir. Tiap belanja menggeser rata-rata sedikit,
 * jadi kebiasaan terbaru lebih berpengaruh tapi satu belanja acak tidak merusak semuanya.
 */
export type OrderEntry = { avg: number; samples: number };

const MAX_WEIGHT_SAMPLES = 8;

export function learnOrder(prev: Map<string, OrderEntry>, checkedInOrder: string[]): Map<string, OrderEntry> {
  const ids = [...new Set(checkedInOrder)];
  const n = ids.length;
  if (n < 2) return new Map(); // satu barang tidak memberi informasi urutan
  const next = new Map<string, OrderEntry>();
  ids.forEach((id, i) => {
    const pos = i / (n - 1);
    const old = prev.get(id);
    if (!old) return next.set(id, { avg: pos, samples: 1 });
    const w = 1 / Math.min(old.samples + 1, MAX_WEIGHT_SAMPLES);
    next.set(id, { avg: old.avg + (pos - old.avg) * w, samples: old.samples + 1 });
  });
  return next;
}

export type RoutedItem = ListItem & { known: boolean };

/**
 * Urutan tampil: yang belum dicentang mengikuti rute toko (barang yang posisinya belum
 * diketahui di bagian akhir), lalu yang sudah dicentang menurut waktu centang.
 */
export function sortByRoute(
  items: ListItem[],
  order: Map<string, OrderEntry>,
  checkedAt: Map<string, number> = new Map(),
): RoutedItem[] {
  const pos = (i: ListItem) => (i.item_id ? order.get(i.item_id)?.avg : undefined);
  const withKnown = items.map((i) => ({ ...i, known: pos(i) !== undefined }));

  const open = withKnown
    .filter((i) => !i.checked)
    .sort((a, b) => {
      if (a.known !== b.known) return a.known ? -1 : 1;
      if (a.known) return pos(a)! - pos(b)! || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });
  const done = withKnown
    .filter((i) => i.checked)
    .sort((a, b) => (checkedAt.get(a.id) ?? 0) - (checkedAt.get(b.id) ?? 0));
  return [...open, ...done];
}
