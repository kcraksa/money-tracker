import { notFound } from "next/navigation";
import { getCtx } from "@/lib/ctx";
import { todayISO } from "@/lib/date";
import { loadHistory, loadServiceOverview } from "@/lib/server/service";
import { DetailView } from "./detail-view";

export const metadata = { title: "Kendaraan" };

export default async function KendaraanPage({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ tersimpan?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await getCtx();
  const [overview, history] = await Promise.all([loadServiceOverview(supabase, todayISO()), loadHistory(supabase, id, 3)]);
  const o = overview.vehicles.find((v) => v.vehicle.id === id);
  if (!o) notFound();
  return <DetailView id={id} o={o} visits={history.visits} saved={Boolean(sp.tersimpan)} />;
}
