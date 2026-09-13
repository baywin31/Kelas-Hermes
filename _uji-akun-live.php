<?php
// _uji-akun-live.php — SEKALI PAKAI. Pastikan ada akun uji member & admin di
// database HOSTING supaya uji unduhan bisa login sungguhan.
//
// Kenapa: uji lokal sudah membuktikan alurnya jalan, tapi hosting punya jalur
// penyimpanan sendiri (/home/jurag139/kdsimpan). Satu-satunya cara memastikan
// tombol unduh benar-benar bekerja untuk pembeli adalah login sebagai member
// dan mengunduh berkasnya lewat HTTP.
//
// Akun ini hanya untuk pengujian. HAPUS setelah selesai:
//   jalankan hapus-akun-uji.sh (atau minta admin hapus dari panel Kelola member)
// WAJIB dicabut: bash hapus-cek-path.sh
declare(strict_types=1);
require __DIR__ . '/_boot.php';

if (($_GET['k'] ?? '') !== 'uji-akun-7f31bd') { http_response_code(404); die('Tidak ditemukan.'); }
header('Content-Type: text/plain; charset=utf-8');

$pw = 'ujiskill2026';
echo "=== Siapkan akun uji di hosting ===\n\n";

$akun = [
    ['ujiskill@demo.id', 'Uji Skill', 'member', 'reguler'],
    ['ujiskillvip@demo.id', 'Uji Skill VIP', 'member', 'premium'],
];

foreach ($akun as [$email, $nama, $role, $tier]) {
    $st = db()->prepare('SELECT id FROM ' . t('users') . ' WHERE email = ?');
    $st->execute([$email]);
    $id = (int)($st->fetchColumn() ?: 0);

    if ($id > 0) {
        db()->prepare('UPDATE ' . t('users') . ' SET pass_hash = ?, role = ?, tier = ? WHERE id = ?')
            ->execute([pw_hash($pw), $role, $tier, $id]);
        echo "  reset   $email (id=$id, role=$role, tier=$tier)\n";
    } else {
        db()->prepare('INSERT INTO ' . t('users') . ' (nama, email, pass_hash, role, tier, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())')
            ->execute([$nama, $email, pw_hash($pw), $role, $tier]);
        echo "  buat    $email (role=$role, tier=$tier)\n";
    }

    $v = db()->prepare('SELECT pass_hash FROM ' . t('users') . ' WHERE email = ?');
    $v->execute([$email]);
    echo "          verifikasi sandi: " . (password_verify($pw, (string)$v->fetchColumn()) ? 'OK' : 'GAGAL') . "\n";
}

echo "\nsandi: $pw\n";
echo "SELESAI. Hapus akun uji setelah selesai & cabut berkas ini: bash hapus-cek-path.sh\n";
