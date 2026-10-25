import Link from "next/link";
import { AlertTriangle, Check, ChevronRight } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { getCtx } from "@/lib/ctx";
import { addDays, todayISO } from "@/lib/date";
import { isOverdue, periodLabel, shortDate } from "@/lib/period";
import { loadPeriodContext } from "@/lib/server/period";
import { AllocationForm, type AllocCategory } from "./allocation-form";
import { IncomeCard } from "./income-card";

export const metadata = { title: "Atur anggaran" };

const ERRORS: Record<string, string> = {
  nominal: "Isi nominal pemasukan.",
  periode: "Gagal menyimpan gajian baru, coba lagi.",
};

export default async function RencanaPage({
  searchParams,
}: { searchParams: Promise<{ tersimpan?: string; err?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await getCtx();
  const today = todayISO();
  const { period, periodId, budgets } = await loadPeriodContext(supabase, today);

  const [cats, incomes] = await Promise.all([
    supabase.from("category").select("id, name, icon, kind, lump_sum, due_day, sort_order").eq("active", true).order("sort_order"),
    periodId
      ? supabase.from("income").select("id, amount, label, received_on").eq("period_id", periodId).order("received_on")
      : Promise.resolve({ data: [] }),
  ]);

  const categories: AllocCategory[] = (cats.data ?? []).map((c) => ({
    id: c.id, name: c.name, icon: c.icon, kind: c.kind, lump_sum: c.lump_sum,
    due_day: c.due_day, amount: budgets.get(c.id) ?? 0,
  }));
  const incomeRows = (incomes.data ?? []) as { id: string; amount: number; label: string; received_on: string }[];
  const incomeTotal = incomeRows.reduce((s, r) => s + Number(r.amount), 0);
  const overdue = isOverdue(period, today);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Atur anggaran" subtitle={periodLabel(period)} back="/" />

      {sp.tersimpan && (
        <p role="status" className="animate-pop flex items-center gap-2 rounded-2xl bg-ok-bg p-3.5 text-sm font-medium text-ok">
          <Check className="h-4 w-4" aria-hidden /> Tersimpan
        </p>
      )}
      {sp.err && ERRORS[sp.err] && (
        <p role="alert" className="rounded-2xl bg-danger-bg p-3.5 text-sm text-danger">{ERRORS[sp.err]}</p>
      )}
      {overdue && (
        <p className="flex items-start gap-3 rounded-2xl bg-warn-bg p-3.5 text-sm text-warn">
          <AlertTriangle className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden />
          Sudah lebih dari sebulan sejak gajian terakhir. Tambah gajian baru supaya hitungan anggaran dimulai lagi.
        </p>
      )}

      <IncomeCard
        incomes={incomeRows.map((r) => ({ id: r.id, label: r.label, amount: Number(r.amount), dateLabel: shortDate(r.received_on) }))}
        total={incomeTotal} today={today} minDate={addDays(today, -62)} explicitPeriod={period.explicit}
      />

      <AllocationForm categories={categories} incomeTotal={incomeTotal} />

      <Link href="/rencana/kategori" transitionTypes={["nav-forward"]} className="flex min-h-12 items-center justify-between gap-3 rounded-2xl px-1 text-[15px] font-semibold text-primary">
        <span>Tambah, ubah, atau hapus kategori</span>
        <ChevronRight className="h-5 w-5" aria-hidden />
      </Link>
    </div>
  );
}
