-- Periode gajian, pemasukan, alokasi per periode, pos anggaran yang bisa diarsipkan,
-- dan urutan rak per toko untuk checklist belanja.
-- Aman dijalankan di atas 0001 (data lama tetap berlaku).

-- ───────────────────────── Periode & pemasukan ─────────────────────────

-- Periode anggaran dimulai tiap gajian dan berlangsung sampai gajian berikutnya.
-- Sebelum ada periode, aplikasi memakai bulan kalender.
create table public.period (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household(id) on delete cascade,
  start_on     date not null,
  created_by   uuid references public.member(id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (household_id, start_on)
);

create table public.income (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household(id) on delete cascade,
  period_id    uuid not null references public.period(id) on delete cascade,
  amount       bigint not null check (amount > 0),
  label        text not null default 'Gaji',
  received_on  date not null,
  member_id    uuid references public.member(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index income_period_idx on public.income(period_id);

-- Budget kini berlaku mulai periode tertentu. Baris dengan effective_from terbaru yang
-- <= awal periode dipakai (carry-over otomatis). Data lama = default sejak 2000-01-01.
alter table public.budget add column effective_from date not null default '2000-01-01';
alter table public.budget drop constraint budget_category_id_key;
alter table public.budget add constraint budget_category_from_key unique (category_id, effective_from);

-- Pos anggaran tidak dihapus (riwayat pengeluaran tetap), hanya diarsipkan.
alter table public.category add column active boolean not null default true;

-- ───────────────────────── Toko & urutan rak ─────────────────────────

create table public.store (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household(id) on delete cascade,
  name         text not null,
  created_at   timestamptz not null default now()
);
create unique index store_name_idx on public.store (household_id, lower(name));

-- Posisi rata-rata (0 = paling awal rute, 1 = paling akhir) tiap barang di tiap toko,
-- dipelajari dari urutan centang saat belanja.
create table public.store_item_order (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household(id) on delete cascade,
  store_id     uuid not null references public.store(id) on delete cascade,
  item_id      uuid not null references public.item(id) on delete cascade,
  avg_pos      numeric(6,4) not null check (avg_pos between 0 and 1),
  samples      int not null default 1 check (samples > 0),
  updated_at   timestamptz not null default now(),
  unique (store_id, item_id)
);
create index store_item_order_store_idx on public.store_item_order(store_id);

alter table public.shopping_list add column store_id uuid references public.store(id) on delete set null;
alter table public.shopping_list_item add column checked_at timestamptz;

-- ───────────────────────── RLS ─────────────────────────

do $$
declare t text;
begin
  foreach t in array array['period', 'income', 'store', 'store_item_order'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (public.is_member(household_id)) with check (public.is_member(household_id))',
      t || '_household', t);
  end loop;
end $$;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.income, public.period;
  end if;
end $$;
