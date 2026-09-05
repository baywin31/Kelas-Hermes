<?php
// _uji_setimg.php — HANYA UJI LOKAL. Sisipkan satu baris gambar ke materi,
// supaya uji HTTP bisa memeriksa hasil render di halaman sungguhan.
// Berkas berawalan _uji_ tidak pernah ikut ke paket pembeli.
declare(strict_types=1);
require __DIR__ . '/_boot.php';
require_once __DIR__ . '/_markdown.php';
header('Content-Type: text/plain; charset=utf-8');

$urutan = (int)($_GET['b'] ?? 1);
$url    = trim((string)($_GET['u'] ?? ''));
$ket    = trim((string)($_GET['t'] ?? ''));

if (img_url_ok($url) === '') { echo "TOLAK: URL gambar tidak lolos saringan: $url\n"; exit; }

$db = db();
$st = $db->prepare('SELECT id, judul, isi_md FROM ' . t('content') . ' WHERE urutan = ?');
$st->execute([$urutan]);
$row = $st->fetch();
if (!$row) { echo "TOLAK: Bagian $urutan tidak ada\n"; exit; }

$isi = (string)$row['isi_md'];
if (str_contains($isi, $url)) { echo "SUDAH ADA: gambar itu sudah ada di Bagian $urutan\n"; exit; }

$baru = $isi . "\n\n![" . $ket . "](" . $url . ")\n";
$db->prepare('UPDATE ' . t('content') . ' SET isi_md = ?, updated_at = NOW() WHERE id = ?')
   ->execute([$baru, $row['id']]);

$ck = $db->prepare('SELECT isi_md FROM ' . t('content') . ' WHERE id = ?');
$ck->execute([$row['id']]);
$html = md_to_html((string)$ck->fetchColumn());

echo "OK Bagian $urutan: {$row['judul']}\n";
echo "render figure : " . (str_contains($html, '<figure class="gambar">') ? 'ADA' : 'TIDAK ADA') . "\n";
echo "src benar     : " . (str_contains($html, 'src="' . htmlspecialchars($url, ENT_QUOTES, 'UTF-8') . '"') ? 'ya' : 'TIDAK') . "\n";
