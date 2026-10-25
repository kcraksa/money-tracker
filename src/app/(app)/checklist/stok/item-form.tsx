import { archiveItem, saveItem } from "@/app/actions/stock";
import type { Item } from "@/lib/types";
import { ConfirmButton } from "@/components/confirm-button";
import { Field } from "@/components/field";
import { SubmitButton } from "@/components/submit-button";

/** Satuan & harga mengikuti rak (pcs, botol, kg…). Label bebas, tidak perlu kaku. */
export function ItemForm({ item }: { item?: Item }) {
  return (
    <div className="mt-2 flex flex-col gap-2">
      <form action={saveItem} className="grid grid-cols-2 gap-3">
        {item && <input type="hidden" name="id" value={item.id} />}
        <Field label="Nama barang" className="col-span-2">
          <input name="name" required className="input" placeholder="mis. Sabun mandi" defaultValue={item?.name} />
        </Field>
        <Field label="Satuan di rak">
          <input name="unit" className="input" placeholder="pcs / botol / kg" defaultValue={item?.unit ?? "pcs"} />
        </Field>
        <Field label="Butuh per bulan">
          <input name="monthly_need" inputMode="decimal" className="input" defaultValue={item?.monthly_need ?? 1} />
        </Field>
        <Field label="Harga per satuan">
          <input name="last_price" inputMode="numeric" className="input" placeholder="Rp" defaultValue={item?.last_price || ""} />
        </Field>
        {!item && (
          <Field label="Stok di rumah sekarang">
            <input name="stock" inputMode="decimal" className="input" defaultValue={0} />
          </Field>
        )}
        <SubmitButton pendingLabel="Menyimpan…" className="btn-primary col-span-2 mt-1">{item ? "Simpan perubahan" : "Tambah barang"}</SubmitButton>
      </form>
      {item && (
        <form action={archiveItem}>
          <input type="hidden" name="id" value={item.id} />
          <ConfirmButton
            title={`Hapus ${item.name}?`} confirmLabel="Ya, hapus barang"
            message={<>{item.name} tidak lagi muncul di stok dan daftar belanja. Riwayat belanjanya tetap tersimpan.</>}
            className="min-h-11 w-full text-sm font-semibold text-danger"
          >
            Hapus dari daftar
          </ConfirmButton>
        </form>
      )}
    </div>
  );
}
