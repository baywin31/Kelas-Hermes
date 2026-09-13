<?php
// _sync-skill.php — SEKALI PAKAI. Samakan kolom `berkas` di tabel skills dengan
// nama berkas .zip yang benar-benar ada di folder unduhan/.
//
// Kenapa perlu: nama berkas paket diberi akhiran acak (acak-nama-skill.py)
// supaya tidak bisa ditebak. Kalau kolom di database masih menyimpan nama lama,
// tombol unduh mengarah ke berkas yang tidak ada dan member cuma dapat halaman
// "berkas hilang".
//
// Pencocokan memakai nama dasar (tanpa akhiran -hex6) sehingga aman dijalankan
// berkali-kali dan tidak peduli akhiran acaknya berubah.
//
// WAJIB dicabut setelah dipakai: bash hapus-pasang-skill.sh
declare(strict_types=1);
require __DIR__ . '/_boot.php';
require __DIR__ . '/_skill.php';

if (($_GET['k'] ?? '') !== 'sync-skill-7f31bd') {
    http_response_code(404);
    die('Tidak ditemukan.');
}

header('Content-Type: text/plain; charset=utf-8');
echo "=== Samakan kolom berkas dengan isi folder unduhan/ ===\n\n";

/** Nama dasar: buang akhiran acak "-a1b2c3" dan ".zip". */
function dasar_nama(string $b): string
{
    $b = (string)pathinfo($b, PATHINFO_FILENAME);
    return (string)preg_replace('/-[0-9a-f]{6}$/', '', $b);
}

// Kumpulkan zip yang ada di server, dikelompokkan per nama dasar.
$diServer = [];
foreach (scandir(skill_dir()) ?: [] as $f) {
    if (strtolower((string)pathinfo($f, PATHINFO_EXTENSION)) !== 'zip') continue;
    $diServer[dasar_nama($f)] = ['nama' => $f, 'ukuran' => (int)filesize(skill_dir() . '/' . $f)];
}
foreach ($diServer as $dasar => $info) {
    echo "ada di folder: $dasar → {$info['nama']} (" . skill_ukuran_teks($info['ukuran']) . ")\n";
}
echo "\n";

$ubah = 0; $cocok = 0; $nyasar = [];

foreach (skill_semua(true) as $s) {
    $lama = (string)$s['berkas'];
    $dasar = dasar_nama($lama);

    if (!isset($diServer[$dasar])) { $nyasar[] = $lama; echo "TIDAK ADA: $lama\n"; continue; }

    $namaBaru = $diServer[$dasar]['nama'];
    $ukuran   = $diServer[$dasar]['ukuran'];

    if ($namaBaru === $lama && (int)$s['ukuran'] === $ukuran) {
        echo "cocok  #{$s['id']}  $lama\n"; $cocok++; continue;
    }

    db()->prepare('UPDATE ' . t('skills') . ' SET berkas = ?, ukuran = ?, updated_at = NOW() WHERE id = ?')
        ->execute([$namaBaru, $ukuran, (int)$s['id']]);
    echo "ubah   #{$s['id']}  $lama → $namaBaru\n"; $ubah++;
}

echo "\ndiubah=$ubah sudah-cocok=$cocok";
if ($nyasar) echo " berkas-hilang=" . count($nyasar);
echo "\n\n=== Hasil akhir ===\n";
foreach (skill_semua(true) as $s) {
    $ada = is_file(skill_dir() . '/' . basename((string)$s['berkas'])) ? 'ADA' : 'HILANG';
    printf("  #%d  %-34s %-8s %8s  %s\n", (int)$s['id'], mb_substr((string)$s['judul'], 0, 34),
        ($s['akses'] ?? '') === 'premium' ? 'PREMIUM' : 'reguler',
        skill_ukuran_teks((int)$s['ukuran']), $ada);
}
echo "\nSELESAI. Cabut berkas ini: bash hapus-pasang-skill.sh\n";
