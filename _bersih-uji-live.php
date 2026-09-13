<?php
// _bersih-uji-live.php — SEKALI PAKAI. Periksa & bersihkan sisa data uji di
// database HOSTING.
//
// Kenapa perlu: uji unduhan dulu membuat akun demo di database hosting. Kalau
// dibiarkan, siapa pun yang tahu alamat login bisa masuk dengan password
// contoh itu — dan akun demo punya peran admin. Skrip ini melaporkan apa yang
// ada lalu menghapusnya.
//
// WAJIB DICABUT setelah dipakai (bash hapus-bersih-uji.sh).
declare(strict_types=1);
require __DIR__ . '/_boot.php';

if (($_GET['k'] ?? '') !== 'bersih-uji-7f31bd') {
    http_response_code(404);
    exit('Tidak ditemukan.');
}

header('Content-Type: text/plain; charset=utf-8');
$pdo = db();
$pola = (string)($_GET['pola'] ?? '');

echo "== 1. Akun di database hosting ==\n";
$rows = $pdo->query('SELECT id, nama, email, role, tier, created_at FROM ' . t('users') . ' ORDER BY id')->fetchAll();
foreach ($rows as $r) {
    printf("  #%d %-28s %-34s %-6s %-8s %s\n",
        $r['id'], mb_substr((string)$r['nama'], 0, 28), $r['email'],
        $r['role'], $r['tier'], $r['created_at']);
}
echo "  total: " . count($rows) . " akun\n";

echo "\n== 2. Lampiran ==\n";
try {
    $l = $pdo->query('SELECT id, bagian, judul, berkas, aktif FROM ' . t('lampiran') . ' ORDER BY bagian, urutan')->fetchAll();
    if (!$l) echo "  (kosong)\n";
    foreach ($l as $r) {
        printf("  #%d Bagian %d · %-34s %-28s aktif=%d\n",
            $r['id'], $r['bagian'], mb_substr((string)$r['judul'], 0, 34), $r['berkas'], $r['aktif']);
    }
} catch (Throwable $e) { echo "  tabel belum ada\n"; }

echo "\n== 3. Paket skill ==\n";
try {
    $s = $pdo->query('SELECT id, judul, berkas, akses, aktif FROM ' . t('skills') . ' ORDER BY urutan, id')->fetchAll();
    if (!$s) echo "  (kosong)\n";
    foreach ($s as $r) {
        printf("  #%d %-34s %-30s %-8s aktif=%d\n",
            $r['id'], mb_substr((string)$r['judul'], 0, 34), $r['berkas'], $r['akses'], $r['aktif']);
    }
} catch (Throwable $e) { echo "  tabel belum ada\n"; }

echo "\n== 4. Tingkat akses materi (harus sesuai susunan asli) ==\n";
foreach ($pdo->query('SELECT urutan, akses, LEFT(judul,40) j FROM ' . t('content') . ' ORDER BY urutan') as $r) {
    printf("  Bagian %d · %-8s %s\n", $r['urutan'], $r['akses'], $r['j']);
}

// Penghapusan hanya jalan kalau polanya dikirim, supaya skrip ini tidak
// menghapus apa pun secara tak sengaja kalau cuma dibuka.
if ($pola !== '') {
    echo "\n== 5. Hapus akun yang cocok pola '$pola' ==\n";
    $st = $pdo->prepare('DELETE FROM ' . t('users') . ' WHERE email LIKE ?');
    $st->execute(['%' . $pola . '%']);
    echo "  terhapus: " . $st->rowCount() . " akun\n";
    $sisa = (int)$pdo->query('SELECT COUNT(*) FROM ' . t('users'))->fetchColumn();
    echo "  sisa akun sekarang: $sisa\n";
}

echo "\n== Selesai. Cabut skrip ini sekarang juga.\n";
