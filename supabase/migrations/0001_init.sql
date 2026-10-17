-- Money Tracker Rumah Tangga: skema awal
-- Jalankan di Supabase SQL Editor (atau `supabase db push`).

-- ───────────────────────── Tabel ─────────────────────────

create table public.household (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text not null unique,
  created_at  timestamptz not null default now()
);

-- Satu akun hanya bisa tergabung di satu rumah tangga.
create table public.member (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household(id) on delete cascade,
  user_id      uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null,
  created_at   timestamptz not null default now()
);
create index member_household_idx on public.member(household_id);

-- kind: 'daily' = pengeluaran harian dengan budget, 'fixed' = tagihan tetap.
-- lump_sum: dibayar sekali jalan (belanja bulanan), forecast tidak dihitung per hari.
create table public.category (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household(id) on delete cascade,
  name         text not null,
  icon         text not null default '💸',
  kind         text not null default 'daily' check (kind in ('daily', 'fixed')),
  lump_sum     boolean not null default false,
  due_day      int check (due_day between 1 and 28),
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);
create index category_household_idx on public.category(household_id);

-- Budget bulanan per kategori (untuk tagihan tetap = nominal tagihan).
create table public.budget (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household(id) on delete cascade,
  category_id  uuid not null unique references public.category(id) on delete cascade,
  amount       bigint not null default 0 check (amount >= 0)
);
create index budget_household_idx on public.budget(household_id);

-- Tombol cepat untuk pengeluaran yang sering berulang.
create table public.quick_expense (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household(id) on delete cascade,
  category_id  uuid not null references public.category(id) on delete cascade,
  label        text not null,
  amount       bigint not null check (amount > 0),
  created_at   timestamptz not null default now()
);
create index quick_expense_household_idx on public.quick_expense(household_id);

create table public.expense (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household(id) on delete cascade,
  category_id  uuid not null references public.category(id) on delete restrict,
  member_id    uuid not null references public.member(id) on delete restrict,
  amount       bigint not null check (amount > 0),
  spent_on     date not null,
  note         text,
  created_at   timestamptz not null default now()
);
create index expense_household_date_idx on public.expense(household_id, spent_on);

-- Status bayar tagihan tetap per bulan. month = tanggal 1 bulan tersebut.
create table public.bill_payment (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household(id) on delete cascade,
  category_id  uuid not null references public.category(id) on delete cascade,
  month        date not null,
  expense_id   uuid references public.expense(id) on delete set null,
  paid_on      date not null,
  paid_by      uuid references public.member(id) on delete set null,
  on_time      boolean not null default true,
  unique (category_id, month)
);
create index bill_payment_household_idx on public.bill_payment(household_id, month);

-- Master barang belanja bulanan. Harga & satuan mengikuti rak (per pcs/botol/kg, bebas).
create table public.item (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.household(id) on delete cascade,
  name          text not null,
  unit          text not null default 'pcs',
  monthly_need  numeric(10,2) not null default 1 check (monthly_need >= 0),
  stock         numeric(10,2) not null default 0 check (stock >= 0),
  last_price    bigint not null default 0 check (last_price >= 0),
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);
create index item_household_idx on public.item(household_id);

-- Riwayat perubahan stok. reason 'use' dipakai untuk menghitung rata-rata pemakaian.
create table public.stock_log (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household(id) on delete cascade,
  item_id      uuid not null references public.item(id) on delete cascade,
  member_id    uuid references public.member(id) on delete set null,
  delta        numeric(10,2) not null,
  reason       text not null check (reason in ('use', 'buy', 'adjust')),
  created_at   timestamptz not null default now()
);
create index stock_log_item_idx on public.stock_log(item_id, created_at);
create index stock_log_household_idx on public.stock_log(household_id, created_at);

create table public.shopping_list (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.household(id) on delete cascade,
  month         date not null,
  status        text not null default 'open' check (status in ('open', 'done')),
  created_by    uuid references public.member(id) on delete set null,
  completed_by  uuid references public.member(id) on delete set null,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (household_id, month)
);

-- Baris checklist. Harga per satuan rak, total selalu dihitung (qty x harga), tidak disimpan.
create table public.shopping_list_item (
  id                uuid primary key default gen_random_uuid(),
  household_id      uuid not null references public.household(id) on delete cascade,
  list_id           uuid not null references public.shopping_list(id) on delete cascade,
  item_id           uuid references public.item(id) on delete set null,
  name              text not null,
  unit              text not null default 'pcs',
  qty_recommended   numeric(10,2) not null default 0,
  qty_bought        numeric(10,2) not null default 0,
  unit_price_est    bigint not null default 0,
  unit_price_actual bigint not null default 0,
  checked           boolean not null default false,
  is_extra          boolean not null default false,
  created_at        timestamptz not null default now()
);
create index shopping_list_item_list_idx on public.shopping_list_item(list_id);

-- Poin. member_id null = XP keluarga (tidak masuk papan kontribusi).
-- ref dipakai sebagai kunci idempotensi supaya poin yang sama tidak terhitung dua kali.
create table public.xp_event (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household(id) on delete cascade,
  member_id    uuid references public.member(id) on delete set null,
  kind         text not null check (kind in ('log', 'streak', 'bill', 'saving', 'bonus', 'quest', 'budget')),
  points       int not null check (points > 0),
  ref          text not null,
  note         text,
  created_at   timestamptz not null default now(),
  unique (household_id, ref)
);
create index xp_event_household_idx on public.xp_event(household_id, created_at);

-- Badge yang sudah diraih. period = 'YYYY-MM' (badge bisa diraih ulang tiap bulan).
create table public.badge (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household(id) on delete cascade,
  code         text not null,
  period       text not null,
  member_id    uuid references public.member(id) on delete set null,
  earned_at    timestamptz not null default now(),
  unique (household_id, code, period)
);
create index badge_household_idx on public.badge(household_id);

-- ───────────────────────── Helper RLS ─────────────────────────

create function public.is_member(h uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.member where household_id = h and user_id = auth.uid()
  );
$$;

create function public.my_member_id(h uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.member where household_id = h and user_id = auth.uid();
$$;

-- ───────────────────────── RLS ─────────────────────────

alter table public.household enable row level security;
alter table public.member enable row level security;

create policy household_select on public.household
  for select to authenticated using (public.is_member(id));

create policy member_select on public.member
  for select to authenticated using (public.is_member(household_id));
create policy member_update_self on public.member
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Tabel data biasa: anggota rumah tangga boleh baca & tulis datanya sendiri.
do $$
declare t text;
begin
  foreach t in array array[
    'category', 'budget', 'quick_expense', 'bill_payment', 'item', 'stock_log',
    'shopping_list', 'shopping_list_item', 'badge'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (public.is_member(household_id)) with check (public.is_member(household_id))',
      t || '_household', t);
  end loop;
end $$;

-- Pengeluaran & XP: pencatat harus akun yang sedang login.
alter table public.expense enable row level security;
create policy expense_select on public.expense
  for select to authenticated using (public.is_member(household_id));
create policy expense_insert on public.expense
  for insert to authenticated
  with check (public.is_member(household_id) and member_id = public.my_member_id(household_id));
create policy expense_update on public.expense
  for update to authenticated
  using (public.is_member(household_id))
  with check (public.is_member(household_id) and member_id = public.my_member_id(household_id));
create policy expense_delete on public.expense
  for delete to authenticated using (public.is_member(household_id));

alter table public.xp_event enable row level security;
create policy xp_event_select on public.xp_event
  for select to authenticated using (public.is_member(household_id));
create policy xp_event_insert on public.xp_event
  for insert to authenticated
  with check (
    public.is_member(household_id)
    and (member_id is null or member_id = public.my_member_id(household_id))
  );

-- ───────────────────────── Fungsi ─────────────────────────

create function public.new_invite_code() returns text
language plpgsql as $$
declare c text;
begin
  loop
    c := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from public.household where invite_code = c);
  end loop;
  return c;
end $$;

-- Buat rumah tangga baru + seed kategori awal. Mengembalikan household_id.
create function public.create_household(p_name text, p_display_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  hid uuid;
  cat_id uuid;
begin
  if uid is null then raise exception 'Belum login'; end if;
  if exists (select 1 from public.member where user_id = uid) then
    raise exception 'Akun ini sudah tergabung di sebuah rumah tangga';
  end if;
  if length(trim(p_display_name)) = 0 then raise exception 'Nama tampilan wajib diisi'; end if;

  insert into public.household (name, invite_code)
    values (coalesce(nullif(trim(p_name), ''), 'Rumah Kita'), public.new_invite_code())
    returning id into hid;
  insert into public.member (household_id, user_id, display_name)
    values (hid, uid, trim(p_display_name));

  -- Tagihan tetap
  insert into public.category (household_id, name, icon, kind, due_day, sort_order)
    values (hid, 'Listrik', '⚡', 'fixed', 20, 1) returning id into cat_id;
  insert into public.budget (household_id, category_id) values (hid, cat_id);
  insert into public.category (household_id, name, icon, kind, due_day, sort_order)
    values (hid, 'Sekolah anak', '🎒', 'fixed', 10, 2) returning id into cat_id;
  insert into public.budget (household_id, category_id) values (hid, cat_id);

  -- Pengeluaran harian
  insert into public.category (household_id, name, icon, kind, sort_order)
    values (hid, 'Transport', '🚌', 'daily', 3) returning id into cat_id;
  insert into public.budget (household_id, category_id) values (hid, cat_id);
  insert into public.category (household_id, name, icon, kind, sort_order)
    values (hid, 'Bensin', '⛽', 'daily', 4) returning id into cat_id;
  insert into public.budget (household_id, category_id) values (hid, cat_id);
  insert into public.quick_expense (household_id, category_id, label, amount)
    values (hid, cat_id, 'Bensin', 50000);
  insert into public.category (household_id, name, icon, kind, sort_order)
    values (hid, 'Jajan', '🍿', 'daily', 5) returning id into cat_id;
  insert into public.budget (household_id, category_id) values (hid, cat_id);
  insert into public.category (household_id, name, icon, kind, sort_order)
    values (hid, 'Sayur', '🥬', 'daily', 6) returning id into cat_id;
  insert into public.budget (household_id, category_id) values (hid, cat_id);
  insert into public.category (household_id, name, icon, kind, lump_sum, sort_order)
    values (hid, 'Belanja bulanan', '🛒', 'daily', true, 7) returning id into cat_id;
  insert into public.budget (household_id, category_id) values (hid, cat_id);

  return hid;
end $$;

-- Gabung ke rumah tangga yang sudah ada lewat kode undangan.
create function public.join_household(p_code text, p_display_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  hid uuid;
begin
  if uid is null then raise exception 'Belum login'; end if;
  if exists (select 1 from public.member where user_id = uid) then
    raise exception 'Akun ini sudah tergabung di sebuah rumah tangga';
  end if;
  if length(trim(p_display_name)) = 0 then raise exception 'Nama tampilan wajib diisi'; end if;

  select id into hid from public.household
    where invite_code = upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g'));
  if hid is null then raise exception 'Kode undangan tidak ditemukan'; end if;

  insert into public.member (household_id, user_id, display_name)
    values (hid, uid, trim(p_display_name));
  return hid;
end $$;

-- Ubah stok dan catat ke stock_log dalam satu transaksi. Stok tidak pernah di bawah 0.
-- Berjalan sebagai pemanggil, jadi RLS tetap berlaku.
create function public.adjust_stock(p_item uuid, p_delta numeric, p_reason text) returns numeric
language plpgsql set search_path = public as $$
declare
  it public.item%rowtype;
  applied numeric;
begin
  select * into it from public.item where id = p_item for update;
  if not found then raise exception 'Barang tidak ditemukan'; end if;

  applied := greatest(it.stock + p_delta, 0) - it.stock;
  if applied = 0 then return it.stock; end if;

  update public.item set stock = stock + applied where id = p_item;
  insert into public.stock_log (household_id, item_id, member_id, delta, reason)
    values (it.household_id, p_item, public.my_member_id(it.household_id), applied, p_reason);
  return it.stock + applied;
end $$;

revoke all on function public.create_household(text, text) from public, anon;
revoke all on function public.join_household(text, text) from public, anon;
revoke all on function public.adjust_stock(uuid, numeric, text) from public, anon;
revoke all on function public.is_member(uuid) from public, anon;
revoke all on function public.my_member_id(uuid) from public, anon;
grant execute on function public.create_household(text, text) to authenticated;
grant execute on function public.join_household(text, text) to authenticated;
grant execute on function public.adjust_stock(uuid, numeric, text) to authenticated;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.my_member_id(uuid) to authenticated;

-- ───────────────────────── Realtime ─────────────────────────
-- Supaya catatan pasangan langsung muncul di layar kita.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.expense, public.xp_event, public.item, public.shopping_list_item, public.bill_payment;
  end if;
end $$;
