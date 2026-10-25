/** Modul terakhir yang dibuka, supaya aplikasi langsung masuk ke sana (tanpa layar Menu tiap kali). */
export const LAST_MODULE_COOKIE = "mt-last";
export type ModuleKey = "keuangan" | "servis";
export const MODULE_HOME: Record<ModuleKey, string> = { keuangan: "/", servis: "/servis" };
/** Alamat layar Menu yang sengaja dibuka untuk memilih modul (tidak dialihkan otomatis). */
export const MENU_PICK = "/menu?pilih=1";

export const parseModule = (v: string | undefined): ModuleKey | null =>
  v === "keuangan" || v === "servis" ? v : null;
