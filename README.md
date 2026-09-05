# Karyawan Digital — member area (versi PHP)

Member area kelas online **Hermes Agent**. Pembeli dapat kode akses dari
Lynk.id/Mayar, menukarnya sendiri di web, lalu langsung punya akun. Tidak ada
provisioning manual.

Stack: **PHP 8 + MySQL** murni. Tanpa Composer, tanpa framework, tanpa CDN —
supaya bisa jalan di shared hosting cPanel biasa (tinggal upload).

## Isi

| Berkas | Fungsi |
|---|---|
| `_config.php` | kredensial DB, nama app, link Telegram, BASE_URL (isi dari `_config.contoh.php`) |
| `_boot.php` | sesi, PDO, CSRF, rate limit (di DB), audit, helper |
| `_kode.php` | format & validasi kode `HRMS-XXXX-XXXX-XXXX` |
| `_markdown.php` | konverter Markdown tulis tangan + sanitasi HTML |
| `_theme.php` | header/footer |
| `_progress.php` | progres, catatan, kunjungan, quick links |
| `_seed.php` | materi awal 4 Bagian + FAQ |
| `setup.php` | bikin tabel + seed + admin pertama (**hapus setelah dipakai**) |
| `index.php` `redeem.php` `login.php` `logout.php` `lupa.php` `reset.php` | alur masuk |
| `dashboard.php` `materi.php` `catatan_simpan.php` `cetak.php` `cari.php` `faq.php` `tanya.php` `profil.php` | area member |
| `admin*.php` | panel admin: statistik, kode, materi, setelan |
| `style.css` `app.js` | tampilan & interaksi (auto-save catatan, progress bar) |
| `smoke.sh` `smoke2.sh` | uji end-to-end lewat HTTP nyata |
| `deploy.sh` | unggah ke hosting via FTPS |
| `docker-compose.test.yml` `_config.local.php` `_uji_bersih.php` | khusus uji lokal, **jangan diunggah** |

Tabel memakai prefix `kd_` sehingga bisa berbagi database dengan app lain
(`/akademi` memakai prefix berbeda).

## Uji lokal

Satu perintah, tanpa Docker (PHP + MariaDB portable — ini jalur yang dipakai
untuk verifikasi terakhir karena Docker Desktop di mesin ini tidak mau naik):

```bash
bash uji-portable.sh
```

Skrip itu menyalakan MariaDB portable (`:3399`), menghapus tabel `kd_` supaya
tiap run mulai bersih, menyalakan PHP built-in server (`:8813`), menjalankan
`smoke.sh` + `smoke2.sh`, lalu memulihkan materi seed. Pakai `SIMPAN_DB=1
bash uji-portable.sh` kalau isi DB uji mau dipertahankan.

`_config.php` tidak perlu ditukar lagi: kalau diakses dari `127.0.0.1:8813` dan
`_config.local.php` ada, kredensial uji dipakai otomatis; di hosting cabang itu
tidak pernah aktif karena `_config.local.php` tidak diunggah.

Jalur Docker masih tersedia kalau daemon-nya hidup:

```bash
docker compose -f docker-compose.test.yml up -d
bash smoke.sh  http://localhost:8813
bash smoke2.sh http://localhost:8813
```

Hasil terakhir dari eksekusi nyata: **44 cek lulus** (suite 1) + **14 cek lulus**
(suite 2), 0 gagal.

Yang diuji, antara lain:
- instalasi tabel + seed + admin pertama
- redeem kode: format salah 400, kode valid 200, kode terpakai 400
- daftar → auto-login → dashboard
- **urutan dashboard sesuai PRD** (sapaan › tombol Telegram › daftar Bagian › progres), diverifikasi lewat posisi string di HTML
- tandai selesai, progres persist setelah logout-login
- catatan pribadi auto-save + persist
- **race condition**: 4 pendaftaran paralel dengan kode sama → tepat 1 berhasil
- member ditolak (403) di semua halaman admin
- CSRF wajib: token salah → 403
- edit materi dari panel admin langsung terlihat member (tanpa deploy)
- sanitasi: `<script>`, `<img onerror>`, `javascript:` tidak jadi HTML hidup

## Deploy

Paket siap unggah dibuat otomatis di `C:/Users/user/apps/karyawan-digital-php-upload.zip`
(30 berkas, tanpa `_config.php` asli, tanpa `.ftp`/`.cpanel`, tanpa skrip uji).
Unggah isinya ke folder tujuan, lalu salin `_config.contoh.php` → `_config.php`
dan isi kredensial DB milikmu.

Kalau punya akses FTP dan ingin otomatis:

```bash
printf 'USER:PASSWORD' > .ftp        # akun FTP, file ini di-gitignore
TUJUAN=/public_html/member bash deploy.sh
```

Lalu di browser:
1. buka `https://DOMAIN/member/setup.php`, isi nama/email/password admin
2. setelah muncul "Instalasi selesai", **hapus `setup.php`** dari server
3. login admin → Setelan → isi link grup Telegram
4. Kode akses → generate batch → unduh CSV untuk dikirim ke pembeli

## Catatan produksi

- `_config.php` berisi password DB. Pastikan tidak bisa diakses langsung
  (file `_*.php` hanya di-`require`, tidak menghasilkan output sendiri).
- Reset password mengirim email lewat `mail()` PHP. Kalau `MAIL_FROM` kosong,
  link reset dicatat di tabel `kd_audit` supaya admin bisa mengirim manual.
- Rate limit disimpan di tabel `kd_ratelimit`, jadi tetap berlaku walau
  hosting menjalankan beberapa proses PHP.
- Password di-hash dengan Argon2id kalau tersedia, jika tidak jatuh ke bcrypt.
