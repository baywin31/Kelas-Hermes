<?php
// _uji_akun.php — HANYA LOKAL. Pastikan akun uji ada dengan password yang
// diketahui, supaya uji lewat HTTP bisa login.
//
// Dua akun: member (untuk halaman materi) dan admin (untuk panel & pratinjau).
// Tanpa yang kedua, uji panel admin gagal dengan pesan yang menyesatkan
// ("wadah kerangka tidak ada") padahal sebenarnya cuma tidak berhasil masuk.
declare(strict_types=1);
require __DIR__ . '/_boot.php';
header('Content-Type: text/plain; charset=utf-8');

$pw  = 'demo12345';
$db  = db();
$akun = [
    ['budi@demo.id',  'Budi Uji',  'member'],
    ['admin@demo.id', 'Admin Uji', 'admin'],
];

foreach ($akun as [$email, $nama, $role]) {
    $st = $db->prepare('SELECT id, role FROM ' . t('users') . ' WHERE email = ?');
    $st->execute([$email]);
    $u = $st->fetch();
    $hash = password_hash($pw, PASSWORD_DEFAULT);

    if ($u) {
        // Peran ikut dipaksa: kalau akun admin pernah dipakai tes lain dan
        // turun jadi member, uji panel admin akan gagal tanpa sebab jelas.
        $db->prepare('UPDATE ' . t('users') . ' SET pass_hash = ?, role = ? WHERE id = ?')
           ->execute([$hash, $role, $u['id']]);
        echo "password direset: {$email} (id={$u['id']}, role={$role})\n";
    } else {
        $db->prepare('INSERT INTO ' . t('users') . ' (nama, email, pass_hash, role, created_at) VALUES (?,?,?,?,NOW())')
           ->execute([$nama, $email, $hash, $role]);
        echo "akun uji dibuat: {$email} (role={$role})\n";
    }

    $st2 = $db->prepare('SELECT pass_hash, role FROM ' . t('users') . ' WHERE email = ?');
    $st2->execute([$email]);
    $r = $st2->fetch();
    echo "  verify: " . (password_verify($pw, (string)$r['pass_hash']) ? 'OK' : 'GAGAL')
       . " / role: {$r['role']}\n";
}
