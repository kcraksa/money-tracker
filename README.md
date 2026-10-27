# Catatan Kita: Money Tracker & Service Record

Aplikasi web (PWA) untuk mencatat pengeluaran rumah tangga berdua. Prioritas: **input secepat mungkin**,
plus checklist belanja bulanan berbasis stok, forecast budget, dan gamifikasi ringan.

**Stack:** Next.js 16 (App Router) · Tailwind 4 · Supabase (Postgres, Auth, Realtime, RLS) · Vercel

Setelah login (dan splash bawaan PWA) muncul layar **Menu** dengan dua pilihan: **Money Tracker** dan **Service Record**.

## Fitur Money Tracker

| Layar | Isi |
|---|---|
| **Catat** | Keypad besar, kategori satu tap, tombol cepat (mis. Bensin 50rb), tanggal otomatis, pencatat otomatis, Urungkan, antrean offline |
| **Beranda** | Level & XP keluarga, streak, ringkasan periode (pemasukan, dialokasikan, belum dibagi), sisa anggaran + forecast akhir periode, tagihan tetap (lunas/belum), quest minggu ini |
| **Rencana gajian** | Catat pemasukan, bagi ke tiap pos dengan penghitung "belum dialokasikan" langsung, tambah/arsipkan pos (mis. Makan) |
| **Cek stok** | Sebelum belanja, hitung barang di rumah (− / + / ketik angka / "Habis"), lalu checklist otomatis diperbarui. Penurunan stok tercatat sebagai pemakaian nyata |
| **Checklist** | Dibuat otomatis dari rekomendasi `max(0, kebutuhan − stok)`. Pilih toko, urutan mengikuti rak toko itu. Centang barang, isi harga per satuan (sesuai rak), total dihitung otomatis |
| **Stok rumah** | Stok diubah dengan tombol **+ / −**. Perkiraan pemakaian dihitung ulang dari pemakaian nyata beberapa bulan terakhir |
| **Evaluasi** | Rekomendasi vs dibeli, barang di luar daftar, uang yang dihemat |
| **Pencapaian** | Badge, quest, papan kontribusi dua jalur (rajin mencatat vs hemat) |

Tema terang/gelap (otomatis + tombol), mobile-first, dan dirancang terasa seperti aplikasi native:
transisi halaman (View Transitions), bottom sheet yang bisa diseret, pull-to-refresh, daftar yang berpindah dengan animasi,
getaran halus (Android), dan perubahan di toko tetap aman saat sinyal hilang (antrean kirim ulang otomatis).

## Service Record

Pencatatan servis berkala kendaraan (mobil dan motor), dipakai berdua dalam satu rumah tangga.

| Layar | Isi |
|---|---|
| **Kendaraan** | Kartu tiap kendaraan: km terkini + tombol **Update km**, status, dan part yang paling mendesak. Bagian "Perlu perhatian" merangkum part yang terlewat/sebentar lagi lintas kendaraan |
| **Detail kendaraan** | Semua part dengan bar progres, interval, servis terakhir, dan batas km/tanggal berikutnya |
| **Catat servis** | Tanggal, km, part yang diganti (yang mendekati jadwal tercentang otomatis), biaya, bengkel, catatan |
| **Riwayat** | Timeline servis per kendaraan dengan total biaya; bisa dihapus |
| **Atur** | Ubah interval tiap part, tambah/arsipkan part, frekuensi pengingat update km |

- **Interval per part, per kendaraan**, dalam km, bulan, atau keduanya (mana yang tercapai lebih dulu). Saat menambah kendaraan, daftar
  part diisi dari template mobil/motor (oli motor 3.000 km, oli mobil 7.000 km, busi 10.000 km, dst.). Angka itu perkiraan umum,
  sesuaikan dengan buku servis kendaraanmu.
- **Alert**: *Terlewat* bila sudah melewati batas km atau tanggal. *Sebentar lagi* bila sisa ≤ 15% interval (minimal 200 km), atau
  perkiraan/batas waktunya ≤ 14 hari. Perkiraan hari dihitung dari laju pemakaianmu (km/hari dari catatan km 60 hari terakhir),
  jadi kendaraan yang dipakai tiap hari dapat alert lebih awal.
- **Pengingat update km**: tiap kendaraan punya frekuensi sendiri (bawaan 7 hari). Saat sudah waktunya, kartunya menyala dan muncul
  banner di daftar kendaraan; layar Menu menampilkan lencana jumlah alert.
- **Validasi km**: angka yang lebih kecil dari catatan terakhir atau melonjak > 3.000 km diminta dikonfirmasi dulu.

> **Notifikasi hanya di dalam aplikasi** (lencana, banner, dan kartu yang menyala saat aplikasi dibuka). Belum ada push ke HP saat
> aplikasi tertutup; itu butuh kunci VAPID, Vercel Cron, dan service role key Supabase, dan di iPhone hanya jalan bila aplikasi
> dipasang di Layar Utama. Bisa ditambahkan nanti bila diperlukan.

### Periode gajian

Anggaran berjalan per **periode**: dari satu gajian ke gajian berikutnya (mis. 25 Okt–24 Nov), bukan bulan kalender.

- Gajian pertama yang dicatat di **Rencana gajian** memulai periode. Sebelum itu aplikasi memakai bulan kalender.
- Catat **Gajian baru** (centang "mulai periode baru") untuk periode berikutnya. Pemasukan lain (bonus) masuk ke periode berjalan.
- Alokasi per pos **carry-over**: periode baru otomatis memakai angka periode sebelumnya sampai kamu mengubahnya.
- Tanggal jatuh tempo tagihan dihitung di dalam periode (jatuh tempo tgl 20 pada periode 25 Okt–24 Nov = 20 Nov).
- Kalau gajian berikutnya belum dicatat padahal periode sudah lewat sebulan, data tidak terpotong: periode tetap berjalan dan muncul pengingat.

### Urutan checklist mengikuti rak toko

Saat belanja, pilih toko (Hari-Hari, Naga, dst.). Urutan rak **dipelajari dari urutan kamu mencentang barang**: tiap belanja
menggeser posisi rata-rata barang di toko itu, jadi makin sering belanja makin rapi. Barang yang belum tertib di toko itu
ditaruh di bagian "posisi belum diketahui", dan yang sudah dicentang turun ke "sudah di keranjang". Agar urutan yang
dipelajari benar, **centang saat barang masuk keranjang**, bukan di kasir.

### Aturan penting

- **Harga per satuan rak.** Satuan adalah label bebas (pcs, botol, kg…). Total = jumlah × harga per satuan dan selalu dihitung, tidak disimpan.
- **Forecast** = pengeluaran sejauh ini ÷ hari berjalan × panjang periode. Peringatan baru muncul **mulai hari ke-7 periode** (data awal bulan terlalu sedikit). Kategori sekali jalan (Belanja bulanan) tidak diproyeksi, hanya dibandingkan dengan budget.
- **Tanggal memakai WIB** (Asia/Jakarta), bukan UTC server.

### Poin (XP)

| Sumber | XP | Untuk |
|---|---|---|
| Catatan pertama hari itu | 10 | pencatat |
| Streak kelipatan 7 hari | 30 | pencatat |
| Tagihan tetap lunas tepat waktu | 25 | pembayar |
| **Hemat belanja**: 1 poin tiap Rp 2.000 dihemat (maks 100) | s/d 100 | yang menyelesaikan belanja |
| **Bonus** belanja tidak melebihi rekomendasi | 40 | yang menyelesaikan belanja |
| Kategori harian aman di akhir periode | 20 / kategori | keluarga |
| Quest mingguan selesai | 50 | keluarga |

Papan kontribusi membandingkan **Rajin** (catat + streak + tagihan) dan **Hemat** (hemat belanja + bonus). Poin hemat
sengaja berbobot lebih besar. "Hemat" hanya dihitung per barang yang dibeli **sesuai/di atas rekomendasi**, jadi tidak
bisa "menghemat" dengan tidak membeli apa-apa; barang di luar daftar tidak pernah menambah hemat.
Semua poin idempoten lewat kolom `ref` (tidak bisa terhitung dua kali).

## Menjalankan di lokal

```bash
npm install
cp .env.example .env.local   # isi dengan kunci Supabase (lihat bawah)
npm run dev                  # http://localhost:3000
```

Perintah lain: `npm test` (logika + skema SQL/RLS di Postgres nyata via pglite), `npm run lint`, `npm run build`.

## 1. Setup Supabase

1. Buat project di <https://supabase.com> (region **Singapore / ap-southeast-1** supaya dekat).
2. **SQL Editor** → New query → jalankan berurutan:
   [`0001_init.sql`](supabase/migrations/0001_init.sql), lalu
   [`0002_period_income_store.sql`](supabase/migrations/0002_period_income_store.sql) (periode gajian, pemasukan, toko & urutan rak), lalu
   [`0003_stock_check.sql`](supabase/migrations/0003_stock_check.sql) (waktu cek stok), lalu
   [`0004_service_record.sql`](supabase/migrations/0004_service_record.sql) (Service Record: kendaraan, part, km, riwayat servis), lalu
   [`0005_flexible_parts.sql`](supabase/migrations/0005_flexible_parts.sql) (komponen servis boleh tanpa interval/pengingat), lalu
   [`0006_quick_note.sql`](supabase/migrations/0006_quick_note.sql) (keterangan pada tombol cepat).
   (Atau dengan CLI: `supabase link` lalu `supabase db push`, yang menjalankan semuanya.)
   Tanpa 0005 aplikasi tetap jalan; hanya menyimpan komponen tanpa pengingat yang akan ditolak dengan pesan yang jelas.
   Tanpa 0006 tombol cepat tetap berfungsi, hanya tanpa kolom keterangan.
3. **Project Settings → API**: salin **Project URL** dan **anon public key**. Keduanya aman berada di browser,
   karena keamanan data dijaga Row Level Security per rumah tangga.
4. **Authentication → URL Configuration**
   - *Site URL*: URL produksi (mis. `https://catatan-kita.vercel.app`; di lokal `http://localhost:3000`).
   - *Redirect URLs*: tambahkan `https://<domain-kamu>/auth/confirm` dan `http://localhost:3000/auth/confirm`
     (untuk preview Vercel: `https://*-<tim-kamu>.vercel.app/auth/confirm`).
5. **Login dengan Google (disarankan)**: tidak mengirim email, jadi bebas dari batas pengiriman email Supabase.
   1. [Google Cloud Console](https://console.cloud.google.com/) → pilih/buat project → **APIs & Services → OAuth consent screen**
      (User type *External*, isi nama aplikasi dan email, lalu **Publish app** agar semua akun Google bisa masuk).
   2. **Credentials → Create credentials → OAuth client ID** → tipe **Web application**.
      - *Authorized JavaScript origins*: URL aplikasi (mis. `https://catatan-kita.vercel.app`) dan `http://localhost:3000`.
      - *Authorized redirect URIs*: `https://<project-ref>.supabase.co/auth/v1/callback`
        (alamat persisnya tertera di Supabase pada halaman provider Google).
   3. Salin **Client ID** dan **Client secret**.
   4. Supabase → **Authentication → Providers → Google** → aktifkan, tempel Client ID & secret, simpan.
   5. Pastikan *Redirect URLs* (langkah 4) memuat `https://<domain-kamu>/auth/confirm`.

   Email tetap tersedia sebagai cadangan di halaman login. Kalau mau tanpa email sama sekali, tidak perlu mengatur template di bawah.
6. **Authentication → Emails → Templates** (hanya bila memakai login email): edit **Magic Link** *dan* **Confirm signup** (pengguna baru memakai yang
   kedua) agar link bekerja lintas browser dan ada kode 6 digit:

   ```html
   <h2>Masuk ke Catatan Kita</h2>
   <p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Klik untuk masuk</a></p>
   <p>Atau masukkan kode: <b>{{ .Token }}</b></p>
   ```

   Isi yang sama dipakai di kedua template (aplikasi otomatis mencoba tipe token yang sesuai).
   Kode 6 digit penting kalau aplikasi sudah dipasang di layar utama iPhone: link dari email sering terbuka di Safari
   biasa, bukan di aplikasi, jadi memasukkan kode di aplikasi adalah cara paling mulus.
7. *(Opsional, hanya untuk login email)* **Project Settings → Auth → SMTP**: pasang SMTP sendiri (Resend, Brevo, dll.).
   Email bawaan Supabase dibatasi hanya beberapa email per jam, cukup untuk uji coba tapi bisa menghambat login.

## 2. Environment variable

| Nama | Nilai | Dipakai di |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL, mis. `https://abcd1234.supabase.co` | browser + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key | browser + server |

Tidak ada *service role key* di aplikasi ini dan **jangan pernah** menambahkannya sebagai `NEXT_PUBLIC_*`.
Kalau variabel belum diisi, aplikasi menampilkan halaman `/setup`.

## 3. Deploy ke Vercel

1. Push repo ke GitHub (`kcraksa/money-tracker`).
2. <https://vercel.com/new> → **Import** repo tersebut. Framework otomatis terdeteksi **Next.js**, tidak perlu mengubah build command.
3. **Environment Variables**: isi dua variabel di atas untuk *Production*, *Preview*, dan *Development*.
4. **Deploy**. Setelah mendapat URL, kembali ke Supabase (langkah 1.4) dan pastikan *Site URL* serta *Redirect URLs* sudah memakai URL itu.
5. *(Opsional)* **Settings → Functions → Region** pilih **Singapore (sin1)** agar dekat dengan database.
6. Redeploy bila mengubah env var (nilai `NEXT_PUBLIC_*` ditanam saat build).

### Pertama kali dipakai

1. Buka URL → **Lanjutkan dengan Google** → **Buat rumah tangga** → catat **kode undangan**.
2. Buka **Rencana gajian** (dari Beranda atau Pengaturan): catat gajian, lalu bagi ke tiap pos (belanja bulanan, makan, bensin, tagihan, dst.). Di **Pengaturan** atur tombol cepat.
3. Istri membuka URL yang sama, login dengan akun Google-nya, pilih **Gabung pakai kode**.
4. Di **Checklist → Stok rumah** tambahkan barang belanja bulanan (satuan & harga per satuan sesuai rak). Sebelum belanja, tekan **Cek stok**, lalu belanja mengikuti checklist.
5. Pasang di HP: Android Chrome → menu ⋮ → *Install app*; iPhone Safari → Bagikan → *Tambah ke Layar Utama*.

## Struktur proyek

```
supabase/migrations/               skema, RLS, seed kategori, fungsi (0001); periode, pemasukan, toko & urutan rak (0002)
src/lib/                            logika murni + tes: forecast, period, route (urutan rak), shopping, gamification, date
src/lib/server/xp.ts                pemberian XP/badge/quest (idempoten)
src/lib/supabase/                   klien browser/server + penjaga sesi
src/proxy.ts                        refresh sesi & redirect ke /login (pengganti middleware di Next 16)
src/app/menu/                       layar Menu (pilih Money Tracker / Service Record)
src/app/(servis)/servis/            Service Record: kendaraan, detail, catat servis, riwayat, atur
src/lib/service/                    logika murni + tes: status part (km+waktu), laju km/hari, validasi, template part
src/app/(app)/                      Beranda, Catat, Rencana gajian, Checklist (+Stok), Evaluasi, Pencapaian, Pengaturan
src/app/actions/                    Server Actions (mencatat, tagihan, rencana gajian, stok, belanja, pengaturan)
public/sw.js                        service worker: layar Catat tetap terbuka saat offline
tests/schema.test.ts                menguji skema + RLS pada Postgres nyata (pglite)
```

## Kecepatan

Simpan terasa instan karena: (1) tampilan **optimistik** — "tersimpan" muncul seketika dan pengiriman berjalan di latar belakang
(gagal jaringan masuk antrean, bisa diurungkan kapan saja); (2) jalur simpan di server hanya memuat yang perlu — bonus streak,
quest, dan penutupan periode dikerjakan setelah balasan terkirim (`after()`); (3) login diverifikasi **lokal** (`getClaims`),
bukan lewat jaringan di tiap permintaan.

Agar server juga cepat, perhatikan dua hal ini:

- **Samakan wilayah Vercel dan Supabase.** Fungsi Vercel secara default berjalan di Washington D.C. (`iad1`); bila Supabase di Singapura,
  tiap query menempuh ±230 ms pulang-pergi. Atur *Settings → Functions → Region* di Vercel ke wilayah terdekat dengan project
  Supabase (Singapura = `sin1`), atau tambahkan `"regions": ["sin1"]` di `vercel.json`.
- **Pakai JWT Signing Keys asimetris** (Supabase → *Project Settings → JWT Keys*; project baru sudah memakainya). Dengan kunci
  lama (simetris), `getClaims` otomatis kembali ke cek jaringan: tetap benar, hanya tidak secepat itu.

## Catatan teknis

- **Offline:** saat tanpa sinyal, catatan disimpan di HP (dengan ID unik) dan dikirim otomatis begitu online. ID unik mencegah catatan ganda.
- **Realtime:** catatan, stok, dan checklist dari pasangan langsung muncul tanpa reload.
- **Keamanan:** semua tabel memakai RLS berbasis keanggotaan rumah tangga. Pengeluaran hanya bisa dicatat atas nama akun yang sedang login.
- **Next.js 16:** `middleware` bernama `proxy.ts`, `cookies()` bersifat async. Lihat `AGENTS.md`.
