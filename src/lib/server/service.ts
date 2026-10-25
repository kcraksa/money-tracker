import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays } from "@/lib/date";
import { byUrgency, kmNudge, kmPerDay, partStatus, summarize } from "@/lib/service/logic";
import type { Part, PartView, Vehicle, VehicleOverview, VisitView } from "@/lib/service/types";

type DbError = { code?: string; message?: string };

// 42P01 = tabel tidak ada (Postgres); PGRST205 = tidak ditemukan di schema cache (PostgREST).
export const isMissingTable = (e: DbError | null | undefined) =>
  Boolean(
    e &&
      (e.code === "42P01" || e.code === "PGRST205" ||
        (/schema cache|does not exist/i.test(e.message ?? "") && /service_|vehicle|odometer/i.test(e.message ?? ""))),
  );

export type OverviewResult = {
  vehicles: VehicleOverview[];
  /** Migrasi 0004 belum dijalankan di database. */
  outdated: boolean;
  error: string | null;
};

/**
 * Semua kendaraan beserta status tiap part. Servis terakhir sebuah part = kunjungan terbaru yang
 * memuat part itu; laju pemakaian dari catatan km 60 hari terakhir.
 */
export async function loadServiceOverview(sb: SupabaseClient, today: string): Promise<OverviewResult> {
  const [veh, parts, visits, vparts, readings] = await Promise.all([
    sb.from("vehicle").select("id, name, kind, plate, odometer_km, odometer_on, remind_days").eq("active", true).order("created_at"),
    sb.from("service_part").select("id, vehicle_id, name, interval_km, interval_months, sort_order").eq("active", true).order("sort_order"),
    sb.from("service_visit").select("id, vehicle_id, serviced_on, odometer_km"),
    sb.from("service_visit_part").select("visit_id, part_id"),
    sb.from("odometer_reading").select("vehicle_id, km, read_on").gte("read_on", addDays(today, -60)),
  ]);

  const failed = [veh, parts, visits, vparts, readings].find((r) => r.error);
  if (failed?.error) {
    return { vehicles: [], outdated: isMissingTable(failed.error), error: isMissingTable(failed.error) ? null : failed.error.message };
  }

  const visitById = new Map((visits.data ?? []).map((v) => [v.id as string, v]));
  // Servis terakhir per part: tanggal terbaru (km terbesar bila sama).
  const last = new Map<string, { km: number; on: string }>();
  for (const vp of vparts.data ?? []) {
    const v = visitById.get(vp.visit_id as string);
    if (!v) continue;
    const cur = last.get(vp.part_id as string);
    const cand = { km: Number(v.odometer_km), on: v.serviced_on as string };
    if (!cur || cand.on > cur.on || (cand.on === cur.on && cand.km > cur.km)) last.set(vp.part_id as string, cand);
  }

  const out: VehicleOverview[] = ((veh.data ?? []) as Vehicle[]).map((v) => {
    const vehicle = { ...v, odometer_km: Number(v.odometer_km) };
    const rate = kmPerDay(
      (readings.data ?? []).filter((r) => r.vehicle_id === v.id).map((r) => ({ km: Number(r.km), read_on: r.read_on as string })),
      today,
    );
    const views: PartView[] = ((parts.data ?? []) as Part[])
      .filter((p) => p.vehicle_id === v.id)
      .map((p) => {
        const l = last.get(p.id);
        return {
          ...p,
          lastKm: l?.km ?? null,
          lastOn: l?.on ?? null,
          status: partStatus(
            { intervalKm: p.interval_km, intervalMonths: p.interval_months, lastKm: l?.km ?? null, lastOn: l?.on ?? null },
            { currentKm: vehicle.odometer_km, today, kmPerDay: rate },
          ),
        };
      });
    return {
      vehicle,
      parts: byUrgency(views),
      // Komponen tanpa interval tidak punya pengingat, jadi tidak ikut menentukan status kendaraan.
      summary: summarize(views.filter((p) => p.interval_km || p.interval_months).map((p) => p.status.status)),
      kmPerDay: rate,
      nudge: kmNudge(vehicle.odometer_on, vehicle.remind_days, today),
    };
  });
  return { vehicles: out, outdated: false, error: null };
}

/** Riwayat servis terbaru (opsional per kendaraan), lengkap dengan nama part. */
export async function loadHistory(
  sb: SupabaseClient, vehicleId?: string, limit = 100,
): Promise<{ visits: VisitView[]; outdated: boolean; error: string | null }> {
  let q = sb.from("service_visit").select("id, vehicle_id, serviced_on, odometer_km, workshop, cost, note")
    .order("serviced_on", { ascending: false }).order("created_at", { ascending: false }).limit(limit);
  if (vehicleId) q = q.eq("vehicle_id", vehicleId);
  const visits = await q;
  if (visits.error) {
    return { visits: [], outdated: isMissingTable(visits.error), error: isMissingTable(visits.error) ? null : visits.error.message };
  }
  const ids = (visits.data ?? []).map((v) => v.id as string);
  const vp = ids.length
    ? await sb.from("service_visit_part").select("visit_id, service_part(name)").in("visit_id", ids)
    : { data: [] as { visit_id: string; service_part: unknown }[], error: null };
  const names = new Map<string, string[]>();
  for (const r of (vp.data ?? []) as unknown as { visit_id: string; service_part: { name: string } | { name: string }[] | null }[]) {
    const p = Array.isArray(r.service_part) ? r.service_part[0] : r.service_part;
    if (p) names.set(r.visit_id, [...(names.get(r.visit_id) ?? []), p.name]);
  }
  return {
    visits: (visits.data ?? []).map((v) => ({
      id: v.id as string, vehicle_id: v.vehicle_id as string, serviced_on: v.serviced_on as string,
      odometer_km: Number(v.odometer_km), workshop: (v.workshop as string | null) ?? null,
      cost: Number(v.cost), note: (v.note as string | null) ?? null, parts: names.get(v.id as string) ?? [],
    })),
    outdated: false,
    error: null,
  };
}
