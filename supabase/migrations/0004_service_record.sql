-- Service Record: kendaraan, part yang diservis berkala, riwayat km, dan riwayat servis.

create table public.vehicle (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household(id) on delete cascade,
  name         text not null,
  kind         text not null check (kind in ('car', 'motorcycle')),
  plate        text,
  odometer_km  int not null default 0 check (odometer_km >= 0),
  odometer_on  date not null default current_date, -- kapan km terakhir diperbarui (diisi aplikasi, WIB)
  remind_days  int not null default 7 check (remind_days between 1 and 60),
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);
create index vehicle_household_idx on public.vehicle(household_id);

-- Riwayat pembacaan odometer: dasar menghitung laju pemakaian (km/hari) untuk perkiraan jatuh tempo.
create table public.odometer_reading (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household(id) on delete cascade,
  vehicle_id   uuid not null references public.vehicle(id) on delete cascade,
  km           int not null check (km >= 0),
  read_on      date not null,
  member_id    uuid references public.member(id) on delete set null,
  source       text not null default 'manual' check (source in ('manual', 'service', 'initial')),
  created_at   timestamptz not null default now()
);
create index odometer_reading_vehicle_idx on public.odometer_reading(vehicle_id, read_on);

-- Part/jenis servis per kendaraan dengan interval sendiri: km, bulan, atau keduanya (mana yang lebih dulu).
create table public.service_part (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references public.household(id) on delete cascade,
  vehicle_id      uuid not null references public.vehicle(id) on delete cascade,
  name            text not null,
  interval_km     int check (interval_km > 0),
  interval_months int check (interval_months > 0),
  active          boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  check (interval_km is not null or interval_months is not null)
);
create index service_part_vehicle_idx on public.service_part(vehicle_id);

create table public.service_visit (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household(id) on delete cascade,
  vehicle_id   uuid not null references public.vehicle(id) on delete cascade,
  serviced_on  date not null,
  odometer_km  int not null check (odometer_km >= 0),
  workshop     text,
  cost         bigint not null default 0 check (cost >= 0),
  note         text,
  member_id    uuid references public.member(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index service_visit_vehicle_idx on public.service_visit(vehicle_id, serviced_on desc);

create table public.service_visit_part (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household(id) on delete cascade,
  visit_id     uuid not null references public.service_visit(id) on delete cascade,
  part_id      uuid not null references public.service_part(id) on delete cascade,
  unique (visit_id, part_id)
);
create index service_visit_part_part_idx on public.service_visit_part(part_id);

-- ───────────────────────── RLS ─────────────────────────

do $$
declare t text;
begin
  foreach t in array array['vehicle', 'odometer_reading', 'service_part', 'service_visit', 'service_visit_part'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (public.is_member(household_id)) with check (public.is_member(household_id))',
      t || '_household', t);
  end loop;
end $$;

-- ───────────────────────── Fungsi ─────────────────────────

-- Perbarui km terkini + simpan ke riwayat dalam satu transaksi. Berjalan sebagai pemanggil (RLS berlaku).
create function public.record_odometer(p_vehicle uuid, p_km int, p_on date) returns void
language plpgsql set search_path = public as $$
declare v public.vehicle%rowtype;
begin
  select * into v from public.vehicle where id = p_vehicle for update;
  if not found then raise exception 'Kendaraan tidak ditemukan'; end if;
  if p_km is null or p_km < 0 then raise exception 'Km tidak valid'; end if;

  insert into public.odometer_reading (household_id, vehicle_id, km, read_on, member_id, source)
    values (v.household_id, p_vehicle, p_km, p_on, public.my_member_id(v.household_id), 'manual');
  update public.vehicle set odometer_km = p_km, odometer_on = p_on where id = p_vehicle;
end $$;

-- Catat satu kali servis: kunjungan + part yang diganti + km. Km kendaraan ikut naik bila lebih besar
-- (servis yang dicatat belakangan tidak menurunkan km terkini).
create function public.record_service(
  p_vehicle uuid, p_on date, p_km int, p_workshop text, p_cost bigint, p_note text, p_parts uuid[]
) returns uuid
language plpgsql set search_path = public as $$
declare
  v public.vehicle%rowtype;
  v_visit uuid;
begin
  select * into v from public.vehicle where id = p_vehicle for update;
  if not found then raise exception 'Kendaraan tidak ditemukan'; end if;
  if p_parts is null or cardinality(p_parts) = 0 then raise exception 'Pilih minimal satu part'; end if;
  if p_km is null or p_km < 0 then raise exception 'Km tidak valid'; end if;

  insert into public.service_visit (household_id, vehicle_id, serviced_on, odometer_km, workshop, cost, note, member_id)
    values (v.household_id, p_vehicle, p_on, p_km, nullif(trim(p_workshop), ''), greatest(coalesce(p_cost, 0), 0),
            nullif(trim(p_note), ''), public.my_member_id(v.household_id))
    returning id into v_visit;

  insert into public.service_visit_part (household_id, visit_id, part_id)
    select v.household_id, v_visit, sp.id from public.service_part sp
    where sp.id = any (p_parts) and sp.vehicle_id = p_vehicle;
  if not exists (select 1 from public.service_visit_part svp where svp.visit_id = v_visit) then
    raise exception 'Part tidak sesuai dengan kendaraan';
  end if;

  insert into public.odometer_reading (household_id, vehicle_id, km, read_on, member_id, source)
    values (v.household_id, p_vehicle, p_km, p_on, public.my_member_id(v.household_id), 'service');
  if p_km >= v.odometer_km then
    update public.vehicle set odometer_km = p_km, odometer_on = greatest(p_on, v.odometer_on) where id = p_vehicle;
  end if;
  return v_visit;
end $$;

revoke all on function public.record_odometer(uuid, int, date) from public, anon;
revoke all on function public.record_service(uuid, date, int, text, bigint, text, uuid[]) from public, anon;
grant execute on function public.record_odometer(uuid, int, date) to authenticated;
grant execute on function public.record_service(uuid, date, int, text, bigint, text, uuid[]) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.vehicle, public.service_visit;
  end if;
end $$;
