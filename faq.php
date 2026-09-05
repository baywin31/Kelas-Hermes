<?php
// faq.php — FAQ (markdown, dikelola admin dari panel).
declare(strict_types=1);
require __DIR__ . '/_boot.php';
require __DIR__ . '/_markdown.php';

require_login();

$md = setting('faq_md', '');

head_html('FAQ');
?>
<div class="card">
  <h1>Pertanyaan yang sering muncul</h1>
  <?php if (trim($md) === ''): ?>
    <p class="muted">FAQ belum diisi admin.</p>
  <?php else: ?>
    <div class="isi-materi"><?= md_to_html($md) ?></div>
  <?php endif; ?>
</div>

<div class="card tight">
  <p class="sub" style="margin:0 0 12px">Masih tersangkut?</p>
  <div class="row">
    <a class="btn blok" href="tanya.php">Tanya Admin</a>
    <a class="btn ghost blok" href="dashboard.php">Kembali ke dashboard</a>
  </div>
</div>
<?php foot_html();
