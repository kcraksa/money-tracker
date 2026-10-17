-- Kapan stok barang terakhir dicek (fitur "Cek stok sebelum belanja").
alter table public.item add column if not exists stock_checked_at timestamptz;
