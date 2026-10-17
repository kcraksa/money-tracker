export type PartTemplate = { name: string; intervalKm: number | null; intervalMonths: number | null };
export type VehicleKind = "car" | "motorcycle";

/**
 * Daftar awal part per jenis kendaraan. Angkanya perkiraan umum, bukan aturan pabrikan:
 * selalu bisa diubah per kendaraan (sesuaikan dengan buku servis masing-masing).
 */
export const TEMPLATES: Record<VehicleKind, PartTemplate[]> = {
  motorcycle: [
    { name: "Oli mesin", intervalKm: 3000, intervalMonths: 4 },
    { name: "Busi", intervalKm: 10000, intervalMonths: null },
    { name: "Filter udara", intervalKm: 12000, intervalMonths: 12 },
    { name: "Oli gardan (matic)", intervalKm: 8000, intervalMonths: null },
    { name: "V-belt & roller (matic)", intervalKm: 20000, intervalMonths: null },
    { name: "Kampas rem", intervalKm: 15000, intervalMonths: null },
    { name: "Minyak rem", intervalKm: null, intervalMonths: 24 },
    { name: "Rantai & gir", intervalKm: 20000, intervalMonths: null },
    { name: "Aki", intervalKm: null, intervalMonths: 24 },
    { name: "Ban", intervalKm: 25000, intervalMonths: 36 },
  ],
  car: [
    { name: "Oli mesin", intervalKm: 7000, intervalMonths: 6 },
    { name: "Filter oli", intervalKm: 7000, intervalMonths: 6 },
    { name: "Busi", intervalKm: 10000, intervalMonths: null },
    { name: "Filter udara", intervalKm: 20000, intervalMonths: 12 },
    { name: "Filter AC / kabin", intervalKm: 20000, intervalMonths: 12 },
    { name: "Filter bensin", intervalKm: 40000, intervalMonths: null },
    { name: "Kampas rem", intervalKm: 30000, intervalMonths: null },
    { name: "Minyak rem", intervalKm: 40000, intervalMonths: 24 },
    { name: "Oli transmisi", intervalKm: 40000, intervalMonths: null },
    { name: "Air radiator / coolant", intervalKm: 40000, intervalMonths: 24 },
    { name: "Rotasi & balancing ban", intervalKm: 10000, intervalMonths: null },
    { name: "Aki", intervalKm: null, intervalMonths: 24 },
    { name: "Ban", intervalKm: 40000, intervalMonths: 48 },
  ],
};

export const KIND_LABEL: Record<VehicleKind, string> = { car: "Mobil", motorcycle: "Motor" };
