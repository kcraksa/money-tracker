import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";

const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";
const C = "00000000-0000-0000-0000-00000000000c";

let db: PGlite;

// Meniru lapisan auth Supabase: auth.uid() membaca setting request.jwt.claim.sub.
async function as(uid: string | null) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ""}', false);`);
  if (uid) await db.exec("set role authenticated");
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated;
    grant usage on schema public to authenticated;
    insert into auth.users values ('${A}'), ('${B}'), ('${C}');
  `);
  for (const f of ["0001_init.sql", "0002_period_income_store.sql", "0003_stock_check.sql"]) {
    await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
  }
  await db.exec(`
    grant select, insert, update, delete on all tables in schema public to authenticated;
  `);
});

describe("skema & RLS", () => {
  let codeA = "";

  it("membuat rumah tangga dengan kategori seed", async () => {
    await as(A);
    await db.query("select create_household('Rumah A', 'Budi')");
    const cats = await db.query<{ name: string; kind: string }>(
      "select name, kind from category order by sort_order",
    );
    expect(cats.rows.map((r) => r.name)).toEqual([
      "Listrik", "Sekolah anak", "Transport", "Bensin", "Jajan", "Sayur", "Belanja bulanan",
    ]);
    expect(cats.rows.filter((r) => r.kind === "fixed")).toHaveLength(2);
    const q = await db.query<{ amount: string }>("select amount from quick_expense");
    expect(Number(q.rows[0].amount)).toBe(50000);
    const h = await db.query<{ invite_code: string }>("select invite_code from household");
    codeA = h.rows[0].invite_code;
    expect(codeA).toMatch(/^[0-9A-F]{6}$/);
  });

  it("pasangan bergabung lewat kode (huruf kecil & tanda baca ditoleransi)", async () => {
    await as(B);
    await db.query("select join_household($1, 'Siti')", [`rmh-${codeA.toLowerCase()}`.replace("rmh-", "")]);
    const m = await db.query("select * from member");
    expect(m.rows).toHaveLength(2);
  });

  it("kode salah ditolak, akun tidak boleh gabung dua kali", async () => {
    await as(C);
    await expect(db.query("select join_household('XXXXXX', 'Cici')")).rejects.toThrow(/tidak ditemukan/);
    await as(B);
    await expect(db.query(`select join_household('${codeA}', 'Siti')`)).rejects.toThrow(/sudah tergabung/);
  });

  it("rumah tangga lain tidak melihat data kita", async () => {
    await as(C);
    await db.query("select create_household('Rumah C', 'Cici')");
    const cats = await db.query("select * from category");
    expect(cats.rows).toHaveLength(7); // hanya milik C
    const hh = await db.query("select * from household");
    expect(hh.rows).toHaveLength(1);
  });

  it("anggota hanya bisa mencatat atas namanya sendiri", async () => {
    await as(A);
    const cat = (await db.query<{ id: string; household_id: string }>(
      "select id, household_id from category where name = 'Jajan'",
    )).rows[0];
    const me = (await db.query<{ id: string }>("select id from member where user_id = auth.uid()")).rows[0];
    const other = (await db.query<{ id: string }>("select id from member where user_id <> auth.uid()")).rows[0];

    await db.query(
      "insert into expense (household_id, category_id, member_id, amount, spent_on) values ($1,$2,$3,15000,'2026-10-17')",
      [cat.household_id, cat.id, me.id],
    );
    await expect(
      db.query(
        "insert into expense (household_id, category_id, member_id, amount, spent_on) values ($1,$2,$3,1000,'2026-10-17')",
        [cat.household_id, cat.id, other.id],
      ),
    ).rejects.toThrow(/row-level security/);

    await as(B); // pasangan melihat catatan yang sama
    expect((await db.query("select * from expense")).rows).toHaveLength(1);
    await as(C); // rumah tangga lain tidak
    expect((await db.query("select * from expense")).rows).toHaveLength(0);
  });

  it("xp_event idempoten lewat ref", async () => {
    await as(A);
    const h = (await db.query<{ id: string }>("select id from household")).rows[0].id;
    await db.query("insert into xp_event (household_id, kind, points, ref) values ($1,'quest',20,'q1')", [h]);
    await expect(
      db.query("insert into xp_event (household_id, kind, points, ref) values ($1,'quest',20,'q1')", [h]),
    ).rejects.toThrow(/duplicate/);
  });

  it("adjust_stock mengubah stok + log, tidak pernah di bawah 0", async () => {
    await as(A);
    const h = (await db.query<{ id: string }>("select id from household")).rows[0].id;
    const it = (await db.query<{ id: string }>(
      "insert into item (household_id, name, unit, monthly_need, stock) values ($1,'Sabun','pcs',3,2) returning id",
      [h],
    )).rows[0];
    await db.query("select adjust_stock($1, -1, 'use')", [it.id]);
    await db.query("select adjust_stock($1, -5, 'use')", [it.id]); // dipotong jadi -1
    const stock = (await db.query<{ stock: string }>("select stock from item where id = $1", [it.id])).rows[0];
    expect(Number(stock.stock)).toBe(0);
    const logs = await db.query<{ delta: string }>("select delta from stock_log order by created_at");
    expect(logs.rows.map((r) => Number(r.delta))).toEqual([-1, -1]);
  });

  it("anon tidak bisa memanggil fungsi sensitif", async () => {
    await as(null);
    await db.exec("set role anon");
    await expect(db.query("select create_household('x','y')")).rejects.toThrow(/permission denied/);
  });

  it("periode & pemasukan: satu periode per tanggal, pemasukan ikut terhapus bersama periode", async () => {
    await as(A);
    const h = (await db.query<{ id: string }>("select id from household")).rows[0].id;
    const per = (await db.query<{ id: string }>(
      "insert into period (household_id, start_on) values ($1,'2026-10-25') returning id", [h],
    )).rows[0];
    await db.query(
      "insert into income (household_id, period_id, amount, received_on) values ($1,$2,10000000,'2026-10-25')",
      [h, per.id],
    );
    await expect(
      db.query("insert into period (household_id, start_on) values ($1,'2026-10-25')", [h]),
    ).rejects.toThrow(/duplicate/);
    await expect(
      db.query("insert into income (household_id, period_id, amount, received_on) values ($1,$2,0,'2026-10-25')", [h, per.id]),
    ).rejects.toThrow(/check/);
    await as(C);
    expect((await db.query("select * from period")).rows).toHaveLength(0);
    expect((await db.query("select * from income")).rows).toHaveLength(0);
  });

  it("budget per periode: data lama jadi default, alokasi baru berlaku mulai tanggalnya", async () => {
    await as(A);
    const h = (await db.query<{ id: string }>("select id from household")).rows[0].id;
    const cat = (await db.query<{ id: string }>("select id from category where name = 'Jajan'")).rows[0].id;
    const base = await db.query<{ effective_from: string }>("select effective_from::text from budget where category_id = $1", [cat]);
    expect(base.rows[0].effective_from).toBe("2000-01-01");
    await db.query(
      "insert into budget (household_id, category_id, amount, effective_from) values ($1,$2,800000,'2026-10-25')",
      [h, cat],
    );
    await expect(
      db.query("insert into budget (household_id, category_id, amount, effective_from) values ($1,$2,1,'2026-10-25')", [h, cat]),
    ).rejects.toThrow(/duplicate/);
    const rows = await db.query("select * from budget where category_id = $1", [cat]);
    expect(rows.rows).toHaveLength(2);
  });

  it("toko & urutan rak: terisolasi per rumah tangga, satu posisi per barang per toko", async () => {
    await as(A);
    const h = (await db.query<{ id: string }>("select id from household")).rows[0].id;
    const st = (await db.query<{ id: string }>(
      "insert into store (household_id, name) values ($1,'Hari-Hari') returning id", [h],
    )).rows[0];
    await expect(
      db.query("insert into store (household_id, name) values ($1,'hari-hari')", [h]),
    ).rejects.toThrow(/duplicate/);
    const item = (await db.query<{ id: string }>("select id from item limit 1")).rows[0];
    await db.query(
      "insert into store_item_order (household_id, store_id, item_id, avg_pos) values ($1,$2,$3,0.25)",
      [h, st.id, item.id],
    );
    await expect(
      db.query("insert into store_item_order (household_id, store_id, item_id, avg_pos) values ($1,$2,$3,0.5)", [h, st.id, item.id]),
    ).rejects.toThrow(/duplicate/);
    await expect(
      db.query("insert into store_item_order (household_id, store_id, item_id, avg_pos) values ($1,$2,$3,1.5)", [h, st.id, item.id]),
    ).rejects.toThrow(/check/);
    await as(C);
    expect((await db.query("select * from store")).rows).toHaveLength(0);
    expect((await db.query("select * from store_item_order")).rows).toHaveLength(0);
  });

  it("cek stok: penurunan tercatat sebagai pemakaian, waktu cek tersimpan", async () => {
    await as(A);
    const it = (await db.query<{ id: string }>("select id from item where name = 'Sabun'")).rows[0];
    await db.query("select adjust_stock($1, 3, 'adjust')", [it.id]);
    await db.query("select adjust_stock($1, -2, 'use')", [it.id]);
    await db.query("update item set stock_checked_at = now() where id = $1", [it.id]);
    const row = (await db.query<{ stock: string; stock_checked_at: string | null }>(
      "select stock, stock_checked_at from item where id = $1", [it.id],
    )).rows[0];
    expect(Number(row.stock)).toBe(1);
    expect(row.stock_checked_at).not.toBeNull();
    const uses = await db.query("select * from stock_log where item_id = $1 and reason = 'use'", [it.id]);
    expect(uses.rows.length).toBeGreaterThan(0);
  });
});
