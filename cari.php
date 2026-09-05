<?php
// cari.php — pencarian judul & isi materi.
declare(strict_types=1);
require __DIR__ . '/_boot.php';
require __DIR__ . '/_markdown.php';
require __DIR__ . '/_progress.php';

require_login();

$q     = trim((string)($_GET['q'] ?? ''));
$hasil = [];

if ($q !== '' && mb_strlen($q) >= 2) {
    $like = '%' . $q . '%';
    $st = db()->prepare(
        'SELECT urutan, judul, ringkas, isi_md FROM ' . t('content') . '
         WHERE judul LIKE ? OR ringkas LIKE ? OR isi_md LIKE ?
         ORDER BY urutan'
    );
    $st->execute([$like, $like, $like]);
    $hasil = $st->fetchAll();
}

head_html('Cari materi');
?>
<div class="card">
  <h1>Cari materi</h1>
  <p class="sub">Cari berdasarkan judul atau isi Bagian.</p>

  <form method="get">
    <label for="q">Kata kunci</label>
    <div class="row">
      <input id="q" name="q" value="<?= e($q) ?>" placeholder="misalnya: skill, deploy, provider"
             autofocus style="flex:3 1 260px">
      <button class="btn" type="submit" style="flex:0 0 auto">Cari</button>
    </div>
  </form>
</div>

<?php if ($q !== ''): ?>
  <div class="card">
    <?php if (mb_strlen($q) < 2): ?>
      <p class="muted">Kata kunci minimal 2 huruf.</p>
    <?php elseif (!$hasil): ?>
      <p class="muted">Tidak ada yang cocok dengan “<?= e($q) ?>”.</p>
      <p class="hint">Coba kata yang lebih umum, atau lihat <a href="faq.php">FAQ</a>.</p>
    <?php else: ?>
      <p class="sub"><?= count($hasil) ?> Bagian cocok dengan “<?= e($q) ?>”.</p>
      <?php foreach ($hasil as $r): $no = (int)$r['urutan']; ?>
        <div class="bagian">
          <div class="no"><?= $no ?></div>
          <div class="isi">
            <h3 style="margin:0 0 4px">
              <a href="materi.php?b=<?= $no ?>"><?= e($r['judul']) ?></a>
            </h3>
            <p class="muted small" style="margin:0"><?= e(md_excerpt((string)$r['isi_md'], 180)) ?></p>
          </div>
          <div class="aksi"><a class="btn ghost" href="materi.php?b=<?= $no ?>">Buka</a></div>
        </div>
      <?php endforeach; ?>
    <?php endif; ?>
  </div>
<?php endif; ?>
<?php foot_html();
