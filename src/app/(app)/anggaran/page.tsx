import { getCtx } from "@/lib/ctx";
import { todayISO } from "@/lib/date";
import { loadOverview } from "@/lib/server/overview";
import { AnggaranView } from "./anggaran-view";

export const metadata = { title: "Anggaran" };

export default async function AnggaranPage() {
  const { supabase } = await getCtx();
  const o = await loadOverview(supabase, todayISO());
  return <AnggaranView periodLabel={o.periodLabel} rows={o.rows} />;
}
