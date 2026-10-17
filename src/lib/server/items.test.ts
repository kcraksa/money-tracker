import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadActiveItems } from "./items";

// Klien tiruan: from().select(cols).eq().order() mengembalikan hasil sesuai kolom yang diminta.
function fake(handler: (cols: string) => { data?: unknown[]; error?: { code?: string; message: string } }) {
  const calls: string[] = [];
  const sb = {
    from: () => ({
      select: (cols: string) => {
        calls.push(cols);
        const res = handler(cols);
        const chain = { eq: () => chain, order: () => Promise.resolve({ data: res.data ?? null, error: res.error ?? null }) };
        return chain;
      },
    }),
  } as unknown as SupabaseClient;
  return { sb, calls };
}

describe("loadActiveItems", () => {
  it("memuat barang beserta waktu cek bila migrasi sudah ada", async () => {
    const { sb, calls } = fake(() => ({ data: [{ id: "1", name: "Sabun", stock_checked_at: "2026-10-16T00:00:00Z" }] }));
    const r = await loadActiveItems(sb, "id, name");
    expect(r).toMatchObject({ outdated: false, error: null });
    expect(r.rows[0].stock_checked_at).toBe("2026-10-16T00:00:00Z");
    expect(calls).toEqual(["id, name, stock_checked_at"]);
  });

  it("migrasi 0003 belum dijalankan: barang TETAP tampil, ditandai outdated", async () => {
    const { sb, calls } = fake((cols) =>
      cols.includes("stock_checked_at")
        ? { error: { code: "42703", message: "column item.stock_checked_at does not exist" } }
        : { data: [{ id: "1", name: "Sabun" }, { id: "2", name: "Beras" }] },
    );
    const r = await loadActiveItems(sb, "id, name");
    expect(r.outdated).toBe(true);
    expect(r.error).toBeNull();
    expect(r.rows.map((x) => x.name)).toEqual(["Sabun", "Beras"]);
    expect(r.rows.every((x) => x.stock_checked_at === null)).toBe(true);
    expect(calls).toEqual(["id, name, stock_checked_at", "id, name"]);
  });

  it("galat lain dilaporkan, bukan disamarkan sebagai daftar kosong", async () => {
    const { sb } = fake(() => ({ error: { code: "42501", message: "permission denied for table item" } }));
    const r = await loadActiveItems(sb, "id, name");
    expect(r.rows).toEqual([]);
    expect(r.error).toBe("permission denied for table item");
    expect(r.outdated).toBe(false);
  });
});
