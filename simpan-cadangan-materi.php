<?php
// simpan-cadangan-materi.php — Ambil seluruh isi tabel content saat ini
// dan simpan ke file JSON & SQL cadangan dengan timestamp.
declare(strict_types=1);

$_SERVER['HTTP_HOST'] = '127.0.0.1:8813';
require __DIR__ . '/_boot.php';

$items = db()->query('SELECT * FROM ' . t('content') . ' ORDER BY urutan')->fetchAll();

$ts = date('Ymd_His');
$fileJson = __DIR__ . "/cadangan/materi_cadangan_{$ts}.json";
$fileSql  = __DIR__ . "/cadangan/materi_cadangan_{$ts}.sql";

if (!is_dir(__DIR__ . '/cadangan')) {
    mkdir(__DIR__ . '/cadangan', 0755, true);
}

file_put_contents($fileJson, json_encode($items, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

$sqlLines = ["-- Cadangan materi " . date('Y-m-d H:i:s')];
foreach ($items as $row) {
    $u = (int)$row['urutan'];
    $j = db()->quote((string)$row['judul']);
    $r = db()->quote((string)$row['ringkas']);
    $i = db()->quote((string)$row['isi_md']);
    $up = db()->quote((string)$row['updated_at']);
    $sqlLines[] = "INSERT INTO " . t('content') . " (urutan, judul, ringkas, isi_md, updated_at) VALUES ({$u}, {$j}, {$r}, {$i}, {$up}) ON DUPLICATE KEY UPDATE judul={$j}, ringkas={$r}, isi_md={$i}, updated_at={$up};";
}

file_put_contents($fileSql, implode("\n", $sqlLines));

echo "CADANGAN BERHASIL:\n";
echo "  - JSON: {$fileJson} (" . count($items) . " bagian)\n";
echo "  - SQL : {$fileSql}\n";
