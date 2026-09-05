<?php
// _uji_bersihvid.php — HANYA LOKAL. Buang baris @video dari Bagian tertentu,
// supaya database uji kembali sama dengan seed.
declare(strict_types=1);
require __DIR__ . '/_boot.php';
header('Content-Type: text/plain; charset=utf-8');
$b = (int)($_GET['b'] ?? 2);
$db = db();
$st = $db->prepare('SELECT id, isi_md FROM ' . t('content') . ' WHERE urutan = ?');
$st->execute([$b]);
$row = $st->fetch();
if (!$row) { echo "Bagian $b tidak ada\n"; exit; }
$bersih = preg_replace('/\n*^@video[ \t]+\S+.*$/im', '', (string)$row['isi_md']);
$up = $db->prepare('UPDATE ' . t('content') . ' SET isi_md = ? WHERE id = ?');
$up->execute([$bersih, $row['id']]);
echo "Bagian $b dibersihkan; sisa @video: " . (str_contains($bersih, '@video') ? 'MASIH ADA' : 'tidak ada') . "\n";
