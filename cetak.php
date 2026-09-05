<?php
// cetak.php — tampilan bersih untuk Save-as-PDF / cetak.
declare(strict_types=1);
require __DIR__ . '/_boot.php';
require __DIR__ . '/_markdown.php';
require __DIR__ . '/_progress.php';

$u  = require_login();
$no = (int)($_GET['b'] ?? 0);
$b  = $no > 0 ? bagian_satu($no) : null;

if (!$b) {
    http_response_code(404);
    die('Bagian tidak ditemukan.');
}
?><!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bagian <?= $no ?> — <?= e($b['judul']) ?></title>
<meta name="robots" content="noindex, nofollow">
<style>
  body{max-width:780px;margin:32px auto;padding:0 20px;background:#fff;color:#111;
       font-family:Georgia,"Times New Roman",serif;line-height:1.7;font-size:16px}
  h1{font-size:25px;margin:0 0 4px;line-height:1.3}
  h2{font-size:20px;margin:26px 0 8px}
  h3{font-size:17px;margin:20px 0 6px}
  .meta{color:#666;font-size:13px;margin:0 0 24px;font-family:system-ui,sans-serif}
  pre{background:#f5f5f5;border:1px solid #ddd;border-radius:6px;padding:12px;overflow-x:auto;
      font-size:13px;font-family:ui-monospace,Consolas,monospace}
  code{background:#f5f5f5;border:1px solid #ddd;border-radius:4px;padding:1px 5px;
       font-size:13.5px;font-family:ui-monospace,Consolas,monospace}
  pre code{border:0;padding:0;background:none}
  blockquote{margin:16px 0;padding:10px 16px;border-left:3px solid #999;background:#fafafa}
  table{width:100%;border-collapse:collapse;margin:14px 0;font-size:14.5px}
  th,td{border:1px solid #ccc;padding:8px 10px;text-align:left}
  .cetak-btn{font-family:system-ui,sans-serif;margin:0 0 26px}
  .cetak-btn button{padding:10px 16px;font-size:15px;cursor:pointer;border:1px solid #333;
                    background:#111;color:#fff;border-radius:8px;min-height:44px}
  .catatan{margin-top:34px;padding-top:18px;border-top:1px solid #ccc}
  .catatan h2{margin-top:0}
  .catatan pre{white-space:pre-wrap;font-family:inherit;background:#fafafa;font-size:15px}
  /* Gambar TETAP dicetak — di materi teknis tangkapan layar itu inti isinya.
     Hanya dibatasi supaya tidak melewati tepi kertas dan tidak terpotong
     di pergantian halaman. */
  figure.gambar{margin:18px 0; page-break-inside:avoid; break-inside:avoid}
  figure.gambar img{display:block; width:100%; height:auto; border:1px solid #ccc}
  figure.gambar figcaption{margin-top:6px; font-size:13px; color:#666;
                           font-family:system-ui,sans-serif}
  /* Video tidak ada gunanya di kertas: bingkainya disembunyikan, tapi tautan
     cadangannya dibiarkan supaya pembaca versi cetak tetap bisa menontonnya. */
  .video-embed{display:none}
  .video-cap{margin:14px 0;font-size:14px}
  @media print{ .cetak-btn{display:none} body{margin:0;font-size:12pt} }
</style>
</head>
<body>
<div class="cetak-btn">
  <button type="button" onclick="window.print()">Cetak / Simpan sebagai PDF</button>
</div>

<h1>Bagian <?= $no ?> — <?= e($b['judul']) ?></h1>
<p class="meta">
  <?= e(APP_NAME) ?> · kelas <?= e(COURSE_NAME) ?> ·
  untuk <?= e($u['nama']) ?> ·
  diperbarui <?= e(date('j M Y', strtotime((string)$b['updated_at']))) ?>
</p>

<?= md_to_html((string)$b['isi_md'], false) ?>

<?php $cat = catatan_ambil((int)$u['id'], $no); ?>
<?php if (trim($cat) !== ''): ?>
  <div class="catatan">
    <h2>Catatan pribadimu</h2>
    <pre><?= e($cat) ?></pre>
  </div>
<?php endif; ?>
</body>
</html>
