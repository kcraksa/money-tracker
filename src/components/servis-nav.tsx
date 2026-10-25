"use client";

import { BottomNav, type NavTab } from "./bottom-nav";
import { Car, History, Plus } from "./icons";

const TABS: NavTab[] = [
  // Aktif untuk daftar, detail, tambah, dan atur kendaraan; bukan untuk catat/riwayat.
  { href: "/servis", label: "Kendaraan", Icon: Car, match: (p) => p === "/servis" || (p.startsWith("/servis/") && !p.startsWith("/servis/catat") && !p.startsWith("/servis/riwayat")) },
  { href: "/servis/catat", label: "Catat", Icon: Plus, primary: true },
  { href: "/servis/riwayat", label: "Riwayat", Icon: History },
];

export function ServisNav() {
  return <BottomNav tabs={TABS} fabLabel="Catat servis" />;
}
