<?php
// _uji_ratereset.php — HANYA LOKAL. Kosongkan tabel rate limit supaya uji
// berulang tidak kena blokir "terlalu banyak percobaan".
declare(strict_types=1);
require __DIR__ . '/_boot.php';
header('Content-Type: text/plain; charset=utf-8');
$db = db();
$db->exec('DELETE FROM ' . t('ratelimit'));
echo "rate limit dikosongkan\n";
$st = $db->query('SELECT COUNT(*) FROM ' . t('ratelimit'));
echo "sisa baris: " . $st->fetchColumn() . "\n";
