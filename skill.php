<?php
// skill.php — Modul Skill: paket siap pakai yang bisa diunduh member.
declare(strict_types=1);
require __DIR__ . '/_boot.php';
require __DIR__ . '/_skill.php';

$u = require_login();

$semua  = skill_semua();
$boleh  = array_values(array_filter($semua, fn(array $s): bool => skill_boleh($s, $u)));
$kunci  = count($semua) - count($boleh);
$waUpgrade = wa_link('Halo admin, saya mau upgrade ke VIP untuk membuka semua paket skill di kelas ' . COURSE_NAME . ' (' . $u['email'] . ').');

head_html('Modul Skill');
?>
<div class="card">
  <h1 style="margin:0 0 6px">Modul Skill</h1>
  <p class="sub" style="margin:0">
    Paket skill Hermes yang sudah dirakit, siap diimport ke Hermes Agent kamu.
    Klik <strong>Unduh</strong>, lalu import dari folder hasil ekstrak zip-nya.
  </p>
  <div class="mt-5 flex flex-wrap items-center gap-2">
    <?= komp_meta('kotak', count($boleh) . ' paket tersedia') ?>
    <?php if (($u['tier'] ?? 'reguler') === 'premium'): ?>
      <span class="pill ok">⭐ Akses VIP — semua terbuka</span>
    <?php elseif ($kunci > 0): ?>
      <a class="pill" href="skill.php">🔒 <?= $kunci ?> paket khusus VIP</a>
    <?php endif; ?>
    <a class="pill" href="dashboard.php">Dashboard</a>
  </div>
</div>

<?php if (!$boleh): ?>
  <div class="card">
    <p class="muted" style="margin:0">Belum ada paket skill yang dipasang admin. Coba cek lagi nanti.</p>
  </div>
<?php else: ?>
  <?php foreach ($boleh as $s):
      $premium = ($s['akses'] ?? 'reguler') === 'premium';
  ?>
    <div class="card">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap">
        <div style="flex:1 1 320px;min-width:240px">
          <h2 style="margin:0 0 6px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <?= e($s['judul']) ?>
            <?php if ($premium): ?><span class="pill ok">⭐ VIP</span><?php endif; ?>
          </h2>
          <?php if (trim((string)$s['keterangan']) !== ''): ?>
            <p class="sub" style="margin:0 0 10px"><?= e($s['keterangan']) ?></p>
          <?php endif; ?>
          <div class="flex flex-wrap items-center gap-3">
            <?= komp_meta('kotak', 'Zip · ' . skill_ukuran_teks((int)$s['ukuran'])) ?>
            <?= komp_meta('panah', (int)$s['unduhan'] . '× diunduh') ?>
          </div>
        </div>
        <div style="flex:0 0 auto">
          <a class="btn blok" href="unduh.php?id=<?= (int)$s['id'] ?>&amp;v=<?= (int)$s['unduhan'] ?>">
            ⬇ Unduh paket
          </a>
        </div>
      </div>
    </div>
  <?php endforeach; ?>
<?php endif; ?>

<?php if ($kunci > 0): ?>
  <div class="card">
    <h2 style="margin:0 0 6px">🔒 <?= $kunci ?> paket lagi khusus member VIP</h2>
    <p class="sub" style="margin:0 0 14px">
      Paket tambahan ini dikunci untuk tingkat Premium/VIP. Buka aksesnya dan seluruh
      modul materi VIP ikut terbuka.
    </p>
    <div class="row">
      <?php if ($waUpgrade !== ''): ?>
        <a class="btn blok" href="<?= e($waUpgrade) ?>" target="_blank" rel="noopener">
          ⭐ Upgrade ke VIP lewat WhatsApp
        </a>
      <?php endif; ?>
      <a class="btn ghost blok" href="dashboard.php">Lihat modul materi VIP</a>
    </div>
  </div>
<?php endif; ?>

<div class="card tight">
  <p class="sub" style="margin:0 0 12px">Belum tahu cara import skill ke Hermes?</p>
  <div class="row">
    <a class="btn ghost blok" href="faq.php">Baca FAQ</a>
    <a class="btn ghost blok" href="tanya.php">Tanya Admin</a>
  </div>
</div>
<?php foot_html();
