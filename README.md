# Karyawan Digital — Member Area Kelas Hermes Agent

Dua mode, satu produk. Sumber materi, format kode akses, dan urutan dashboard
identik supaya bisa pindah mode tanpa mengubah cara jualan.

| | Mode HTML | Mode PHP |
|---|---|---|
| Berkas | `../karyawan-digital-html/index.html` (satu file) | folder `../karyawan-digital-php/` |
| Cara jalan | klik dua kali di browser | upload ke hosting cPanel |
| Penyimpanan | localStorage browser | MySQL/MariaDB |
| Multi-perangkat | tidak | ya |
| Email reset password | link ditampilkan di layar | dikirim `mail()` PHP |
| Cocok untuk | demo ke calon pembeli, pemakaian 1 perangkat, cadangan offline | jualan sungguhan ke banyak pembeli |

## Yang sudah diverifikasi (hasil eksekusi nyata)

| Suite | Perintah | Hasil |
|---|---|---|
| HTML 1 (alur inti) | `node .test/smoke.js` | 72 lulus, 0 gagal |
| HTML 2 (admin/CMS lanjutan) | `node .test/smoke2.js` | 54 lulus, 0 gagal |
| PHP 1 (end-to-end HTTP) | `bash smoke.sh http://127.0.0.1:8813` | 44 lulus, 0 gagal |
| PHP 2 (race + sanitasi) | `bash smoke2.sh http://127.0.0.1:8813` | 14 lulus, 0 gagal |

Total 184 pemeriksaan.

## PRD → status implementasi

Nomor merujuk bagian PRD `prd-member-area-hermes.md`.

### 5.1 Autentikasi & redeem kode — selesai di dua mode
- Halaman redeem 2 tahap: cek kode → form buat akun
- Kode `HRMS-XXXX-XXXX-XXXX`, alfabet tanpa huruf/angka ambigu (`0O1I`), 12 karakter acak
- Satu kode = satu akun; kode terpakai/dicabut ditolak dengan alasan jelas
- Login, lupa password, reset password
- PHP: sesi cookie `httponly`+`SameSite=Lax`, CSRF token semua POST, password Argon2id (fallback bcrypt)
- HTML: password di-hash SHA-256 + salt per user (bukan plaintext); lihat batasan di bawah

### 5.2 Dashboard member — urutan persis PRD
1. Sapaan "Halo, [nama]" + status akun
2. Tombol **Join Komunitas Telegram** (paling atas, mencolok)
3. Daftar Bagian 1-4 + status belum/sedang/selesai
4. Tombol "Buka Materi" per Bagian + ringkasan progres

Urutan ini diuji lewat posisi string di HTML, bukan sekadar keberadaannya — di
dua mode. Progres bisa ditandai manual, dan membuka materi pertama kali otomatis
menandai "sedang dibaca". Tampilan mobile-first.

### 5.3 Fitur tambahan — semua usulan masuk v1
Badge "Materi Baru", Quick Links, catatan pribadi per Bagian (auto-save),
Tanya Admin (tiket + link chat), search materi, FAQ, riwayat kode & tanggal join
di profil, versi cetak/PDF per Bagian atau semua Bagian.

### 5.4 Admin panel — selesai
Generate kode satuan/bulk + batch + catatan order, tabel kode dengan status &
email penukar, filter/cari, cabut kode, unduh CSV, editor materi Markdown dengan
pratinjau (update tanpa deploy), editor FAQ, setelan (link Telegram, kontak
admin, quick links), kotak pertanyaan member, statistik, cadangan JSON.

### 7 Non-functional
- Kode acak 12 karakter dari alfabet 32 huruf ≈ 2^60 kemungkinan
- Rate limit: login, redeem, reset password, kirim tiket
- Password selalu di-hash
- PHP: race condition diuji — 4 pendaftaran paralel dengan kode sama, tepat 1 berhasil
- Materi disanitasi: `<script>`, `<img onerror>`, `javascript:` tidak jadi HTML hidup

### 9-10 Pertanyaan terbuka PRD — keputusan yang diambil
1. Pengiriman kode: **manual** (admin copy/CSV). Webhook Lynk.id/Mayar tetap v2.
2. Update materi: **lewat admin panel** (editor Markdown + pratinjau), bukan edit file server.
3. Progress tracking: **masuk v1**, manual + otomatis saat materi dibuka.
4. Link Telegram: kolom setelan, diisi kapan saja tanpa menyentuh kode.

Di luar cakupan sesuai PRD: payment gateway, forum built-in, sertifikat, video hosting.

## Batasan mode HTML yang perlu diketahui sebelum dijual

Ini kejujuran teknis, bukan bug:

- Semua data ada di browser pembuka file. Bukan server, jadi tidak ada
  "member login dari HP lain". Untuk itu pakai mode PHP.
- Hash password SHA-256+salt di sisi klien tidak sekuat Argon2id, dan siapa pun
  yang bisa membuka DevTools di perangkat itu bisa membaca localStorage.
  Aman untuk demo/pemakaian pribadi, tidak untuk data pembeli sungguhan.
- Menghapus data browser = menghapus member dan kode. Panel Admin → Data
  menyediakan unduh cadangan `.json`; pakai rutin.
- Reset password menampilkan tautan di layar karena tidak ada pengirim email.

## Cara pakai — mode HTML

Klik dua kali `karyawan-digital-html/index.html`. Halaman pemasangan muncul
sekali: isi nama, email, password admin, dan link grup Telegram. Atau tekan
**Isi data demo** untuk langsung terisi:

- admin `admin@demo.id`
- member `budi@demo.id`
- password keduanya `demo12345`
- 3 kode contoh belum terpakai, siap dicoba di halaman redeem

Membangun ulang `index.html` setelah mengedit `parts/`:

```bash
cd karyawan-digital-html && bash build.sh
NODE_PATH='C:\Users\user\apps\dompetku\.test\node_modules' node .test/smoke.js
NODE_PATH='C:\Users\user\apps\dompetku\.test\node_modules' node .test/smoke2.js
```

`index.html` adalah hasil gabungan `parts/` — edit `parts/`, jangan `index.html`.

## Cara pakai — mode PHP

Kebutuhan hosting: PHP 8+ dengan `pdo_mysql`, satu database MySQL/MariaDB.
Tanpa Composer, framework, atau CDN.

1. Salin `_config.contoh.php` → `_config.php`, isi kredensial DB, `BASE_URL`,
   `TELEGRAM_URL`, `MAIL_FROM`
2. Upload isi `karyawan-digital-php-upload.zip` ke folder tujuan di hosting
   (atau pakai `deploy.sh` untuk FTPS)
3. Buka `https://domain/member/setup.php` → isi admin pertama
4. **Hapus `setup.php`** setelah muncul "Instalasi selesai"
5. Login admin → Setelan → link Telegram → Kode akses → generate batch → unduh CSV

Jangan diunggah ke produksi: `_config.local.php`, `_uji_*.php`,
`docker-compose.test.yml`, `smoke*.sh`, `cek*.sh`, `diag*.sh`.

Tabel memakai prefix `kd_` sehingga bisa berbagi database dengan app lain.

## Uji lokal mode PHP tanpa Docker

Docker Desktop di mesin ini tidak mau naik (daemon tidak menjawab), jadi
verifikasi terakhir memakai PHP + MariaDB portable. Satu perintah:

```bash
cd C:/Users/user/apps/karyawan-digital-php && bash uji-portable.sh
```

Skrip itu menyalakan MariaDB (`:3399`) + PHP built-in server (`:8813`),
menghapus tabel `kd_` supaya tiap run bersih, menjalankan kedua suite, lalu
memulihkan materi seed. `SIMPAN_DB=1 bash uji-portable.sh` kalau isi DB uji
mau dipertahankan.

`_config.php` tidak perlu ditukar-tukar lagi: kalau diakses dari
`127.0.0.1:8813` **dan** `_config.local.php` ada, kredensial uji dipakai
otomatis. Di hosting cabang itu tidak pernah aktif karena `_config.local.php`
tidak diunggah.

## Paket siap kirim

```
C:/Users/user/apps/karyawan-digital-html.zip        index.html + README (2 berkas)
C:/Users/user/apps/karyawan-digital-php-upload.zip  30 berkas siap upload
```

Paket PHP sengaja TIDAK berisi `_config.php` asli, `.ftp`, `.cpanel`, dan semua
skrip uji — pembeli menyalin `_config.contoh.php` → `_config.php` lalu mengisi
kredensial DB miliknya sendiri. Bikin ulang paket dengan:

```bash
cd karyawan-digital-html && node .test/buat-zip.js
```
