import { getCtx } from "@/lib/ctx";
import { greeting, todayISO } from "@/lib/date";
import { loadServiceOverview } from "@/lib/server/service";
import { MenuView } from "./menu-view";

export const metadata = { title: "Menu" };

// Bergantung pada sesi dan data kendaraan: jangan pernah diprerender.
export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const { supabase, me } = await getCtx();
  const overview = await loadServiceOverview(supabase, todayISO());

  return (
    <MenuView
      greeting={greeting()}
      name={me.display_name}
      service={{
        vehicles: overview.vehicles.length,
        overdue: overview.vehicles.reduce((s, v) => s + v.summary.overdue, 0),
        soon: overview.vehicles.reduce((s, v) => s + v.summary.soon, 0),
        nudges: overview.vehicles.filter((v) => v.nudge.due).length,
        outdated: overview.outdated,
        error: overview.error,
      }}
    />
  );
}
