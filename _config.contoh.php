<?php
// _config.php — ISI DULU sebelum dipakai. Jangan pernah dibagikan setelah diisi.
// Semua nilai di bawah adalah contoh; ganti dengan data hosting kamu sendiri
// (cPanel > MySQL Databases untuk membuat DB + user, lalu tempel di sini).

// ---------------------------------------------------------------
// Uji lokal (opsional): kalau kamu menaruh _config.local.php di folder ini dan
// membukanya dari 127.0.0.1:8813, kredensial uji itu yang dipakai. Di hosting
// cabang ini tidak pernah aktif karena _config.local.php tidak diunggah.
// ---------------------------------------------------------------
if (
    in_array($_SERVER['HTTP_HOST'] ?? '', ['localhost:8813', '127.0.0.1:8813'], true)
    && is_file(__DIR__ . '/_config.local.php')
) {
    require __DIR__ . '/_config.local.php';
    return;
}

// --- Database (wajib diisi) ---
const DB_HOST = 'localhost';           // di cPanel hampir selalu 'localhost'
const DB_USER = 'namauser_dbuser';
const DB_PASS = 'GANTI_PASSWORD_DB';
const DB_NAME = 'namauser_dbnama';

// Prefix tabel app ini. Aman dibiarkan 'kd_' — hanya perlu diubah kalau
// satu DB dipakai dua instalasi Karyawan Digital sekaligus.
const TBL = 'kd_';

// --- Identitas produk (boleh diubah sesuai kelas kamu) ---
const APP_NAME    = 'Karyawan Digital';
const COURSE_NAME = 'Hermes Agent';

// Basis URL app, TANPA slash di akhir. Dipakai menyusun link reset password,
// jadi kalau salah, email reset menunjuk ke alamat yang keliru.
const BASE_URL = 'https://domainkamu.com/member';

// Link grup komunitas — jadi tombol paling menonjol di dashboard member.
const TELEGRAM_URL = 'https://t.me/+GANTI_LINK_GRUP';

// Nomor WhatsApp admin. Boleh 08xx atau 62xx, tanda hubung/spasi otomatis dirapikan.
// Kosongkan kalau belum punya — tombol WA tidak akan muncul, bukan error.
// Bisa juga diubah kapan saja dari Panel Admin › Setelan (nilai panel menang).
const WA_NOMOR = '';

// Email pengirim untuk reset password. Kalau dikosongkan (''), link reset TIDAK
// dikirim lewat email dan hanya dicatat di tabel kd_audit supaya admin bisa
// menyalinnya manual ke member.
const MAIL_FROM = 'no-reply@domainkamu.com';

// Zona waktu tampilan tanggal.
const TZ = 'Asia/Jakarta';
