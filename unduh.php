<?php
// unduh.php — kirim berkas skill ke member yang berhak.
//
// Kenapa lewat PHP dan bukan tautan langsung ke folder `unduhan/`: tautan
// langsung bisa ditebak siapa saja yang tahu nama berkasnya, sehingga paket
// berbayar bocor tanpa login dan gembok tier Premium jadi tanpa arti.
declare(strict_types=1);
require __DIR__ . '/_boot.php';
require __DIR__ . '/_skill.php';

$u = require_login();

$id = (int)($_GET['id'] ?? 0);
$s  = $id > 0 ? skill_satu($id) : null;

if (!$s || (int)$s['aktif'] !== 1) {
    http_response_code(404);
    head_html('Berkas tidak ditemukan');
    echo '<div class="card"><h1>Berkas tidak ditemukan</h1>'
       . '<p class="sub">Paket skill ini sudah tidak tersedia.</p>'
       . '<p><a class="btn" href="skill.php">Kembali ke daftar skill</a></p></div>';
    foot_html();
    exit;
}

// Gembok tier dipasang di sisi SERVER, bukan cuma disembunyikan di tampilan.
if (!skill_boleh($s, $u)) {
    http_response_code(403);
    head_html('Khusus member VIP');
    echo '<div class="card"><h1>🔒 Khusus member VIP</h1>'
       . '<p class="sub">Paket skill ini bagian dari bonus Premium/VIP.</p>'
       . '<p><a class="btn" href="skill.php">Lihat daftar skill</a></p></div>';
    foot_html();
    exit;
}

$path = skill_path($s);

if (!is_file($path)) {
    http_response_code(404);
    head_html('Berkas hilang');
    echo '<div class="card"><h1>Berkasnya tidak ada di server</h1>'
       . '<p class="sub">Catatannya ada tapi berkasnya hilang. Kabari admin lewat WhatsApp.</p>'
       . '<p><a class="btn" href="skill.php">Kembali</a></p></div>';
    foot_html();
    exit;
}

// Statistik unduhan tidak boleh menggagalkan pengiriman berkas yang sah.
try {
    db()->prepare('UPDATE ' . t('skills') . ' SET unduhan = unduhan + 1 WHERE id = ?')->execute([(int)$s['id']]);
} catch (Throwable $e) {}

// Buang buffer yang mungkin sudah terisi (notice PHP, spasi dari berkas yang
// di-include) — kalau tidak, zip yang diterima member rusak di byte pertama.
while (ob_get_level() > 0) ob_end_clean();

header('Content-Type: application/zip');
header('Content-Disposition: attachment; filename="' . str_replace('"', '', skill_nama_unduhan((string)$s['judul'])) . '"');
header('Content-Length: ' . (string)filesize($path));
header('X-Content-Type-Options: nosniff');
header('Cache-Control: private, no-store');
readfile($path);
exit;
