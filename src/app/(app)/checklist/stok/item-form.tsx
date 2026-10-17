import { archiveItem, saveItem } from "@/app/actions/stock";
import type { Item } from "@/lib/types";

/** Satuan & harga mengikuti rak (pcs, botol, kg…). Label bebas, tidak perlu kaku. */
export function ItemForm({ item }: { item?: Item }) {
  return (
    <div className="mt-2 flex flex-col gap-2">
      <form action={saveItem} className="grid grid-cols-2 gap-2">
        {item && <input type="hidden" name="id" value={item.id} />}
        <input name="name" required className="input col-span-2" placeholder="Nama barang, mis. Sabun mandi" defaultValue={item?.name} aria-label="Nama barang" />
        <div>
          <label className="label">Satuan di rak</label>
          <input name="unit" className="input" placeholder="pcs / botol / kg" defaultValue={item?.unit ?? "pcs"} />
        </div>
        <div>
          <label className="label">Butuh per bulan</label>
          <input name="monthly_need" inputMode="decimal" className="input" defaultValue={item?.monthly_need ?? 1} />
        </div>
        <div>
          <label className="label">Harga per satuan</label>
          <input name="last_price" inputMode="numeric" className="input" placeholder="Rp" defaultValue={item?.last_price || ""} />
        </div>
        {!item && (
          <div>
            <label className="label">Stok sekarang</label>
            <input name="stock" inputMode="decimal" className="input" defaultValue={0} />
          </div>
        )}
        <button className="btn-primary col-span-2">{item ? "Simpan perubahan" : "Tambah barang"}</button>
      </form>
      {item && (
        <form action={archiveItem}>
          <input type="hidden" name="id" value={item.id} />
          <button className="min-h-10 w-full text-sm text-danger">Hapus dari daftar</button>
        </form>
      )}
    </div>
  );
}
