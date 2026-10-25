import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCtx } from "@/lib/ctx";
import { LAST_MODULE_COOKIE, MODULE_HOME, parseModule } from "@/lib/last-module";
import { greeting, todayISO } from "@/lib/date";
import { loadServiceOverview } from "@/lib/server/service";
import { MenuView } from "./menu-view";

export const metadata = { title: "Menu" };

// Bergantung pada sesi dan data kendaraan: jangan pernah diprerender.
export const dynamic = "force-dynamic";

export default async function MenuPage({ searchParams }: { searchParams: Promise<{ pilih?: string }> }) {
  // Buka aplikasi = langsung ke modul terakhir. Layar Menu hanya muncul saat dipilih sengaja (?pilih=1)
  // atau saat belum pernah memilih modul.
  const sp = await searchParams;
  const last = parseModule((await cookies()).get(LAST_MODULE_COOKIE)?.value);
  if (last && !sp.pilih) redirect(MODULE_HOME[last]);

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
