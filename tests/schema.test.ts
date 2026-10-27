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
  for (const f of ["0001_init.sql", "0002_period_income_store.sql", "0003_stock_check.sql", "0004_service_record.sql", "0006_quick_note.sql"]) {
    await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
  }
  // 0005 dijalankan di dalam tes servis: sebelum itu, part tanpa interval ditolak.
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

  it("tombol cepat: keterangan opsional (maks. 80 huruf), migrasi 0006 aman diulang, terisolasi per rumah tangga", async () => {
    await db.exec("reset role");
    await db.exec(readFileSync("supabase/migrations/0006_quick_note.sql", "utf8"));
    await db.exec(readFileSync("supabase/migrations/0006_quick_note.sql", "utf8"));
    await as(A);
    const q = (await db.query<{ id: string; household_id: string; category_id: string }>("select id, household_id, category_id from quick_expense limit 1")).rows[0];
    expect((await db.query<{ note: string | null }>("select note from quick_expense where id = $1", [q.id])).rows[0].note).toBeNull();
    await db.query("update quick_expense set note = 'Parkir mall' where id = $1", [q.id]);
    await db.query(
      "insert into quick_expense (household_id, category_id, label, amount, note) values ($1,$2,'Tol',12000,null)",
      [q.household_id, q.category_id],
    );
    await expect(db.query("update quick_expense set note = $2 where id = $1", [q.id, "x".repeat(81)])).rejects.toThrow(/check/);
    await as(C); // rumah tangga lain tidak melihat tombol cepat kita
    expect((await db.query("select * from quick_expense where note = 'Parkir mall'")).rows).toHaveLength(0);
    await as(A);
    await db.query("delete from quick_expense where label = 'Tol'");
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

  it("mengubah catatan: hanya pencatat aslinya; pasangan ditolak, rumah tangga lain tidak melihatnya", async () => {
    await as(A);
    const e = (await db.query<{ id: string }>("select id from expense limit 1")).rows[0];
    const cat = (await db.query<{ id: string }>("select id from category where name = 'Sayur'")).rows[0];
    const mine = await db.query<{ amount: string; spent_on: string }>(
      "update expense set amount = 17500, category_id = $2, spent_on = '2026-10-16', note = 'diperbaiki' where id = $1 returning amount, spent_on::text",
      [e.id, cat.id],
    );
    expect(Number(mine.rows[0].amount)).toBe(17500);
    expect(mine.rows[0].spent_on).toBe("2026-10-16");

    await as(B); // pasangan melihat barisnya tetapi ditolak aturan akses (42501), bukan diam-diam tidak berubah
    await expect(db.query("update expense set amount = 1 where id = $1 returning id", [e.id])).rejects.toMatchObject({ code: "42501" });
    await as(A);
    expect(Number((await db.query<{ amount: string }>("select amount from expense where id = $1", [e.id])).rows[0].amount)).toBe(17500);

    await as(C); // rumah tangga lain tidak melihat maupun mengubah
    expect((await db.query("update expense set amount = 1 where id = $1 returning id", [e.id])).rows).toHaveLength(0);
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

  it("tanpa migrasi 0003, memilih stock_checked_at gagal dengan 42703 (penyebab daftar stok kosong)", async () => {
    const old = new PGlite();
    await old.exec(`
      create role anon nologin; create role authenticated nologin;
      create schema auth; create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
    `);
    for (const f of ["0001_init.sql", "0002_period_income_store.sql"]) {
      await old.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
    }
    await expect(old.query("select stock_checked_at from item")).rejects.toMatchObject({ code: "42703" });
    await old.query("select id, name from item"); // kolom lama tetap bisa dibaca
  });

  it("migrasi 0003 aman dijalankan dua kali", async () => {
    await db.exec("reset role");
    await db.exec(readFileSync("supabase/migrations/0003_stock_check.sql", "utf8"));
    await db.exec(readFileSync("supabase/migrations/0003_stock_check.sql", "utf8"));
  });

  describe("service record", () => {
    let vehicle = "";
    const parts: Record<string, string> = {};

    it("kendaraan & part: terisolasi per rumah tangga; sebelum migrasi 0005 part wajib punya interval", async () => {
      await as(A);
      const h = (await db.query<{ id: string }>("select id from household")).rows[0].id;
      vehicle = (await db.query<{ id: string }>(
        "insert into vehicle (household_id, name, kind, odometer_km, odometer_on) values ($1,'Avanza','car',45000,'2026-10-01') returning id", [h],
      )).rows[0].id;
      for (const [name, km, months] of [["Oli mesin", 7000, 6], ["Busi", 10000, null], ["Aki", null, 24]] as const) {
        parts[name] = (await db.query<{ id: string }>(
          "insert into service_part (household_id, vehicle_id, name, interval_km, interval_months) values ($1,$2,$3,$4,$5) returning id",
          [h, vehicle, name, km, months],
        )).rows[0].id;
      }
      await expect(
        db.query("insert into service_part (household_id, vehicle_id, name) values ($1,$2,'Tanpa interval')", [h, vehicle]),
      ).rejects.toThrow(/check/);
      await as(C);
      expect((await db.query("select * from vehicle")).rows).toHaveLength(0);
      expect((await db.query("select * from service_part")).rows).toHaveLength(0);
    });

    it("migrasi 0005: part boleh tanpa interval (hanya riwayat), aman dijalankan dua kali, interval lain tetap diperiksa", async () => {
      await db.exec("reset role");
      await db.exec(readFileSync("supabase/migrations/0005_flexible_parts.sql", "utf8"));
      await db.exec(readFileSync("supabase/migrations/0005_flexible_parts.sql", "utf8"));
      await as(A);
      const h = (await db.query<{ id: string }>("select id from household")).rows[0].id;
      const r = await db.query<{ interval_km: number | null; interval_months: number | null }>(
        "insert into service_part (household_id, vehicle_id, name) values ($1,$2,'Tanpa pengingat') returning interval_km, interval_months",
        [h, vehicle],
      );
      expect(r.rows[0]).toEqual({ interval_km: null, interval_months: null });
      // Nilai tidak masuk akal tetap ditolak.
      await expect(
        db.query("insert into service_part (household_id, vehicle_id, name, interval_km) values ($1,$2,'Nol',0)", [h, vehicle]),
      ).rejects.toThrow(/check/);
      await db.query("delete from service_part where name = 'Tanpa pengingat'");
    });

    it("record_odometer: memperbarui km dan menyimpan riwayat", async () => {
      await as(B); // pasangan juga bisa memperbarui
      await db.query("select record_odometer($1, 45600, '2026-10-10')", [vehicle]);
      const v = (await db.query<{ odometer_km: number; odometer_on: string }>("select odometer_km, odometer_on::text from vehicle where id = $1", [vehicle])).rows[0];
      expect(v.odometer_km).toBe(45600);
      expect(v.odometer_on).toBe("2026-10-10");
      const r = await db.query<{ source: string }>("select source from odometer_reading where vehicle_id = $1", [vehicle]);
      expect(r.rows.map((x) => x.source)).toEqual(["manual"]);
      await expect(db.query("select record_odometer($1, -5, '2026-10-10')", [vehicle])).rejects.toThrow(/tidak valid/);
    });

    it("record_service: kunjungan + part + km naik; servis lampau tidak menurunkan km", async () => {
      await as(A);
      const id = (await db.query<{ record_service: string }>(
        "select record_service($1, '2026-10-12', 45800, ' Bengkel Jaya ', 350000, null, $2::uuid[])",
        [vehicle, [parts["Oli mesin"], parts["Busi"]]],
      )).rows[0].record_service;
      const vp = await db.query("select * from service_visit_part where visit_id = $1", [id]);
      expect(vp.rows).toHaveLength(2);
      const visit = (await db.query<{ workshop: string; cost: string }>("select workshop, cost from service_visit where id = $1", [id])).rows[0];
      expect(visit.workshop).toBe("Bengkel Jaya");
      expect(Number(visit.cost)).toBe(350000);
      expect((await db.query<{ odometer_km: number }>("select odometer_km from vehicle where id = $1", [vehicle])).rows[0].odometer_km).toBe(45800);

      await db.query("select record_service($1, '2026-06-01', 40000, null, 0, 'servis lama', $2::uuid[])", [vehicle, [parts["Aki"]]]);
      expect((await db.query<{ odometer_km: number }>("select odometer_km from vehicle where id = $1", [vehicle])).rows[0].odometer_km).toBe(45800);
    });

    it("record_service menolak tanpa part, part kendaraan lain, dan dari rumah tangga lain", async () => {
      await as(A);
      await expect(db.query("select record_service($1, '2026-10-12', 46000, null, 0, null, $2::uuid[])", [vehicle, []])).rejects.toThrow(/minimal satu part/);
      await expect(
        db.query("select record_service($1, '2026-10-12', 46000, null, 0, null, $2::uuid[])", [vehicle, ["00000000-0000-0000-0000-0000000000ff"]]),
      ).rejects.toThrow(/tidak sesuai/);
      await as(C);
      await expect(db.query("select record_odometer($1, 99999, '2026-10-12')", [vehicle])).rejects.toThrow(/tidak ditemukan/);
    });

    it("menghapus kendaraan ikut menghapus part, km, dan riwayat servis", async () => {
      await as(A);
      await db.query("delete from vehicle where id = $1", [vehicle]);
      for (const t of ["service_part", "service_visit", "service_visit_part", "odometer_reading"]) {
        expect((await db.query(`select * from ${t}`)).rows).toHaveLength(0);
      }
    });
  });
});
