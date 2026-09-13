<?php
// _cek-path.php — SEKALI PAKAI. Cari tahu sampai di mana akar folder publik
// hosting ini, supaya berkas paket bisa ditaruh DI LUAR folder yang dilayani
// web (satu-satunya perlindungan yang tidak bisa diabaikan server).
// WAJIB dicabut: bash hapus-cek-path.sh
declare(strict_types=1);

if (($_GET['k'] ?? '') !== 'cek-path-7f31bd') { http_response_code(404); die('Tidak ditemukan.'); }
header('Content-Type: text/plain; charset=utf-8');

echo "=== Peta folder hosting ===\n\n";
echo "DOCUMENT_ROOT : " . (string)($_SERVER['DOCUMENT_ROOT'] ?? '(kosong)') . "\n";
echo "SCRIPT_FILENAME: " . (string)($_SERVER['SCRIPT_FILENAME'] ?? '(kosong)') . "\n";
echo "__DIR__        : " . __DIR__ . "\n\n";

$calon = [
    __DIR__ . '/../kdsimpan'                    => 'sejajar /member (DI DALAM public_html)',
    __DIR__ . '/../../kdsimpan'                 => 'di atas public_html',
    __DIR__ . '/../../../kdsimpan'              => 'dua tingkat di atas public_html/domains',
    dirname(__DIR__, 3) . '/kdsimpan'           => 'akar akun',
];

echo "=== Cek folder yang bisa ditulisi ===\n";
foreach ($calon as $kandidat => $ket) {
    $induk = dirname($kandidat);
    $indukAda = is_dir($induk) ? 'ADA' : 'tidak ada';
    $bisaTulis = is_dir($induk) && is_writable($induk) ? 'BISA DITULIS' : 'TIDAK bisa ditulis';
    printf("  %-58s induk %-9s %s\n", $kandidat, $indukAda, $bisaTulis);
}

echo "\n=== Isi folder induk (maks 25) ===\n";
$induk = dirname(__DIR__);
foreach (array_slice(scandir($induk) ?: [], 0, 25) as $f) {
    if ($f === '.' || $f === '..') continue;
    echo '  ' . (is_dir($induk . '/' . $f) ? '[dir] ' : '      ') . $f . "\n";
}

echo "\n=== Tingkat di atasnya ===\n";
$atas = dirname(__DIR__, 2);
foreach (array_slice(scandir($atas) ?: [], 0, 25) as $f) {
    if ($f === '.' || $f === '..') continue;
    echo '  ' . (is_dir($atas . '/' . $f) ? '[dir] ' : '      ') . $f . "\n";
}

echo "\n=== Folder unduhan/ sekarang ===\n";
echo "  ada      : " . (is_dir(__DIR__ . '/unduhan') ? 'ya' : 'tidak') . "\n";
echo "  bisa tulis: " . (is_writable(__DIR__ . '/unduhan') ? 'ya' : 'tidak') . "\n";
if (is_dir(__DIR__ . '/unduhan')) {
    foreach (scandir(__DIR__ . '/unduhan') ?: [] as $f) {
        if ($f === '.' || $f === '..') continue;
        echo "    $f (" . filesize(__DIR__ . '/unduhan/' . $f) . " B)\n";
    }
}

echo "\nSELESAI. Cabut berkas ini: bash hapus-cek-path.sh\n";
