-- Kapan stok barang terakhir dicek (fitur "Cek stok sebelum belanja").
alter table public.item add column stock_checked_at timestamptz;
