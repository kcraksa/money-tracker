import { describe, expect, it } from "vitest";
import { addDays, addMonths, daysInMonth, todayISO, weekStart } from "./date";
import { forecast } from "./forecast";
import { BADGES, computeStreak, levelInfo, questProgress, savingPoints } from "./gamification";
import { evaluate, recommend, suggestMonthlyNeed } from "./shopping";
import { qty, rupiah } from "./format";
import type { ListItem } from "./types";

describe("date", () => {
  it("memakai tanggal WIB, bukan UTC", () => {
    // 17 Okt 2026 18:30 UTC = 18 Okt 01:30 WIB
    expect(todayISO(new Date("2026-10-17T18:30:00Z"))).toBe("2026-10-18");
    expect(todayISO(new Date("2026-10-17T16:59:00Z"))).toBe("2026-10-17");
  });
  it("hitung hari & geser bulan", () => {
    expect(daysInMonth("2026-02-10")).toBe(28);
    expect(daysInMonth("2028-02-10")).toBe(29);
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addMonths("2026-01-01", -1)).toBe("2025-12-01");
    expect(weekStart("2026-10-17")).toBe("2026-10-12"); // Sabtu -> Senin
    expect(weekStart("2026-10-18")).toBe("2026-10-12"); // Minggu
  });
});

describe("format", () => {
  it("rupiah & qty", () => {
    expect(rupiah(1250000)).toBe("Rp 1.250.000");
    expect(rupiah(-5000)).toBe("-Rp 5.000");
    expect(qty(2)).toBe("2");
    expect(qty(1.5)).toBe("1,5");
  });
});

describe("forecast", () => {
  it("proyeksi = spent / hari x jumlah hari", () => {
    const f = forecast({ spent: 300000, budget: 800000, today: "2026-10-10" });
    expect(f.projected).toBe(930000); // 300000/10*31
    expect(f.status).toBe("warn");
    expect(f.remaining).toBe(500000);
  });
  it("tidak memperingatkan sebelum hari ke-7", () => {
    expect(forecast({ spent: 300000, budget: 800000, today: "2026-10-05" }).status).toBe("ok");
  });
  it("over saat sudah melewati budget, nobudget bila budget 0", () => {
    expect(forecast({ spent: 900000, budget: 800000, today: "2026-10-03" }).status).toBe("over");
    expect(forecast({ spent: 1, budget: 0, today: "2026-10-03" }).status).toBe("nobudget");
  });
  it("belanja bulanan tidak diproyeksi", () => {
    const f = forecast({ spent: 500000, budget: 1500000, today: "2026-10-10", lumpSum: true });
    expect(f.projected).toBe(500000);
    expect(f.status).toBe("ok");
  });
});

describe("rekomendasi & pemakaian", () => {
  it("contoh sabun: butuh 3, stok 2 -> beli 1", () => {
    expect(recommend(3, 2)).toBe(1);
    expect(recommend(3, 5)).toBe(0);
    expect(recommend(2.5, 1)).toBe(1.5);
  });
  const use = (d: string, n: number) => ({ delta: -n, created_on: d });
  it("butuh minimal 2 bulan data", () => {
    expect(suggestMonthlyNeed([use("2026-09-10", 3)], "2026-10-17")).toBeNull();
    expect(suggestMonthlyNeed([use("2026-10-05", 3)], "2026-10-17")).toBeNull();
  });
  it("rata-rata dari bulan penuh terakhir", () => {
    const logs = [use("2026-08-05", 2), use("2026-08-20", 1), use("2026-09-12", 2), use("2026-10-01", 9)];
    // Agustus 3, September 2 (Oktober berjalan diabaikan) -> 2,5
    expect(suggestMonthlyNeed(logs, "2026-10-17")).toEqual({ suggested: 2.5, monthsUsed: 2 });
  });
  it("bulan tanpa pemakaian setelah bulan pertama tetap dihitung 0", () => {
    const logs = [use("2026-07-05", 3)];
    // Jul 3, Agu 0, Sep 0 -> rata-rata 1
    expect(suggestMonthlyNeed(logs, "2026-10-17")).toEqual({ suggested: 1, monthsUsed: 3 });
  });
});

const li = (p: Partial<ListItem>): ListItem => ({
  id: "x", list_id: "l", item_id: null, name: "Barang", unit: "pcs",
  qty_recommended: 1, qty_bought: 1, unit_price_est: 10000, unit_price_actual: 10000,
  checked: true, is_extra: false, ...p,
});

describe("evaluasi belanja", () => {
  it("hemat dari harga lebih murah", () => {
    const e = evaluate([
      li({ qty_recommended: 2, qty_bought: 2, unit_price_est: 5000, unit_price_actual: 4000 }),
      li({ qty_recommended: 1, qty_bought: 1, unit_price_est: 10000, unit_price_actual: 11000 }),
    ]);
    expect(e.estimateTotal).toBe(20000);
    expect(e.actualTotal).toBe(19000);
    expect(e.saving).toBe(2000); // harga naik tidak mengurangi hemat, tidak negatif
    expect(e.withinRecommendation).toBe(true);
  });
  it("tidak membeli = bukan hemat", () => {
    const e = evaluate([li({ qty_recommended: 2, qty_bought: 0, checked: false, unit_price_est: 9000, unit_price_actual: 0 })]);
    expect(e.saving).toBe(0);
    expect(e.notBought).toHaveLength(1);
    expect(e.withinRecommendation).toBe(false);
  });
  it("barang di luar daftar dipisah dan bisa menggagalkan bonus", () => {
    const e = evaluate([
      li({ unit_price_est: 10000, unit_price_actual: 10000 }),
      li({ is_extra: true, qty_recommended: 0, qty_bought: 1, unit_price_est: 0, unit_price_actual: 8000 }),
    ]);
    expect(e.extrasTotal).toBe(8000);
    expect(e.recommendedActual).toBe(10000);
    expect(e.saving).toBe(0);
    expect(e.withinRecommendation).toBe(false);
  });
});

describe("gamifikasi", () => {
  it("level naik makin lambat", () => {
    expect(levelInfo(0)).toMatchObject({ level: 1, into: 0, span: 50 });
    expect(levelInfo(50).level).toBe(2);
    expect(levelInfo(199).level).toBe(2);
    expect(levelInfo(200).level).toBe(3);
  });
  it("streak tetap hidup jika hari ini belum dicatat", () => {
    expect(computeStreak(["2026-10-15", "2026-10-16"], "2026-10-17")).toBe(2);
    expect(computeStreak(["2026-10-15", "2026-10-16", "2026-10-17"], "2026-10-17")).toBe(3);
    expect(computeStreak(["2026-10-14"], "2026-10-17")).toBe(0);
    expect(computeStreak(["2026-10-10", "2026-10-12", "2026-10-13"], "2026-10-13")).toBe(2);
  });
  it("poin hemat berbobot lebih besar & dibatasi", () => {
    expect(savingPoints(10000)).toBe(5);
    expect(savingPoints(1999)).toBe(0);
    expect(savingPoints(10_000_000)).toBe(100);
  });
  it("progres quest", () => {
    const ctx = { weekDates: ["a", "a", "b"], expensesByMember: { m1: 4, m2: 2 }, memberCount: 2, stockChanges: 12 };
    expect(questProgress("catat_harian", ctx)).toEqual({ done: 2, target: 5 });
    expect(questProgress("berdua_kompak", ctx)).toEqual({ done: 1, target: 2 });
    expect(questProgress("stok_rapi", ctx)).toEqual({ done: 10, target: 10 });
  });
  it("3 badge sesuai spesifikasi", () => {
    expect(BADGES.map((b) => b.title)).toEqual([
      "Belanja Sesuai Rekomendasi", "Budget Aman", "Listrik Lunas Tepat Waktu",
    ]);
  });
});
