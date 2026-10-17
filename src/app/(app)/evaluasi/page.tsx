import { getCtx } from "@/lib/ctx";
import { todayISO } from "@/lib/date";
import { periodLabel, resolvePeriod } from "@/lib/period";
import { loadPeriodContext } from "@/lib/server/period";
import { evaluate, lineTotal } from "@/lib/shopping";
import type { ListItem } from "@/lib/types";
import { EvaluasiView } from "./evaluasi-view";

export const metadata = { title: "Evaluasi belanja" };

export default async function EvaluasiPage({ searchParams }: { searchParams: Promise<{ bulan?: string }> }) {
  const sp = await searchParams;
  const { supabase, members } = await getCtx();
  const { starts, period } = await loadPeriodContext(supabase, todayISO());
  const current = period.start;
  const month = sp.bulan && /^\d{4}-\d{2}-\d{2}$/.test(sp.bulan) ? sp.bulan : current;
  const nameOf = new Map(members.map((m) => [m.id, m.display_name]));

  // Navigasi antar periode yang punya checklist belanja.
  const { data: all } = await supabase.from("shopping_list").select("month").order("month");
  const months = ((all ?? []) as { month: string }[]).map((r) => r.month);
  const prev = months.filter((m) => m < month).at(-1);
  const next = months.find((m) => m > month);

  const base = {
    monthLabel: periodLabel(resolvePeriod(starts, month)),
    prevHref: prev ? `/evaluasi?bulan=${prev}` : null,
    nextHref: next ? `/evaluasi?bulan=${next}` : null,
  };

  const { data: list } = await supabase
    .from("shopping_list").select("id, status, completed_by, completed_at").eq("month", month).maybeSingle();
  if (!list) return <EvaluasiView {...base} state="none" />;

  const [{ data }, xp] = await Promise.all([
    supabase.from("shopping_list_item").select("*").eq("list_id", list.id).order("created_at"),
    supabase.from("xp_event").select("kind, points").in("ref", [`saving:${list.id}`, `bonus:${list.id}`]),
  ]);
  const items = ((data ?? []) as ListItem[]).map((r) => ({
    ...r,
    qty_recommended: Number(r.qty_recommended), qty_bought: Number(r.qty_bought),
    unit_price_est: Number(r.unit_price_est), unit_price_actual: Number(r.unit_price_actual),
  }));
  const ev = evaluate(items);

  return (
    <EvaluasiView
      {...base}
      state={list.status === "open" ? "open" : "done"}
      saving={ev.saving}
      completedBy={nameOf.get(list.completed_by ?? "") ?? "keluarga"}
      xpGained={(xp.data ?? []).reduce((s, r) => s + Number(r.points), 0)}
      withinRecommendation={ev.withinRecommendation}
      estimateTotal={ev.estimateTotal}
      recommendedActual={ev.recommendedActual}
      extrasTotal={ev.extrasTotal}
      notBoughtCount={ev.notBought.length}
      rows={items.filter((i) => !i.is_extra).map((i) => ({
        id: i.id, name: i.name, unit: i.unit, qtyRec: i.qty_recommended, qtyBought: i.qty_bought,
        priceActual: i.unit_price_actual, skipped: !i.checked,
        diff: lineTotal(i.qty_recommended, i.unit_price_est) - lineTotal(i.qty_bought, i.unit_price_actual),
      }))}
      extras={ev.extras.map((i) => ({
        id: i.id, name: i.name, unit: i.unit, qty: i.qty_bought, total: lineTotal(i.qty_bought, i.unit_price_actual),
      }))}
    />
  );
}
