<?php
// _pasang-skill.php — SEKALI PAKAI. Daftarkan paket .zip ke tabel skills
// di HOSTING (database live), karena pendaftaran awal dilakukan dari mesin
// sendiri dan database hosting terpisah.
//
// Dilindungi kunci acak di URL dan menolak kalau bukan admin yang login.
// WAJIB dicabut dari hosting setelah dipakai: bash hapus-pasang-skill.sh
declare(strict_types=1);
require __DIR__ . '/_boot.php';
require __DIR__ . '/_skill.php';

$KUNCI = 'pasang-skill-7f31bd';
if (($_GET['k'] ?? '') !== $KUNCI) {
    http_response_code(404);
    die('Tidak ditemukan.');
}

header('Content-Type: text/plain; charset=utf-8');
echo "=== Daftarkan paket skill ke database hosting ===\n\n";

$RENCANA = [
    'hermes-agent' => [
        'Hermes Agent — panduan inti',
        'Badan utama skill Hermes Agent: cara kerja, perintah dasar, dan alur kerjanya.',
        'reguler', 1,
    ],
    'installing-hermes-skills' => [
        'Pasang skill dari GitHub',
        'Alur memasang skill baru ke Hermes langsung dari repositori GitHub.',
        'reguler', 2,
    ],
    'hermes-profile-model-config' => [
        'Betulkan profil & model',
        'Menyambungkan profil dan model language model ke Hermes tanpa bingung.',
        'reguler', 3,
    ],
    'commit-clear-session' => [
        'Commit & clear session',
        'Rutinitas mengamankan pekerjaan ke Git lalu membersihkan sesi.',
        'reguler', 4,
    ],
];

/** Nama dasar: buang akhiran acak "-a1b2c3" dan ".zip". */
function dasar_nama(string $b): string
{
    $b = (string)pathinfo($b, PATHINFO_FILENAME);
    return (string)preg_replace('/-[0-9a-f]{6}$/', '', $b);
}

$baru = 0; $ubah = 0; $hilang = [];

foreach ($RENCANA as $dasar => [$judul, $ket, $akses, $urut]) {
    // Cari berkasnya di folder unduhan/ berdasarkan nama dasar — nama di disk
    // punya akhiran acak (anti-tebak), jadi tidak bisa ditulis tetap di sini.
    $berkas = ''; $ukuran = 0;
    foreach (scandir(skill_dir()) ?: [] as $f) {
        if (strtolower((string)pathinfo($f, PATHINFO_EXTENSION)) !== 'zip') continue;
        if (dasar_nama($f) === $dasar) { $berkas = $f; $ukuran = (int)filesize(skill_dir() . '/' . $f); break; }
    }
    if ($berkas === '') { $hilang[] = $dasar; echo "HILANG  $dasar (belum naik ke server)\n"; continue; }

    $st = db()->prepare('SELECT id FROM ' . t('skills') . ' WHERE berkas = ? OR berkas LIKE ?');
    $st->execute([$berkas, $dasar . '%']);
    $idAda = (int)($st->fetchColumn() ?: 0);

    if ($idAda > 0) {
        db()->prepare('UPDATE ' . t('skills') . '
            SET judul = ?, keterangan = ?, berkas = ?, ukuran = ?, akses = ?, urutan = ?, aktif = 1, updated_at = NOW()
            WHERE id = ?')
            ->execute([$judul, $ket, $berkas, $ukuran, $akses, $urut, $idAda]);
        echo "update  $berkas → $judul\n"; $ubah++;
    } else {
        db()->prepare('INSERT INTO ' . t('skills') . '
            (judul, keterangan, berkas, ukuran, akses, urutan, aktif, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())')
            ->execute([$judul, $ket, $berkas, $ukuran, $akses, $urut]);
        echo "tambah  $berkas → $judul\n"; $baru++;
    }
}

echo "\nbaru=$baru diperbarui=$ubah";
if ($hilang) echo " hilang=" . count($hilang);
echo "\n\n=== Isi tabel sekarang ===\n";
foreach (skill_semua(true) as $s) {
    printf("  #%d  %-38s %-10s %8s  %s\n",
        (int)$s['id'], mb_substr((string)$s['judul'], 0, 38),
        ($s['akses'] ?? '') === 'premium' ? 'PREMIUM' : 'reguler',
        skill_ukuran_teks((int)$s['ukuran']),
        (int)$s['aktif'] === 1 ? 'aktif' : 'nonaktif');
}
echo "\nSELESAI. Cabut berkas ini sekarang: bash hapus-pasang-skill.sh\n";
