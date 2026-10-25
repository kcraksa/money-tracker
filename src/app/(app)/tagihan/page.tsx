import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { Pencil, Receipt } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { getCtx } from "@/lib/ctx";
import { todayISO } from "@/lib/date";
import { loadOverview } from "@/lib/server/overview";
import { readSimpleMode } from "@/lib/server/simple-mode";
import { BillRow } from "../bill-row";

export const metadata = { title: "Tagihan bulanan" };

export default async function TagihanPage() {
  const { supabase } = await getCtx();
  const [o, simple] = await Promise.all([loadOverview(supabase, todayISO()), readSimpleMode()]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Tagihan bulanan" subtitle={o.periodLabel} back="/"
        actions={
          <Link href="/rencana" transitionTypes={["nav-forward"]}
            className="flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-sm font-semibold shadow-card">
            <Pencil className="h-4 w-4 text-primary" aria-hidden /> Atur
          </Link>
        }
      />
      {o.bills.length === 0 ? (
        <EmptyState icon={<Receipt className="h-8 w-8" />} title="Belum ada tagihan">
          <p className="max-w-xs text-sm text-muted">
            Tagihan = pengeluaran yang jumlahnya tetap dan dibayar sekali sebulan, mis. listrik atau internet.
            Tambahkan lewat Atur, lalu pilih jenis <b>Tagihan bulanan</b>.
          </p>
          <Link href="/rencana" transitionTypes={["nav-forward"]} className="btn-primary mt-1">Atur sekarang</Link>
        </EmptyState>
      ) : (
        <section aria-labelledby="tagihan-h">
          <h2 id="tagihan-h" className="sr-only">Daftar tagihan</h2>
          <p className="section-hint">Jumlahnya tetap dan dibayar sekali sebulan, mis. listrik. Ketuk Bayar kalau sudah lunas.</p>
          <ul className="card divide-y divide-border p-0">
            {o.bills.map((b) => <BillRow key={b.categoryId} {...b} simple={simple} />)}
          </ul>
        </section>
      )}
    </div>
  );
}
