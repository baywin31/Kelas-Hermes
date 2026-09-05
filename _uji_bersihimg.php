<?php
// _uji_bersihimg.php — HANYA UJI LOKAL. Buang baris gambar dari satu Bagian
// supaya database uji kembali seperti seed.
declare(strict_types=1);
require __DIR__ . '/_boot.php';
header('Content-Type: text/plain; charset=utf-8');
$b = (int)($_GET['b'] ?? 3);
$db = db();
$st = $db->prepare('SELECT id, isi_md FROM ' . t('content') . ' WHERE urutan = ?');
$st->execute([$b]);
$row = $st->fetch();
if (!$row) { echo "Bagian $b tidak ada\n"; exit; }
$bersih = preg_replace('/\n*^!\[[^\]]*\]\([^)\s]+\)[ \t]*$/m', '', (string)$row['isi_md']) ?? '';
$db->prepare('UPDATE ' . t('content') . ' SET isi_md = ? WHERE id = ?')->execute([$bersih, $row['id']]);
echo "Bagian $b dibersihkan; sisa sintaks gambar: " . (preg_match('/!\[[^\]]*\]\(/', $bersih) ? 'MASIH ADA' : 'tidak ada') . "\n";
