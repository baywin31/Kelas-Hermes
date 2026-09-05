<?php
// _uji_bersihcadangan.php — HANYA LOKAL. Buang Bagian cadangan 101–104 yang
// dibuat versi awal _setmateri.php sebelum diperbaiki. Bagian di tabel materi
// akan tampil sebagai Bagian baru di dashboard member, jadi tidak boleh ada.
declare(strict_types=1);
require __DIR__ . '/_boot.php';
header('Content-Type: text/plain; charset=utf-8');

$n = db()->exec('DELETE FROM ' . t('content') . ' WHERE urutan BETWEEN 101 AND 199');
echo "Bagian cadangan dihapus: " . (int)$n . "\n";

$sisa = db()->query('SELECT urutan, judul FROM ' . t('content') . ' ORDER BY urutan')->fetchAll();
foreach ($sisa as $r) {
    echo "  sisa: Bagian {$r['urutan']} — {$r['judul']}\n";
}
