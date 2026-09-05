<?php
// _uji_demo.php — HANYA UNTUK UJI LOKAL. Jangan diunggah ke hosting.
// Menyiapkan akun demo agar mudah dicoba:
//   admin@demo.id  / demo12345   (admin)
//   budi@demo.id   / demo12345   (member, progres Bagian 1 selesai)
// Plus 3 kode akses baru yang siap ditukar.
declare(strict_types=1);
require __DIR__ . '/_boot.php';
require __DIR__ . '/_kode.php';
require __DIR__ . '/_progress.php';

// Gerbang lokal: hanya boleh dari server uji di mesin sendiri.
// Menerima 'localhost' maupun '127.0.0.1' karena kedua bentuk dipakai
// (docker-compose memakai localhost, PHP built-in server memakai 127.0.0.1).
if (!in_array($_SERVER['HTTP_HOST'] ?? '', ['localhost:8813', '127.0.0.1:8813'], true)) {
    http_response_code(404);
    exit;
}
header('Content-Type: text/plain; charset=utf-8');

$pdo = db();

function upsert_user(PDO $pdo, string $email, string $nama, string $pw, string $role): int
{
    $st = $pdo->prepare('SELECT id FROM ' . t('users') . ' WHERE email = ?');
    $st->execute([$email]);
    $id = (int)($st->fetchColumn() ?: 0);

    if ($id > 0) {
        $pdo->prepare('UPDATE ' . t('users') . ' SET nama = ?, pass_hash = ?, role = ? WHERE id = ?')
            ->execute([$nama, pw_hash($pw), $role, $id]);
        return $id;
    }
    $pdo->prepare('INSERT INTO ' . t('users') . ' (nama, email, pass_hash, role, created_at)
                   VALUES (?, ?, ?, ?, NOW())')
        ->execute([$nama, $email, pw_hash($pw), $role]);
    return (int)$pdo->lastInsertId();
}

$idAdmin  = upsert_user($pdo, 'admin@demo.id', 'Owner Kelas', 'demo12345', 'admin');
$idMember = upsert_user($pdo, 'budi@demo.id',  'Budi Santoso', 'demo12345', 'member');

progres_set($idMember, 1, 'selesai');
progres_set($idMember, 2, 'mulai');
catatan_simpan($idMember, 1, "Poin penting dari Bagian 1:\n- pasang Hermes lewat installer resmi\n- simpan API key di config, jangan di chat");

$kode = kode_buat_banyak(3, 'demo', 'akun demo lokal');

echo "admin  : admin@demo.id / demo12345\n";
echo "member : budi@demo.id / demo12345\n";
echo "kode baru:\n";
foreach ($kode as $k) echo "  $k\n";
