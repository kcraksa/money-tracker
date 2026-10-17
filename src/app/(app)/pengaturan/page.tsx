import Link from "next/link";
import { addQuick, deleteQuick, saveName, signOut } from "@/app/actions/settings";
import { CategoryIcon } from "@/components/category-icon";
import { Check, ChevronRight, LogOut, Plus, Trash2, Wallet } from "@/components/icons";
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

  const [hh, cats, quicks] = await Promise.all([
    supabase.from("household").select("name, invite_code").eq("id", householdId).single(),
    supabase.from("category").select("id, name, icon, kind, lump_sum, due_day, sort_order, active").order("sort_order"),
    supabase.from("quick_expense").select("id, label, amount, category_id").order("created_at"),
  ]);
  const categories = (cats.data ?? []) as Category[];
  const catById = new Map(categories.map((c) => [c.id, c]));
  const daily = categories.filter((c) => c.kind === "daily" && c.active !== false);
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

      <Link href="/rencana" transitionTypes={["nav-forward"]} className="card flex items-center gap-3 p-4 transition active:scale-[0.99]">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary"><Wallet className="h-5 w-5" aria-hidden /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Rencana gajian & anggaran</span>
          <span className="block text-xs text-muted">Catat pemasukan, bagi ke tiap pos, kelola pos</span>
        </span>
        <ChevronRight className="h-5 w-5 text-muted" aria-hidden />
      </Link>

      <section className="card flex flex-col gap-4 p-5" aria-label="Tombol cepat">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Tombol cepat tetap</h2>
          <p className="text-xs text-muted">Selalu muncul di layar Catat, satu ketuk langsung tersimpan. Selain ini, pengeluaran yang sering kamu catat muncul otomatis di sana.</p>
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
