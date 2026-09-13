# Ringkasan perubahan: gaya baru di dashboard + widget LMS

Dikerjakan 2026-09-13. Semua sudah LIVE di `https://juraganprompt.biz.id/member/`.

## Aturan yang dipegang
1. **Isi materi tidak boleh berubah satu huruf pun.** Isi materi ada di
   DATABASE, bukan di berkas, jadi menulis ulang tampilan tidak menyentuhnya.
   Dibuktikan `uji-isi.sh` (58 lulus) + cadangan di `cadangan/`.
2. **Tombol & fitur tidak boleh ada yang hilang.** Dibuktikan
   `uji-dashboard-lazy.sh` yang menghitung ulang tiap tombol/form/tautan.

## Cara kerjanya (dan cara mematikannya)

`gaya-lazy.css` **tidak menulis satu pun selektor lama**. Berkas ini hanya
**menimpa NILAI variabel** milik `style.css` (`:root{...}`). Jadi seluruh
tampilan lama otomatis ikut berubah tanpa satu baris pun diubah.

**Mematikan = hapus satu baris `<link>` di `_theme.php`.** Selesai. Nol
kerusakan, karena tidak ada selektor asli yang ditimpa.

## Yang ditambahkan ke dashboard.php

Empat widget, semua diisi data yang SUDAH ADA (tidak ada query baru):

| Widget | Sumber data (sudah ada) |
|---|---|
| Kartu angka (selesai / sedang jalan / menunggu) | `progres_ringkas()` di `_progress.php` |
| Kartu "Lanjutkan belajar" | `$rawat` + `progres_ringkas()` |
| Grafik batang 4 Bagian | hasil `progres_ringkas()` |
| Cincin progres (2 lapis) | hasil `progres_ringkas()` |

Tombol lama (Telegram, Bagian 1–4, Skill, Lampiran, Logout, admin) semuanya
masih ada di posisi yang sama.

## Kenapa tema ikut setelan sistem (bukan tombol penukar tema)

Tombol penukar tema butuh JavaScript + penyimpanan pilihan. Setelan OS sudah
punya mekanismenya sendiri: `@media (prefers-color-scheme: dark)`.
**8 baris CSS, 0 JavaScript, 0 penyimpanan** — dan member tidak perlu klik apa pun.
Semua orang sudah mengatur tema di HP/laptopnya masing-masing.

## Cacat yang ditemukan alat ukur dan sudah dibetulkan

1. **Warna abu sekunder terlalu pudar** — `#7A828C` hanya 3.44 kontras di
   tema terang (batas 4.5). Diganti `#6A727C`.
2. **Garis pemisah tema gelap terlalu tipis** — 1.45 kontras. Dinaikkan `#424A50`.
3. **Warna langit-langit langsung di berkas PHP** — `#A4D8FF` di
   `dashboard.php`, `materi.php`, `_lihat_vip.php` tidak terbaca di tema
   terang. Dipindahkan ke kelas `.lz-*` supaya ikut tema.
4. **Lencana "VIP" 10px** — lebih kecil dari batas 11px. Dinaikkan.
5. **Kotak "simulasi tampilan" di halaman admin** masih memakai latar gelap
   langsung. Dipindahkan ke `.lz-kotak-vip`.

## Berkas uji baru

| Berkas | Isi |
|---|---|
| `uji-dashboard-lazy.sh` | 35 lulus — tiap tombol/form/tautan tua masih ada |
| `kontras-lazy.js` | 48 lulus — kontras dua tema |
| `cek-live-gaya.sh` | 21 lulus — dibuktikan dari internet, bukan berkas lokal |
| `potret-dashboard.js` | potret dashboard ASLI di 4 kombinasi |
| `tampal-warna-theme.sh` | daftar warna langsung di berkas PHP |

## Cara mengembalikan (kalau tidak suka)

```bash
git revert <commit-ini>
bash deploy2.sh _theme.php dashboard.php materi.php style.css gaya-lazy.css _lihat_vip.php
```

Atau cepat: hapus baris `<link ... gaya-lazy.css?v=1>` di `_theme.php` lalu
naikkan `_theme.php` saja. Dashboard kembali seperti semula.
