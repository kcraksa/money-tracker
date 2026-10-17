import type { PartStatus, Summary } from "./logic";
import type { VehicleKind } from "./templates";

export type Vehicle = {
  id: string;
  name: string;
  kind: VehicleKind;
  plate: string | null;
  odometer_km: number;
  odometer_on: string; // tanggal km terakhir diperbarui
  remind_days: number;
};

export type Part = {
  id: string;
  vehicle_id: string;
  name: string;
  interval_km: number | null;
  interval_months: number | null;
  sort_order: number;
};

export type PartView = Part & {
  status: PartStatus;
  lastKm: number | null;
  lastOn: string | null;
};

export type VehicleOverview = {
  vehicle: Vehicle;
  parts: PartView[]; // sudah urut paling mendesak
  summary: Summary;
  kmPerDay: number | null;
  nudge: { daysAgo: number; due: boolean };
};

export type VisitView = {
  id: string;
  vehicle_id: string;
  serviced_on: string;
  odometer_km: number;
  workshop: string | null;
  cost: number;
  note: string | null;
  parts: string[]; // nama part yang diservis
};
