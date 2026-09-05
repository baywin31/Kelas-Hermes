<?php
// _uji_bersih.php — HANYA UNTUK UJI LOKAL. Jangan diunggah ke hosting.
// Mengosongkan tabel rate limit supaya smoke test bisa dijalankan berulang
// dari IP yang sama tanpa kena batas 5 percobaan / 15 menit.
declare(strict_types=1);
require __DIR__ . '/_boot.php';

if (!in_array($_SERVER['HTTP_HOST'] ?? '', ['localhost:8813', '127.0.0.1:8813'], true)) {
    http_response_code(404);
    exit;
}

db()->exec('DELETE FROM ' . t('ratelimit'));
header('Content-Type: text/plain; charset=utf-8');
echo 'rate limit dikosongkan';
