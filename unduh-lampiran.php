<?php
// unduh-lampiran.php — kirim berkas lampiran satu Bagian ke member yang berhak.
//
// Kenapa lewat PHP dan bukan tautan langsung ke folder lampiran/: tautan
// langsung bisa ditebak siapa pun, sehingga berkas berbayar bocor tanpa login
// dan gembok tier Premium jadi tanpa arti.
//
// Izin mengikuti akses BAGIAN-nya. Jadi kalau Bagian itu Premium, lampirannya
// otomatis terkunci — tidak ada pengaturan terpisah yang bisa lupa disetel.
declare(strict_types=1);
require __DIR__ . '/_boot.php';
require __DIR__ . '/_progress.php';
require __DIR__ . '/_lampiran.php';

$u = require_login();

$id = (int)($_GET['id'] ?? 0);
$l  = $id > 0 ? lamp_satu($id) : null;

if (!$l || (int)$l['aktif'] !== 1) {
    http_response_code(404);
    head_html('Berkas tidak ditemukan');
    echo '<div class="card"><h1>Berkas tidak ditemukan</h1>'
       . '<p class="sub">Lampiran ini sudah tidak tersedia.</p>'
       . '<p><a class="btn" href="dashboard.php">Kembali ke dashboard</a></p></div>';
    foot_html();
    exit;
}

// Ambil Bagian induknya untuk memeriksa tingkat akses.
$bagian = bagian_satu((int)$l['bagian']);

if (!$bagian) {
    http_response_code(404);
    head_html('Berkas tidak ditemukan');
    echo '<div class="card"><h1>Materi induknya sudah tidak ada</h1>'
       . '<p class="sub">Berkas ini menempel di Bagian yang sudah dihapus.</p>'
       . '<p><a class="btn" href="dashboard.php">Kembali ke dashboard</a></p></div>';
    foot_html();
    exit;
}

$premium  = ($bagian['akses'] ?? 'reguler') === 'premium';
$boleh    = !$premium || ($u['tier'] ?? 'reguler') === 'premium';

if (!$boleh) {
    http_response_code(403);
    head_html('Khusus member VIP');
    echo '<div class="card"><h1>🔒 Khusus member VIP</h1>'
       . '<p class="sub">Lampiran ini bagian dari materi Premium/VIP.</p>'
       . '<p><a class="btn" href="materi.php?b=' . (int)$l['bagian'] . '">Lihat materinya</a></p></div>';
    foot_html();
    exit;
}

$path = lamp_path($l);

if (!is_file($path)) {
    http_response_code(404);
    head_html('Berkas hilang');
    echo '<div class="card"><h1>Berkasnya tidak ada di server</h1>'
       . '<p class="sub">Catatannya ada tapi berkasnya hilang. Kabari admin lewat WhatsApp.</p>'
       . '<p><a class="btn" href="materi.php?b=' . (int)$l['bagian'] . '">Kembali ke materi</a></p></div>';
    foot_html();
    exit;
}

// Statistik unduhan tidak boleh menggagalkan pengiriman berkas yang sah.
try {
    db()->prepare('UPDATE ' . t('lampiran') . ' SET unduhan = unduhan + 1 WHERE id = ?')->execute([(int)$l['id']]);
} catch (Throwable $e) {}

// Buang buffer apa pun (notice PHP, spasi dari berkas yang di-include) supaya
// berkas yang diterima member tidak rusak karena teks nyelip di depannya.
while (ob_get_level() > 0) ob_end_clean();

$namaUnduh = lamp_nama_unduhan($l);
$jenis = match (strtolower((string)pathinfo((string)$l['berkas'], PATHINFO_EXTENSION))) {
    'md', 'markdown' => 'text/markdown; charset=utf-8',
    'txt'            => 'text/plain; charset=utf-8',
    'pdf'            => 'application/pdf',
    'json'           => 'application/json',
    'zip'            => 'application/zip',
    default          => 'application/octet-stream',
};

header('Content-Type: ' . $jenis);
header('Content-Disposition: attachment; filename="' . str_replace('"', '', $namaUnduh) . '"');
header('Content-Length: ' . (string)filesize($path));
header('X-Content-Type-Options: nosniff');
header('Cache-Control: private, no-store');
readfile($path);
exit;
