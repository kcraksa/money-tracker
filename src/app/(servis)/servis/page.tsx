import { getCtx } from "@/lib/ctx";
import { todayISO } from "@/lib/date";
import { loadServiceOverview } from "@/lib/server/service";
import { ServisHome } from "./servis-home";

export const metadata = { title: "Servis Kendaraan" };

export default async function ServisPage() {
  const { supabase } = await getCtx();
  const { vehicles, outdated, error } = await loadServiceOverview(supabase, todayISO());
  return <ServisHome vehicles={vehicles} outdated={outdated} error={error} />;
}
