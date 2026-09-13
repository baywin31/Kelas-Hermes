<?php
// _pindah-skill.php — SEKALI PAKAI. Pindahkan berkas paket dari folder
// `unduhan/` (di dalam public_html) ke luar public_html.
//
// Kenapa harus dipindah: hosting ini memakai LiteSpeed dan terbukti mengabaikan
// perintah penolakan .htaccess pada tingkat BERKAS — folder bisa dijawab 403
// berkat "Options -Indexes", tapi berkas .zip di dalamnya tetap terkirim 200 ke
// siapa pun tanpa login. Berkas yang berada di luar public_html tidak punya
// alamat web sama sekali, jadi server tidak bisa "lupa" melindunginya.
//
// Aman dijalankan berulang: berkas yang sudah ada di tujuan hanya ditimpa.
// WAJIB dicabut setelah dipakai: bash hapus-cek-path.sh
declare(strict_types=1);
require __DIR__ . '/_boot.php';
require __DIR__ . '/_skill.php';

if (($_GET['k'] ?? '') !== 'pindah-skill-7f31bd') { http_response_code(404); die('Tidak ditemukan.'); }
header('Content-Type: text/plain; charset=utf-8');

$tujuan = skill_dir();
echo "=== Pindahkan paket keluar dari folder publik ===\n\n";
echo "Folder penyimpanan sekarang : $tujuan\n";
echo "Di luar public_html?         : " . (skill_di_luar_publik() ? 'YA (aman)' : 'TIDAK — masih di dalam app') . "\n\n";

$lama = __DIR__ . '/unduhan';
$pindah = 0; $lewat = 0; $gagal = 0;

if (!is_dir($lama)) {
    echo "Folder unduhan/ tidak ada — tidak ada yang perlu dipindah.\n";
} elseif (realpath($lama) === realpath($tujuan)) {
    echo "Folder asal dan tujuan sama — tidak ada yang perlu dipindah.\n";
} else {
    foreach (scandir($lama) ?: [] as $f) {
        if (strtolower((string)pathinfo($f, PATHINFO_EXTENSION)) !== 'zip') continue;
        $asal  = $lama . '/' . $f;
        $tujuF = $tujuan . '/' . $f;

        if (@rename($asal, $tujuF)) {
            @chmod($tujuF, 0644);
            echo "  pindah  $f (" . filesize($tujuF) . " B)\n"; $pindah++;
        } elseif (@copy($asal, $tujuF)) {
            // Lintas berkas sistem: rename gagal, tapi salin berhasil.
            // Berkas lama BARU dihapus setelah salinan terbukti seukuran.
            if (filesize($tujuF) === filesize($asal)) {
                @unlink($asal);
                echo "  salin   $f (" . filesize($tujuF) . " B)\n"; $pindah++;
            } else {
                echo "  GAGAL   $f (ukuran salinan tidak cocok)\n"; $gagal++;
            }
        } else {
            echo "  GAGAL   $f (tidak bisa dipindah)\n"; $gagal++;
        }
    }
}

echo "\ndipindah=$pindah dilewati=$lewat gagal=$gagal\n\n";

echo "=== Isi folder penyimpanan sekarang ===\n";
foreach (skill_berkas_tersedia() as $f => $sz) {
    echo '  ' . str_pad($f, 48) . skill_ukuran_teks($sz) . "\n";
}

echo "\n=== Samakan kolom berkas di database ===\n";
$dasar = fn(string $b): string => (string)preg_replace('/-[0-9a-f]{6}$/', '', (string)pathinfo($b, PATHINFO_FILENAME));
$ada    = skill_berkas_tersedia();
$ubah   = 0;

foreach (skill_semua(true) as $s) {
    $d = $dasar((string)$s['berkas']);
    $cocok = '';
    foreach ($ada as $f => $sz) { if ($dasar($f) === $d) { $cocok = $f; break; } }
    if ($cocok === '') { echo "  HILANG  #{$s['id']} {$s['berkas']}\n"; continue; }
    if ($cocok === $s['berkas'] && (int)$s['ukuran'] === $ada[$cocok]) { echo "  cocok   #{$s['id']} $cocok\n"; continue; }
    db()->prepare('UPDATE ' . t('skills') . ' SET berkas = ?, ukuran = ?, updated_at = NOW() WHERE id = ?')
        ->execute([$cocok, $ada[$cocok], (int)$s['id']]);
    echo "  ubah    #{$s['id']} {$s['berkas']} → $cocok\n"; $ubah++;
}
echo "\ndiubah=$ubah\n";

echo "\n=== Hasil akhir ===\n";
foreach (skill_semua(true) as $s) {
    $p = skill_path($s);
    printf("  #%d  %-34s %-8s %8s  %s\n", (int)$s['id'], mb_substr((string)$s['judul'], 0, 34),
        ($s['akses'] ?? '') === 'premium' ? 'PREMIUM' : 'reguler',
        skill_ukuran_teks((int)$s['ukuran']), is_file($p) ? 'ADA' : 'HILANG');
}

echo "\nSELESAI. Cabut berkas ini: bash hapus-cek-path.sh\n";
