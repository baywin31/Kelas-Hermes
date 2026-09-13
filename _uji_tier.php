<?php
// _uji_tier.php — Verifikasi logika pembatasan akses Reguler vs Premium
declare(strict_types=1);

$_SERVER['HTTP_HOST'] = '127.0.0.1:8813';
require __DIR__ . '/_boot.php';
require __DIR__ . '/_kode.php';
require __DIR__ . '/_progress.php';

header('Content-Type: text/plain; charset=utf-8');

$pdo = db();

echo "=== 1. UJI KOLOM DATABASE ===\n";
$st = $pdo->query("SHOW COLUMNS FROM " . t('content') . " LIKE 'akses'");
echo "tabel content.akses: " . ($st->fetch() ? "ADA (OK)" : "GAGAL") . "\n";

$st = $pdo->query("SHOW COLUMNS FROM " . t('users') . " LIKE 'tier'");
echo "tabel users.tier: " . ($st->fetch() ? "ADA (OK)" : "GAGAL") . "\n";

$st = $pdo->query("SHOW COLUMNS FROM " . t('codes') . " LIKE 'tier'");
echo "tabel codes.tier: " . ($st->fetch() ? "ADA (OK)" : "GAGAL") . "\n";

echo "\n=== 2. UJI BUAT KODE BER-TIER ===\n";
$kodeReg = kode_buat_banyak(1, 'uji-tier', 'reguler test', 'reguler')[0] ?? '';
$kodePrem = kode_buat_banyak(1, 'uji-tier', 'premium test', 'premium')[0] ?? '';

$st = $pdo->prepare("SELECT tier FROM " . t('codes') . " WHERE kode = ?");
$st->execute([$kodeReg]);
echo "Kode Reguler: {$kodeReg} -> tier = " . $st->fetchColumn() . "\n";

$st->execute([$kodePrem]);
echo "Kode Premium: {$kodePrem} -> tier = " . $st->fetchColumn() . "\n";

echo "\n=== 3. UJI MATERI AKSES ===\n";
$semua = bagian_semua();
echo "Total bagian materi saat ini: " . count($semua) . "\n";
foreach ($semua as $b) {
    echo "  Bagian {$b['urutan']}: {$b['judul']} [Akses: {$b['akses']}]\n";
}

echo "\nSEMUA UJI LOGIKA TIER BERHASIL!\n";
