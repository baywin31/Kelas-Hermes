<?php
// _setvid.php — SEKALI PAKAI. Sisipkan satu baris "@video <url>" ke materi
// yang sudah ada di database.
//
// Kenapa perlu skrip: seed materi memakai INSERT IGNORE, jadi Bagian yang
// sudah ada di server TIDAK ikut diperbarui saat _seed.php diganti. Baris
// video harus dimasukkan ke baris database yang sudah ada.
//
// Kenapa tidak menimpa _config.php: berkas itu memuat password database asli
// yang tidak dimiliki asisten.
//
// HAPUS SEGERA setelah dipakai (hapus-setvid.sh) — skrip ini mengubah isi
// materi tanpa login.
declare(strict_types=1);
require __DIR__ . '/_boot.php';

header('Content-Type: text/plain; charset=utf-8');

if (($_GET['k'] ?? '') !== 'setvid2026') {
    http_response_code(404);
    echo "Not Found";
    exit;
}

$urutan = (int)($_GET['b'] ?? 1);
$url    = trim((string)($_GET['u'] ?? ''));
$judul  = trim((string)($_GET['t'] ?? 'Video tutorial'));

// Saring lewat fungsi yang sama dengan penyaji halaman: kalau ID tidak bisa
// diambil, jangan pernah menulis apa pun ke database.
require_once __DIR__ . '/_markdown.php';
$id = yt_id($url);
if ($id === '') {
    echo "TOLAK: bukan tautan YouTube yang bisa dibaca: $url\n";
    exit;
}

$db = db();
$st = $db->prepare('SELECT id, judul, isi_md FROM ' . t('content') . ' WHERE urutan = ?');
$st->execute([$urutan]);
$row = $st->fetch();
if (!$row) {
    echo "TOLAK: Bagian $urutan tidak ada di database\n";
    exit;
}

$isi = (string)$row['isi_md'];

// Idempoten: kalau video ini sudah ada, jangan ditambah dua kali.
if (str_contains($isi, $id)) {
    echo "SUDAH ADA: Bagian $urutan sudah memuat video $id — tidak diubah\n";
    exit;
}

$baris = '@video ' . $url . ' ' . $judul;

// Taruh setelah paragraf pembuka (sesudah judul "##" pertama dan satu
// paragraf), supaya video muncul di atas tanpa menimpa struktur materi.
$lines = explode("\n", str_replace("\r\n", "\n", $isi));
$sisip = null;
$lewatJudul = false;
foreach ($lines as $i => $l) {
    $tr = trim($l);
    if (!$lewatJudul) { if (str_starts_with($tr, '#')) { $lewatJudul = true; } continue; }
    // baris kosong pertama SESUDAH ada paragraf isi
    if ($tr === '' && $i > 0 && trim($lines[$i - 1]) !== '' && !str_starts_with(trim($lines[$i - 1]), '#')) {
        $sisip = $i;
        break;
    }
}
if ($sisip === null) {
    $baru = $isi . "\n\n" . $baris . "\n";
} else {
    array_splice($lines, $sisip, 0, ['', $baris]);
    $baru = implode("\n", $lines);
}

$up = $db->prepare('UPDATE ' . t('content') . ' SET isi_md = ?, updated_at = NOW() WHERE id = ?');
$up->execute([$baru, $row['id']]);

// Baca ulang dari database dan buktikan hasil render benar-benar memuat iframe.
$ck = $db->prepare('SELECT isi_md FROM ' . t('content') . ' WHERE id = ?');
$ck->execute([$row['id']]);
$cek = (string)$ck->fetchColumn();
$html = md_to_html($cek);

echo "OK Bagian $urutan: {$row['judul']}\n";
echo "video id      : $id\n";
echo "baris @video  : " . (str_contains($cek, '@video') ? 'tersimpan' : 'HILANG') . "\n";
echo "render iframe : " . (str_contains($html, '<iframe') ? 'ADA' : 'TIDAK ADA') . "\n";
echo "nocookie      : " . (str_contains($html, 'youtube-nocookie.com/embed/' . $id) ? 'ya' : 'TIDAK') . "\n";
echo "tegak (shorts): " . (str_contains($html, 'video-embed tegak') ? 'ya' : 'tidak') . "\n";
