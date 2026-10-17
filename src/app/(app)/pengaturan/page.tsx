import Link from "next/link";
import { addQuick, deleteQuick, saveBudgets, saveName, signOut } from "@/app/actions/settings";
import { getCtx } from "@/lib/ctx";
import { rupiah } from "@/lib/format";
import type { Category } from "@/lib/types";

export const metadata = { title: "Pengaturan" };

export default async function PengaturanPage({
  searchParams,
}: { searchParams: Promise<{ baru?: string; tersimpan?: string }> }) {
  const sp = await searchParams;
  const { supabase, me, members, householdId } = await getCtx();

  const [hh, cats, budgets, quicks] = await Promise.all([
    supabase.from("household").select("name, invite_code").eq("id", householdId).single(),
    supabase.from("category").select("id, name, icon, kind, lump_sum, due_day, sort_order").order("sort_order"),
    supabase.from("budget").select("category_id, amount"),
    supabase.from("quick_expense").select("id, label, amount, category_id").order("created_at"),
  ]);
  const categories = (cats.data ?? []) as Category[];
  const budgetOf = new Map((budgets.data ?? []).map((b) => [b.category_id as string, Number(b.amount)]));
  const catById = new Map(categories.map((c) => [c.id, c]));
  const daily = categories.filter((c) => c.kind === "daily");

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center gap-3">
        <Link href="/" aria-label="Kembali" className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2">←</Link>
        <h1 className="text-xl font-bold">Pengaturan</h1>
      </header>

      {sp.tersimpan && <p role="status" className="rounded-xl bg-ok-bg p-3 text-ok">Tersimpan ✓</p>}

      <section className="card flex flex-col gap-2" aria-label="Kode undangan">
        {sp.baru && <p className="font-semibold">Rumah tangga dibuat 🎉 Kirim kode ini ke pasanganmu:</p>}
        <div className="text-sm text-muted">Kode undangan {hh.data?.name ? `· ${hh.data.name}` : ""}</div>
        <div className="text-center text-4xl font-extrabold tracking-[0.3em]">{hh.data?.invite_code}</div>
        <div className="text-sm text-muted">
          Anggota: {members.map((m) => m.display_name).join(", ")}
          {members.length < 2 && " · menunggu pasangan bergabung"}
        </div>
      </section>

      <form action={saveBudgets} className="card flex flex-col gap-4" aria-label="Budget">
        <h2 className="font-semibold">Budget bulanan & tagihan</h2>
        {categories.map((c) => (
          <div key={c.id} className="flex flex-col gap-1">
            <label className="label" htmlFor={`b_${c.id}`}>
              {c.icon} {c.name} {c.kind === "fixed" ? "· nominal tagihan" : c.lump_sum ? "· sekali jalan" : "· budget"}
            </label>
            <div className="flex gap-2">
              <input
                id={`b_${c.id}`} name={`budget_${c.id}`} inputMode="numeric" className="input"
                defaultValue={budgetOf.get(c.id) || ""} placeholder="Rp 0"
              />
              {c.kind === "fixed" && (
                <input
                  name={`due_${c.id}`} inputMode="numeric" className="input w-28" aria-label={`Jatuh tempo ${c.name}`}
                  defaultValue={c.due_day ?? ""} placeholder="Tgl"
                />
              )}
            </div>
          </div>
        ))}
        <p className="text-xs text-muted">Kolom &quot;Tgl&quot; = tanggal jatuh tempo (1–28) untuk tagihan tetap.</p>
        <button className="btn-primary">Simpan budget</button>
      </form>

      <section className="card flex flex-col gap-3" aria-label="Tombol cepat">
        <h2 className="font-semibold">Tombol cepat di layar Catat</h2>
        <ul className="flex flex-col gap-2">
          {(quicks.data ?? []).map((q) => (
            <li key={q.id} className="flex items-center justify-between gap-2">
              <span>{catById.get(q.category_id)?.icon} {q.label} · {rupiah(Number(q.amount))}</span>
              <form action={deleteQuick}>
                <input type="hidden" name="id" value={q.id} />
                <button className="min-h-10 px-3 text-sm text-danger" aria-label={`Hapus ${q.label}`}>Hapus</button>
              </form>
            </li>
          ))}
        </ul>
        <form action={addQuick} className="grid grid-cols-2 gap-2">
          <input name="label" required className="input" placeholder="Nama, mis. Parkir" />
          <input name="amount" required inputMode="numeric" className="input" placeholder="Nominal" />
          <select name="category_id" required className="input col-span-2" defaultValue="">
            <option value="" disabled>Pilih kategori</option>
            {daily.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <button className="btn-soft col-span-2">Tambah tombol cepat</button>
        </form>
      </section>

      <form action={saveName} className="card flex flex-col gap-2" aria-label="Nama">
        <label className="label" htmlFor="dn">Nama tampilan kamu</label>
        <input id="dn" name="display_name" className="input" defaultValue={me.display_name} required />
        <button className="btn-soft">Simpan nama</button>
      </form>

      <form action={signOut}>
        <button className="btn-soft w-full text-danger">Keluar</button>
      </form>
    </div>
  );
}
