import { describe, expect, it } from "vitest";
import { addDays, addMonths, daysInMonth, greeting, todayISO, weekStart } from "./date";
import {
  addMonthsClamped, dueDateInPeriod, effectiveBudgets, elapsedDays, isOverdue, periodLabel, previousPeriod,
  rangeEnd, resolvePeriod, totalDays,
} from "./period";
import { learnOrder, sortByRoute } from "./route";
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

describe("sapaan", () => {
  it("mengikuti jam WIB", () => {
    expect(greeting(new Date("2026-10-17T00:30:00Z"))).toBe("Selamat pagi"); // 07:30 WIB
    expect(greeting(new Date("2026-10-17T06:00:00Z"))).toBe("Selamat siang"); // 13:00
    expect(greeting(new Date("2026-10-17T09:30:00Z"))).toBe("Selamat sore"); // 16:30
    expect(greeting(new Date("2026-10-17T14:00:00Z"))).toBe("Selamat malam"); // 21:00
  });
});

describe("format", () => {
  it("rupiah & qty", () => {
    expect(rupiah(1250000)).toBe("Rp\u00A01.250.000");
    expect(rupiah(-5000)).toBe("-Rp\u00A05.000");
    expect(qty(2)).toBe("2");
    expect(qty(1.5)).toBe("1,5");
  });
});

describe("forecast", () => {
  it("proyeksi = spent / hari berjalan x panjang periode", () => {
    const f = forecast({ spent: 300000, budget: 800000, elapsedDays: 10, totalDays: 31 });
    expect(f.projected).toBe(930000); // 300000/10*31
    expect(f.status).toBe("warn");
    expect(f.remaining).toBe(500000);
  });
  it("tidak memperingatkan sebelum hari ke-7", () => {
    expect(forecast({ spent: 300000, budget: 800000, elapsedDays: 5, totalDays: 31 }).status).toBe("ok");
  });
  it("over saat sudah melewati budget, nobudget bila budget 0", () => {
    expect(forecast({ spent: 900000, budget: 800000, elapsedDays: 3, totalDays: 31 }).status).toBe("over");
    expect(forecast({ spent: 1, budget: 0, elapsedDays: 3, totalDays: 31 }).status).toBe("nobudget");
  });
  it("belanja bulanan tidak diproyeksi", () => {
    const f = forecast({ spent: 500000, budget: 1500000, elapsedDays: 10, totalDays: 31, lumpSum: true });
    expect(f.projected).toBe(500000);
    expect(f.status).toBe("ok");
  });
});

describe("periode gajian", () => {
  it("tanpa gajian tercatat: bulan kalender", () => {
    const p = resolvePeriod([], "2026-10-17");
    expect(p).toEqual({ start: "2026-10-01", plannedEnd: "2026-10-31", end: null, explicit: false });
    expect(periodLabel(p)).toBe("Oktober 2026");
  });
  it("periode dimulai di tanggal gajian dan berakhir sehari sebelum gajian berikutnya", () => {
    const starts = ["2026-09-25", "2026-10-25"];
    expect(resolvePeriod(starts, "2026-10-20")).toEqual({ start: "2026-09-25", plannedEnd: "2026-10-24", end: "2026-10-24", explicit: true });
    const cur = resolvePeriod(starts, "2026-10-30");
    expect(cur).toEqual({ start: "2026-10-25", plannedEnd: "2026-11-24", end: null, explicit: true });
    expect(periodLabel(cur)).toBe("25 Okt – 24 Nov 2026");
    expect(periodLabel(resolvePeriod(["2026-12-25"], "2026-12-30"))).toBe("25 Des 2026 – 24 Jan 2027");
  });
  it("tanggal gajian 31 tidak meloncat bulan", () => {
    expect(addMonthsClamped("2026-01-31", 1)).toBe("2026-02-28");
    expect(resolvePeriod(["2026-01-31"], "2026-02-10").plannedEnd).toBe("2026-02-27");
  });
  it("periode sebelumnya: eksplisit, atau bulan kalender sebelum gajian pertama", () => {
    const starts = ["2026-09-25", "2026-10-25"];
    const cur = resolvePeriod(starts, "2026-10-30");
    expect(previousPeriod(starts, cur)).toMatchObject({ start: "2026-09-25", end: "2026-10-24", explicit: true });
    const first = resolvePeriod(["2026-10-25"], "2026-10-26");
    expect(previousPeriod(["2026-10-25"], first)).toMatchObject({ start: "2026-10-01", end: "2026-10-24", explicit: false });
    expect(previousPeriod([], resolvePeriod([], "2026-10-17"))).toMatchObject({ start: "2026-09-01", end: "2026-09-30" });
  });
  it("hari berjalan & panjang periode; lewat rencana = menunggu gajian baru", () => {
    const p = resolvePeriod(["2026-10-25"], "2026-10-30");
    expect(elapsedDays(p, "2026-10-30")).toBe(6);
    expect(totalDays(p, "2026-10-30")).toBe(31);
    expect(isOverdue(p, "2026-10-30")).toBe(false);
    expect(isOverdue(p, "2026-11-28")).toBe(true);
    expect(totalDays(p, "2026-11-28")).toBe(35); // tidak memotong data, ikut hari berjalan
    expect(rangeEnd(p, "2026-11-28")).toBe("2026-11-28");
  });
  it("jatuh tempo tagihan dihitung di dalam periode", () => {
    const p = resolvePeriod(["2026-10-25"], "2026-10-30");
    expect(dueDateInPeriod(p, 20)).toBe("2026-11-20");
    expect(dueDateInPeriod(p, 28)).toBe("2026-10-28");
    expect(dueDateInPeriod(p, 25)).toBe("2026-10-25");
    expect(dueDateInPeriod(resolvePeriod([], "2026-10-17"), 20)).toBe("2026-10-20");
  });
  it("budget carry-over: baris terbaru yang berlaku, data lama sebagai default", () => {
    const rows = [
      { category_id: "jajan", effective_from: "2000-01-01", amount: 500000 },
      { category_id: "jajan", effective_from: "2026-09-25", amount: 800000 },
      { category_id: "jajan", effective_from: "2026-11-25", amount: 900000 },
      { category_id: "sayur", effective_from: "2000-01-01", amount: 300000 },
    ];
    const b = effectiveBudgets(rows, "2026-10-25");
    expect(b.get("jajan")).toBe(800000);
    expect(b.get("sayur")).toBe(300000);
    expect(effectiveBudgets(rows, "2026-08-01").get("jajan")).toBe(500000);
  });
});

describe("urutan rak toko", () => {
  const it_ = (id: string, name: string, checked = false) => ({
    id, list_id: "l", item_id: id, name, unit: "pcs", qty_recommended: 1, qty_bought: 1,
    unit_price_est: 0, unit_price_actual: 0, checked, is_extra: false,
  });
  it("belajar dari urutan centang dan makin yakin tiap belanja", () => {
    let order = learnOrder(new Map(), ["buah", "bumbu", "sabun"]);
    expect(order.get("buah")).toEqual({ avg: 0, samples: 1 });
    expect(order.get("bumbu")).toEqual({ avg: 0.5, samples: 1 });
    expect(order.get("sabun")).toEqual({ avg: 1, samples: 1 });
    order = new Map([...order, ...learnOrder(order, ["buah", "sabun"])]);
    expect(order.get("buah")!.samples).toBe(2);
    expect(order.get("bumbu")!.avg).toBe(0.5); // tidak ikut belanja kedua: tidak berubah
  });
  it("satu barang tidak memberi informasi urutan", () => {
    expect(learnOrder(new Map(), ["buah"]).size).toBe(0);
  });
  it("toko berbeda, urutan berbeda", () => {
    const hariHari = learnOrder(new Map(), ["buah", "bumbu", "sabun"]);
    const naga = learnOrder(new Map(), ["yogurt", "nugget", "ayam"]);
    const items = [it_("sabun", "Sabun"), it_("buah", "Buah"), it_("bumbu", "Bumbu")];
    expect(sortByRoute(items, hariHari).map((i) => i.name)).toEqual(["Buah", "Bumbu", "Sabun"]);
    const mixed = [it_("ayam", "Ayam"), it_("yogurt", "Yogurt"), it_("nugget", "Nugget")];
    expect(sortByRoute(mixed, naga).map((i) => i.name)).toEqual(["Yogurt", "Nugget", "Ayam"]);
  });
  it("posisi belum diketahui di akhir, yang dicentang turun menurut waktu centang", () => {
    const order = learnOrder(new Map(), ["buah", "sabun"]);
    const items = [it_("baru", "Aneh"), it_("sabun", "Sabun"), it_("buah", "Buah", true), it_("x", "Zzz", true)];
    const sorted = sortByRoute(items, order, new Map([["buah", 2], ["x", 1]]));
    expect(sorted.map((i) => i.name)).toEqual(["Sabun", "Aneh", "Zzz", "Buah"]);
    expect(sorted.find((i) => i.name === "Aneh")!.known).toBe(false);
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
