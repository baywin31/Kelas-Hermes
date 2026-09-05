<?php
// _setmateri.php — SEKALI PAKAI. Ganti isi 4 Bagian di server dengan materi
// versi baru (gaya PAS + kartu warna) dari _seed.php.
//
// Kenapa perlu skrip:
// seed_materi() memakai INSERT IGNORE, jadi Bagian yang sudah ada di server
// sengaja TIDAK pernah ditimpa — supaya editan admin tidak hilang tiap ada
// pembaruan. Untuk mengganti isi lama secara sadar, harus lewat sini.
//
// Isi lama TIDAK dibuang: disalin dulu ke urutan 101–104 sebagai cadangan,
// jadi kalau ternyata ada tulisan yang ingin dipakai lagi, masih ada.
// Setelah dijalankan, berkas ini WAJIB dihapus (hapus-setmateri.sh) — dia bisa
// mengubah isi materi tanpa login.

declare(strict_types=1);
require __DIR__ . '/_boot.php';
require __DIR__ . '/_seed.php';
require __DIR__ . '/_markdown.php';

if (($_GET['k'] ?? '') !== 'setmateri2026') {
    http_response_code(404);
    exit;
}

header('Content-Type: text/plain; charset=utf-8');

$db = db();
$tabel = t('content');

// ---------- 1. cetak isi lama sebagai cadangan ----------
// Cadangan TIDAK ditulis sebagai Bagian tambahan di database: apa pun yang
// masuk tabel materi akan muncul di dashboard member sebagai Bagian baru.
// Jadi isi lama dicetak di sini, dan penjalannya menyimpan keluaran skrip ini
// sebagai berkas — cadangan tetap ada tanpa mengotori daftar materi.
$lama = $db->query("SELECT urutan, judul, ringkas, isi_md FROM $tabel WHERE urutan BETWEEN 1 AND 4 ORDER BY urutan")->fetchAll();

echo "===== CADANGAN ISI LAMA (simpan keluaran ini) =====\n\n";
foreach ($lama as $b) {
    echo "----- Bagian {$b['urutan']}: {$b['judul']} ({$b['ringkas']}) -----\n";
    echo $b['isi_md'] . "\n\n";
}
echo "===== AKHIR CADANGAN =====\n\n";

// ---------- 2. tulis isi baru ----------
$tulis = $db->prepare("INSERT INTO $tabel (urutan, judul, ringkas, isi_md, updated_at)
    VALUES (?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE judul=VALUES(judul), ringkas=VALUES(ringkas), isi_md=VALUES(isi_md), updated_at=NOW()");

foreach (seed_bagian() as $b) {
    $tulis->execute([$b['urutan'], $b['judul'], $b['ringkas'], $b['isi_md']]);
    echo "OK Bagian {$b['urutan']}: {$b['judul']}\n";
}
echo "\n";

// ---------- 3. laporkan hasil render dari server sendiri ----------
// Ini satu-satunya bukti nyata: asisten tidak punya password akun member di
// hosting, jadi server yang melaporkan apa yang benar-benar dirender.
foreach ([1, 2, 3, 4] as $no) {
    $st = $db->prepare("SELECT judul, isi_md FROM $tabel WHERE urutan = ?");
    $st->execute([$no]);
    $row = $st->fetch();
    if (!$row) { echo "Bagian $no: TIDAK ADA\n"; continue; }

    $html = md_to_html((string)$row['isi_md']);
    $hitung = function (string $k) use ($html): int {
        return substr_count($html, $k);
    };

    echo "Bagian $no — {$row['judul']}\n";
    echo "  kartu section : " . $hitung('kd-sec ') . "\n";
    echo "  sub-kartu     : " . $hitung('kd-sub ') . "\n";
    echo "  kartu callout : " . $hitung('kd-callout ') . "\n";
    echo "  checklist     : " . $hitung('kd-cek ') . "\n";
    echo "  tabel         : " . $hitung('kd-tabel') . "\n";
    echo "  blok kode     : " . $hitung('kd-kode ') . "\n";
    echo "  video         : " . ($hitung('youtube-nocookie') > 0 ? 'ADA' : '-') . "\n";
    echo "  pagar ::: sisa: " . preg_match_all('~:::~', $html) . "  (harus 0)\n";
    echo "  menit baca    : " . komp_menit_baca((string)$row['isi_md']) . "\n";
}

echo "\nselesai. HAPUS berkas ini sekarang: bash hapus-setmateri.sh\n";
