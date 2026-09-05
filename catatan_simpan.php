<?php
// catatan_simpan.php — endpoint auto-save catatan (dipanggil fetch dari app.js).
declare(strict_types=1);
require __DIR__ . '/_boot.php';
require __DIR__ . '/_progress.php';

header('Content-Type: text/plain; charset=utf-8');

$u = current_user();
if (!$u) {
    http_response_code(401);
    echo 'perlu login';
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo 'metode salah';
    exit;
}

// csrf_check() memanggil die() dengan kode 419 kalau token tidak cocok.
csrf_check();

$bagian = (int)($_POST['bagian'] ?? 0);
if ($bagian <= 0) {
    http_response_code(400);
    echo 'bagian tidak valid';
    exit;
}

catatan_simpan((int)$u['id'], $bagian, (string)($_POST['isi'] ?? ''));
echo 'ok';
