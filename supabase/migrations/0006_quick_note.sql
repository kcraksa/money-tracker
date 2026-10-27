-- Tombol cepat boleh punya keterangan; ikut tersimpan di catatan pengeluaran saat tombol diketuk.
-- Aman dijalankan berulang.
alter table public.quick_expense
  add column if not exists note text check (note is null or char_length(note) <= 80);
