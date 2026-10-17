import { addQuick, deleteQuick, saveBudgets, saveName, signOut } from "@/app/actions/settings";
import { CategoryIcon } from "@/components/category-icon";
import { Check, LogOut, Plus, Trash2 } from "@/components/icons";
import { CopyButton } from "@/components/copy-button";
import { PageHeader } from "@/components/page-header";
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
  const code = hh.data?.invite_code ?? "";

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Pengaturan" subtitle={hh.data?.name ?? undefined} back="/" />

      {sp.tersimpan && (
        <p role="status" className="animate-pop flex items-center gap-2 rounded-2xl bg-ok-bg p-3.5 text-sm font-medium text-ok">
          <Check className="h-4 w-4" aria-hidden /> Tersimpan
        </p>
      )}

      <section
        aria-label="Kode undangan"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-hero-from to-hero-to p-5 text-white shadow-float"
      >
        <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/10" aria-hidden />
        {sp.baru && <p className="relative mb-2 text-sm font-semibold">Rumah tangga dibuat 🎉 Kirim kode ini ke pasanganmu:</p>}
        <div className="relative text-sm font-medium opacity-80">Kode undangan</div>
        <div className="relative my-1 text-[38px] font-extrabold tracking-[0.25em]">{code}</div>
        <div className="relative flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm opacity-80">
            {members.map((m) => m.display_name).join(" & ")}
            {members.length < 2 && " · menunggu pasangan"}
          </span>
          <CopyButton value={code} label="Salin kode undangan" />
        </div>
      </section>

      <form action={saveBudgets} className="card flex flex-col gap-4 p-5" aria-label="Budget">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Budget bulanan & tagihan</h2>
          <p className="text-xs text-muted">Kolom &quot;Tgl&quot; = tanggal jatuh tempo (1–28) untuk tagihan tetap.</p>
        </div>
        {categories.map((c) => (
          <div key={c.id} className="flex items-center gap-3">
            <CategoryIcon icon={c.icon} size="sm" />
            <div className="min-w-0 flex-1">
              <label className="mb-1 block truncate text-sm font-semibold" htmlFor={`b_${c.id}`}>
                {c.name}
                <span className="ml-1.5 text-xs font-normal text-muted">
                  {c.kind === "fixed" ? "tagihan" : c.lump_sum ? "sekali jalan" : "budget"}
                </span>
              </label>
              <div className="flex gap-2">
                <input
                  id={`b_${c.id}`} name={`budget_${c.id}`} inputMode="numeric" className="input min-h-11"
                  defaultValue={budgetOf.get(c.id) || ""} placeholder="Rp 0"
                />
                {c.kind === "fixed" && (
                  <input
                    name={`due_${c.id}`} inputMode="numeric" className="input min-h-11 w-20 text-center" aria-label={`Jatuh tempo ${c.name}`}
                    defaultValue={c.due_day ?? ""} placeholder="Tgl"
                  />
                )}
              </div>
            </div>
          </div>
        ))}
        <button className="btn-primary">Simpan budget</button>
      </form>

      <section className="card flex flex-col gap-4 p-5" aria-label="Tombol cepat">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Tombol cepat</h2>
          <p className="text-xs text-muted">Muncul di layar Catat, satu tap langsung tersimpan.</p>
        </div>
        {(quicks.data ?? []).length > 0 && (
          <ul className="flex flex-col divide-y divide-border">
            {(quicks.data ?? []).map((q) => (
              <li key={q.id} className="flex items-center gap-3 py-2.5">
                <CategoryIcon icon={catById.get(q.category_id)?.icon ?? "💸"} size="sm" />
                <span className="min-w-0 flex-1 truncate font-medium">{q.label}</span>
                <span className="font-semibold tabular-nums">{rupiah(Number(q.amount))}</span>
                <form action={deleteQuick}>
                  <input type="hidden" name="id" value={q.id} />
                  <button aria-label={`Hapus ${q.label}`} className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-surface-2">
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={addQuick} className="grid grid-cols-2 gap-2">
          <input name="label" required className="input" placeholder="Nama, mis. Parkir" aria-label="Nama tombol" />
          <input name="amount" required inputMode="numeric" className="input" placeholder="Nominal" aria-label="Nominal" />
          <select name="category_id" required className="input col-span-2" defaultValue="" aria-label="Kategori">
            <option value="" disabled>Pilih kategori</option>
            {daily.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <button className="btn-soft col-span-2"><Plus className="h-4 w-4" aria-hidden /> Tambah tombol cepat</button>
        </form>
      </section>

      <form action={saveName} className="card flex flex-col gap-3 p-5" aria-label="Nama">
        <label className="text-base font-semibold tracking-tight" htmlFor="dn">Nama tampilan kamu</label>
        <input id="dn" name="display_name" className="input" defaultValue={me.display_name} required />
        <button className="btn-soft">Simpan nama</button>
      </form>

      <form action={signOut}>
        <button className="btn-soft w-full text-danger"><LogOut className="h-[18px] w-[18px]" aria-hidden /> Keluar</button>
      </form>
    </div>
  );
}
