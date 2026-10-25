"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCtx } from "@/lib/ctx";
import { addDays, todayISO } from "@/lib/date";
import { KM_MAX, checkKm } from "@/lib/service/logic";

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; needsConfirm?: boolean };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const int = (v: unknown, max: number): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && Number.isInteger(n) && n >= 0 && n <= max ? n : null;
};
const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

function validDate(v: unknown, today: string): string | null {
  const s = String(v ?? "");
  return DATE.test(s) && s <= today && s >= addDays(today, -3650) ? s : null;
}

function done() {
  revalidatePath("/servis", "layout");
  revalidatePath("/menu");
}

export type NewVehicleInput = {
  name: string;
  kind: "car" | "motorcycle";
  plate?: string;
  odometerKm: number;
  parts: {
    name: string;
    intervalKm: number | null;
    intervalMonths: number | null;
    lastKm?: number | null; // km saat terakhir diservis (opsional)
    lastOn?: string | null; // tanggalnya (opsional)
  }[];
};

/** Tambah kendaraan + daftar part-nya, dan riwayat awal bagi part yang diketahui servis terakhirnya. */
export async function addVehicle(input: NewVehicleInput): Promise<Result<{ id: string }>> {
  const { supabase, me, householdId } = await getCtx();
  const today = todayISO();

  const name = text(input.name, 40);
  const km = int(input.odometerKm, KM_MAX);
  if (!name) return { ok: false, error: "Isi nama kendaraan." };
  if (input.kind !== "car" && input.kind !== "motorcycle") return { ok: false, error: "Pilih mobil atau motor." };
  if (km === null) return { ok: false, error: "Isi km saat ini dengan angka bulat." };
  if (!Array.isArray(input.parts) || input.parts.length === 0) return { ok: false, error: "Pilih minimal satu part." };
  if (input.parts.length > 40) return { ok: false, error: "Terlalu banyak part (maksimal 40)." };

  const seen = new Set<string>();
  const parts = [];
  for (const p of input.parts) {
    const pn = text(p.name, 40);
    const ik = int(p.intervalKm, 500_000);
    const im = int(p.intervalMonths, 240);
    if (!pn) return { ok: false, error: "Ada part tanpa nama." };
    if (seen.has(pn.toLowerCase())) return { ok: false, error: `Part "${pn}" tercatat dua kali.` };
    seen.add(pn.toLowerCase());
    const lastKm = int(p.lastKm, KM_MAX);
    if (lastKm !== null && lastKm > km) return { ok: false, error: `Km servis terakhir "${pn}" tidak boleh melebihi km sekarang.` };
    // Tanggal tidak diisi -> pakai hari ini (perkiraan); hanya relevan bila ada km servis terakhir.
    const lastOn = lastKm === null ? null : (validDate(p.lastOn, today) ?? today);
    parts.push({ name: pn, intervalKm: ik, intervalMonths: im, lastKm, lastOn });
  }

  const { data: vehicle, error: e1 } = await supabase
    .from("vehicle")
    .insert({
      household_id: householdId, name, kind: input.kind, plate: text(input.plate, 12).toUpperCase() || null,
      odometer_km: km, odometer_on: today,
    })
    .select("id").single();
  if (e1 || !vehicle) return { ok: false, error: "Gagal menyimpan kendaraan, coba lagi." };

  const rollback = async (error: string): Promise<Result<{ id: string }>> => {
    await supabase.from("vehicle").delete().eq("id", vehicle.id); // part & riwayat ikut terhapus (cascade)
    return { ok: false, error };
  };

  const { data: inserted, error: e2 } = await supabase
    .from("service_part")
    .insert(parts.map((p, i) => ({
      household_id: householdId, vehicle_id: vehicle.id, name: p.name,
      interval_km: p.intervalKm, interval_months: p.intervalMonths, sort_order: i,
    })))
    .select("id, name");
  if (e2?.code === "23514") return rollback("Database perlu diperbarui dulu (migrasi 0005) agar komponen boleh tanpa pengingat.");
  if (e2 || !inserted) return rollback("Gagal menyimpan daftar part, coba lagi.");
  const idByName = new Map(inserted.map((r) => [String(r.name).toLowerCase(), r.id as string]));

  // Riwayat awal: satu kunjungan "Data awal" per kombinasi (km, tanggal) servis terakhir.
  const groups = new Map<string, { km: number; on: string; ids: string[] }>();
  for (const p of parts) {
    if (p.lastKm === null || p.lastOn === null) continue;
    const key = `${p.lastKm}|${p.lastOn}`;
    const g = groups.get(key) ?? { km: p.lastKm, on: p.lastOn, ids: [] };
    g.ids.push(idByName.get(p.name.toLowerCase())!);
    groups.set(key, g);
  }
  for (const g of groups.values()) {
    const { error } = await supabase.rpc("record_service", {
      p_vehicle: vehicle.id, p_on: g.on, p_km: g.km, p_workshop: null, p_cost: 0, p_note: "Data awal", p_parts: g.ids,
    });
    if (error) return rollback("Gagal menyimpan riwayat awal, coba lagi.");
  }
  await supabase.from("odometer_reading").insert({
    household_id: householdId, vehicle_id: vehicle.id, km, read_on: today, member_id: me.id, source: "initial",
  });

  done();
  return { ok: true, id: vehicle.id as string };
}

/** Perbarui km terkini. Server memeriksa ulang; turun/lonjakan besar butuh konfirmasi eksplisit. */
export async function updateOdometer(vehicleId: string, km: number, confirmed = false): Promise<Result> {
  const { supabase } = await getCtx();
  if (!UUID.test(vehicleId)) return { ok: false, error: "Kendaraan tidak valid." };

  const { data: v } = await supabase.from("vehicle").select("odometer_km").eq("id", vehicleId).maybeSingle();
  if (!v) return { ok: false, error: "Kendaraan tidak ditemukan." };

  const check = checkKm(Number(km), Number(v.odometer_km));
  if (check.level === "invalid") return { ok: false, error: check.message };
  if (check.level === "confirm" && !confirmed) return { ok: false, error: check.message, needsConfirm: true };

  const { error } = await supabase.rpc("record_odometer", { p_vehicle: vehicleId, p_km: Number(km), p_on: todayISO() });
  if (error) return { ok: false, error: "Gagal memperbarui km, coba lagi." };
  done();
  return { ok: true };
}

export type ServiceInput = {
  vehicleId: string;
  servicedOn: string;
  km: number;
  partIds: string[];
  cost?: number | null;
  workshop?: string;
  note?: string;
};

export async function recordService(input: ServiceInput): Promise<Result<{ id: string }>> {
  const { supabase } = await getCtx();
  const today = todayISO();
  const on = validDate(input.servicedOn, today);
  const km = int(input.km, KM_MAX);
  if (!UUID.test(input.vehicleId)) return { ok: false, error: "Pilih kendaraan." };
  if (!on) return { ok: false, error: "Tanggal tidak valid (tidak boleh di masa depan)." };
  if (km === null) return { ok: false, error: "Isi km dengan angka bulat." };
  const partIds = (input.partIds ?? []).filter((id) => UUID.test(id));
  if (partIds.length === 0) return { ok: false, error: "Pilih minimal satu part yang diservis." };

  const { data, error } = await supabase.rpc("record_service", {
    p_vehicle: input.vehicleId, p_on: on, p_km: km,
    p_workshop: text(input.workshop, 60) || null, p_cost: int(input.cost, 10_000_000_000) ?? 0,
    p_note: text(input.note, 200) || null, p_parts: partIds,
  });
  if (error) return { ok: false, error: "Gagal menyimpan servis, coba lagi." };
  done();
  return { ok: true, id: String(data) };
}

export async function deleteVisit(visitId: string): Promise<Result> {
  const { supabase } = await getCtx();
  if (!UUID.test(visitId)) return { ok: false, error: "Riwayat tidak valid." };
  const { error } = await supabase.from("service_visit").delete().eq("id", visitId);
  if (error) return { ok: false, error: "Gagal menghapus, coba lagi." };
  done();
  return { ok: true };
}

// ───────── Pengaturan kendaraan & part (form biasa, lalu kembali ke halaman atur) ─────────

const back = (id: string, flag = "tersimpan=1") => `/servis/${id}/atur?${flag}`;

export async function updateVehicle(form: FormData) {
  const { supabase } = await getCtx();
  const id = String(form.get("id") ?? "");
  if (!UUID.test(id)) redirect("/servis");
  const name = text(form.get("name"), 40);
  if (name) {
    await supabase.from("vehicle").update({
      name, plate: text(form.get("plate"), 12).toUpperCase() || null,
      remind_days: Math.min(60, Math.max(1, int(form.get("remind_days"), 60) ?? 7)),
    }).eq("id", id);
  }
  done();
  redirect(back(id));
}

export async function savePart(form: FormData) {
  const { supabase, householdId } = await getCtx();
  const vehicleId = String(form.get("vehicle_id") ?? "");
  if (!UUID.test(vehicleId)) redirect("/servis");
  const partId = String(form.get("id") ?? "");
  const name = text(form.get("name"), 40);
  const ik = int(form.get("interval_km"), 500_000);
  const im = int(form.get("interval_months"), 240);
  if (!name) redirect(back(vehicleId, "err=nama"));

  let failed: { code?: string } | null = null;
  if (partId && UUID.test(partId)) {
    failed = (await supabase.from("service_part").update({ name, interval_km: ik || null, interval_months: im || null }).eq("id", partId)).error;
  } else {
    const { data: last } = await supabase.from("service_part").select("sort_order")
      .eq("vehicle_id", vehicleId).order("sort_order", { ascending: false }).limit(1);
    failed = (await supabase.from("service_part").insert({
      household_id: householdId, vehicle_id: vehicleId, name,
      interval_km: ik || null, interval_months: im || null, sort_order: (last?.[0]?.sort_order ?? 0) + 1,
    })).error;
  }
  // 23514 = constraint lama (butuh interval) masih ada: migrasi 0005 belum dijalankan.
  if (failed?.code === "23514") redirect(back(vehicleId, "err=migrasi"));
  done();
  redirect(back(vehicleId));
}

/** Part diarsipkan (bukan dihapus) supaya riwayat servisnya tetap utuh. */
export async function archivePart(form: FormData) {
  const { supabase } = await getCtx();
  const vehicleId = String(form.get("vehicle_id") ?? "");
  const id = String(form.get("id") ?? "");
  if (UUID.test(id)) await supabase.from("service_part").update({ active: false }).eq("id", id);
  done();
  redirect(UUID.test(vehicleId) ? back(vehicleId) : "/servis");
}

export async function archiveVehicle(form: FormData) {
  const { supabase } = await getCtx();
  const id = String(form.get("id") ?? "");
  if (UUID.test(id)) await supabase.from("vehicle").update({ active: false }).eq("id", id);
  done();
  redirect("/servis");
}
