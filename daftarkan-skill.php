<?php
// daftarkan-skill.php — daftarkan berkas .zip di folder unduhan/ ke tabel skills.
//
// Kenapa lewat CLI: panel admin butuh login, sedangkan pendaftaran awal ini
// dikerjakan dari mesin sendiri. Skrip ini TIDAK menyentuh tabel `content`
// (materi) sama sekali — hanya tabel `skills` yang baru.
//
// Jalankan: php daftarkan-skill.php
// Hapus skrip ini dari hosting setelah dipakai (bash hapus-daftarkan.sh).
declare(strict_types=1);

// _boot.php butuh HTTP_HOST untuk membaca konfigurasi; saat dijalankan dari CLI
// variabel itu kosong, jadi diisi manual agar jalur local/produksi bisa dipilih.
if (PHP_SAPI === 'cli' && empty($_SERVER['HTTP_HOST'])) {
    $_SERVER['HTTP_HOST'] = getenv('KD_HOST') ?: '127.0.0.1:8813';
}

require __DIR__ . '/_boot.php';
require __DIR__ . '/_skill.php';

/** Daftar paket awal: nama berkas => [judul, keterangan, akses]. */
$RENCANA = [
    'hermes-agent.zip' => [
        'Hermes Agent — panduan inti',
        'Badan utama skill Hermes Agent: cara kerja, perintah dasar, dan alur kerjanya.',
        'reguler', 1,
    ],
    'installing-hermes-skills.zip' => [
        'Pasang skill dari GitHub',
        'Alur memasang skill baru ke Hermes langsung dari repositori GitHub.',
        'reguler', 2,
    ],
    'hermes-profile-model-config.zip' => [
        'Betulkan profil & model',
        'Menyambungkan profil dan model language model ke Hermes tanpa bingung.',
        'reguler', 3,
    ],
    'commit-clear-session.zip' => [
        'Commit & clear session',
        'Rutinitas mengamankan pekerjaan ke Git lalu membersihkan sesi.',
        'reguler', 4,
    ],
];

$adaSudah = 0;
$masuk    = 0;
$hilang   = [];

foreach ($RENCANA as $berkas => [$judul, $ket, $akses, $urut]) {
    $path = skill_dir() . '/' . $berkas;
    if (!is_file($path)) { $hilang[] = $berkas; continue; }
    $ukuran = (int)filesize($path);

    $st = db()->prepare('SELECT id FROM ' . t('skills') . ' WHERE berkas = ?');
    $st->execute([$berkas]);
    $idAda = (int)($st->fetchColumn() ?: 0);

    if ($idAda > 0) {
        db()->prepare('UPDATE ' . t('skills') . '
            SET judul = ?, keterangan = ?, ukuran = ?, akses = ?, urutan = ?, aktif = 1, updated_at = NOW()
            WHERE id = ?')
            ->execute([$judul, $ket, $ukuran, $akses, $urut, $idAda]);
        echo "  update  $berkas → $judul\n";
        $adaSudah++;
    } else {
        db()->prepare('INSERT INTO ' . t('skills') . '
            (judul, keterangan, berkas, ukuran, akses, urutan, aktif, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())')
            ->execute([$judul, $ket, $berkas, $ukuran, $akses, $urut]);
        echo "  tambah  $berkas → $judul\n";
        $masuk++;
    }
}

echo "\nbaru=$masuk diperbarui=$adaSudah";
if ($hilang) echo " berkas-hilang=" . count($hilang) . ' (' . implode(', ', $hilang) . ')';
echo "\n";
