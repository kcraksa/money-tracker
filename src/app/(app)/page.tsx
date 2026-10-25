import { getCtx } from "@/lib/ctx";
import { greeting, todayISO } from "@/lib/date";
import { levelInfo } from "@/lib/gamification";
import { loadOverview } from "@/lib/server/overview";
import { readSimpleMode } from "@/lib/server/simple-mode";
import { HomeView } from "./home-view";

export const metadata = { title: "Beranda" };

export default async function BerandaPage() {
  const { supabase, me } = await getCtx();
  const simple = await readSimpleMode();
  const today = todayISO();

  // Beranda hanya ringkasan + pintasan: rincian per kategori, tagihan, dan poin ada di halamannya masing-masing.
  const [o, xp] = await Promise.all([
    loadOverview(supabase, today),
    simple ? Promise.resolve({ data: [] as { points: number }[] }) : supabase.from("xp_event").select("points"),
  ]);
  const totalXp = (xp.data ?? []).reduce((s, r) => s + Number(r.points), 0);

  return (
    <HomeView
      simple={simple}
      greeting={greeting()}
      name={me.display_name}
      periodLabel={o.periodLabel}
      day={o.day}
      totalDays={o.totalDays}
      hasPeriod={o.hasPeriod}
      overdue={o.overdue}
      income={o.incomeTotal > 0 ? { total: o.incomeTotal, allocated: o.allocated } : null}
      totalSpent={o.totalSpent}
      totalBudget={o.allocated}
      alertCount={o.alertCount}
      unpaidBills={o.unpaidBills}
      level={simple ? null : levelInfo(totalXp).level}
    />
  );
}
