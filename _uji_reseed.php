<?php
// _uji_reseed.php — HANYA UNTUK UJI LOKAL. Jangan diunggah ke hosting.
// Memulihkan materi 4 Bagian ke isi seed (setelah dirusak oleh smoke test).
declare(strict_types=1);
require __DIR__ . '/_boot.php';
require __DIR__ . '/_seed.php';

if (!in_array($_SERVER['HTTP_HOST'] ?? '', ['localhost:8813', '127.0.0.1:8813'], true)) {
    http_response_code(404);
    exit;
}

header('Content-Type: text/plain; charset=utf-8');

$st = db()->prepare('INSERT INTO ' . t('content') . '
    (urutan, judul, ringkas, isi_md, updated_at)
    VALUES (?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE
      judul = VALUES(judul), ringkas = VALUES(ringkas),
      isi_md = VALUES(isi_md), updated_at = NOW()');

foreach (seed_bagian() as $b) {
    $st->execute([$b['urutan'], $b['judul'], $b['ringkas'], $b['isi_md']]);
    echo "Bagian {$b['urutan']}: {$b['judul']}\n";
}
echo "selesai\n";
