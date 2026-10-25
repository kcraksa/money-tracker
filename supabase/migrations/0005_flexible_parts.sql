-- Komponen servis boleh tanpa interval: hanya dicatat riwayatnya, tanpa pengingat.
-- Menghapus syarat "interval km atau bulan harus ada" pada service_part.
-- Aman dijalankan berulang.
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.service_part'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%interval_km IS NOT NULL%interval_months IS NOT NULL%'
  loop
    execute format('alter table public.service_part drop constraint %I', c);
  end loop;
end $$;
