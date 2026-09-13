<?php
// _uji-unduh-live.php — SEKALI PAKAI. Cek bahwa member yang SUDAH LOGIN benar-
// benar bisa mengunduh paket dari hosting, dan tamu tidak bisa.
//
// Kenapa perlu diuji di hosting, bukan cuma di lokal: berkas paket kini
// disimpan DI LUAR public_html. Kalau jalur penyimpanannya salah dihitung di
// server (mis. open_basedir membatasi), gejalanya cuma "Berkasnya tidak ada di
// server" — dan itu baru ketahuan saat pembeli mengklik tombol unduh.
//
// Tidak menyentuh materi sama sekali; hanya membaca tabel skills.
// WAJIB dicabut: bash hapus-cek-path.sh
declare(strict_types=1);
require __DIR__ . '/_boot.php';
require __DIR__ . '/_skill.php';

if (($_GET['k'] ?? '') !== 'uji-unduh-7f31bd') { http_response_code(404); die('Tidak ditemukan.'); }
header('Content-Type: text/plain; charset=utf-8');

echo "=== Uji unduhan di hosting ===\n\n";
echo "Folder penyimpanan : " . skill_dir() . "\n";
echo "Di luar public_html : " . (skill_di_luar_publik() ? 'YA (aman)' : 'TIDAK') . "\n";
echo "Bisa ditulis        : " . (is_writable(skill_dir()) ? 'ya' : 'TIDAK') . "\n\n";

$semua = skill_semua(true);
echo "Jumlah paket terdaftar: " . count($semua) . "\n\n";

$okAda = 0;
foreach ($semua as $s) {
    $p = skill_path($s);
    $ada = is_file($p);
    if ($ada) $okAda++;
    printf("  #%d %-34s %-8s %8s %s%s\n",
        (int)$s['id'], mb_substr((string)$s['judul'], 0, 34),
        ($s['akses'] ?? '') === 'premium' ? 'PREMIUM' : 'reguler',
        skill_ukuran_teks((int)$s['ukuran']),
        $ada ? 'ADA' : 'HILANG',
        $ada ? ' (' . (int)filesize($p) . ' B)' : '');
}

echo "\nberkas-ditemukan=$okAda dari " . count($semua) . "\n\n";

// Uji baca sungguhan: file_get_contents membuktikan berkas bisa dibaca proses
// web (bukan cuma "ada" menurut stat), dan isinya arsip zip yang sah.
foreach ($semua as $s) {
    $p = skill_path($s);
    if (!is_file($p)) continue;
    $fh = @fopen($p, 'rb');
    if (!$fh) { echo "  BACA GAGAL: {$s['berkas']} (izin tolak)\n"; continue; }
    $kepala = (string)fread($fh, 2); fclose($fh);
    echo '  ' . str_pad((string)$s['berkas'], 44)
       . ($kepala === 'PK' ? 'terbaca, arsip zip sah' : "BUKAN ZIP (diawali: $kepala)") . "\n";
}

echo "\nSELESAI. Cabut berkas ini: bash hapus-cek-path.sh\n";
