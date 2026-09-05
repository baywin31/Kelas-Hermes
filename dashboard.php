<?php
// dashboard.php — halaman utama member.
// URUTAN TAMPILAN WAJIB (dari PRD, jangan ditukar):
//   1. sapaan  2. tombol Telegram  3. daftar Bagian  4. progres
declare(strict_types=1);
require __DIR__ . '/_boot.php';
require __DIR__ . '/_progress.php';

$u = require_login();
$uid = (int)$u['id'];

// Ubah status Bagian dari tombol di daftar.
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $bagian = (int)($_POST['bagian'] ?? 0);
    $status = (string)($_POST['status'] ?? '');
    if ($bagian > 0) {
        progres_set($uid, $bagian, $status);
        audit('progres_ubah', $uid, "bagian=$bagian status=$status");
    }
    redirect('dashboard.php');
}

$bagianList = bagian_semua();
$progres    = progres_user($uid);
$kunjungan  = kunjungan_user($uid);
$links      = links_ambil();
$telegram   = setting('telegram_url', TELEGRAM_URL);

$total   = count($bagianList);
$selesai = 0;
foreach ($bagianList as $b) {
    if (($progres[(int)$b['urutan']] ?? 'belum') === 'selesai') $selesai++;
}
$persen = $total > 0 ? (int)round($selesai / $total * 100) : 0;

head_html('Dashboard');
?>

<!-- 1. SAPAAN -->
<div class="card">
  <span class="eyebrow">Akses aktif · selamanya</span>
  <h1>Halo, <?= e($u['nama']) ?></h1>
  <p class="sub" style="margin-bottom:0">
    Selamat datang di member area kelas <?= e(COURSE_NAME) ?>.
    Aksesmu berlaku selamanya, termasuk materi yang ditambahkan nanti.
  </p>
</div>

<!-- 2. TOMBOL TELEGRAM -->
<div class="card tight">
  <a class="btn btn-tele blok" href="<?= e($telegram) ?>" target="_blank" rel="noopener">
    Join Komunitas Telegram
  </a>
  <p class="hint" style="margin:10px 0 0;text-align:center">
    Tempat tanya-jawab dan pengumuman materi baru.
  </p>
</div>

<!-- 3. DAFTAR BAGIAN -->
<div class="card">
  <h2 style="margin-top:0">Materi kelas</h2>
  <?php if (!$bagianList): ?>
    <p class="muted">Materi belum tersedia.</p>
  <?php else: ?>
    <?php foreach ($bagianList as $b):
        $no  = (int)$b['urutan'];
        $st  = $progres[$no] ?? 'belum';
        $baru = materi_baru($b, $kunjungan);
    ?>
      <div class="bagian">
        <div class="no"><?= $no ?></div>
        <div class="isi">
          <h3>
            <a href="materi.php?b=<?= $no ?>"><?= e($b['judul']) ?></a>
            <?php if ($baru): ?><span class="badge baru">Materi Baru</span><?php endif; ?>
          </h3>
          <p class="muted small" style="margin:0 0 8px"><?= e($b['ringkas']) ?></p>
          <?= badge_status($st) ?>
        </div>
        <div class="aksi">
          <a class="btn ghost" href="materi.php?b=<?= $no ?>">Buka</a>
          <form method="post" style="margin:0">
            <?= csrf_field() ?>
            <input type="hidden" name="bagian" value="<?= $no ?>">
            <?php if ($st === 'selesai'): ?>
              <input type="hidden" name="status" value="belum">
              <button class="btn ghost" type="submit">Tandai belum</button>
            <?php else: ?>
              <input type="hidden" name="status" value="selesai">
              <button class="btn ok" type="submit">Tandai selesai</button>
            <?php endif; ?>
          </form>
        </div>
      </div>
    <?php endforeach; ?>
  <?php endif; ?>
</div>

<!-- 4. PROGRES -->
<div class="card">
  <h2 style="margin-top:0">Progres belajar</h2>
  <div class="progres">
    <div class="progres-angka">
      <b><?= $persen ?>%</b>
      <span class="muted small">
        <strong><?= $selesai ?></strong> dari <?= $total ?> Bagian selesai
      </span>
    </div>
    <div class="bar-luar"><div class="bar-dalam" data-persen="<?= $persen ?>"></div></div>
  </div>
</div>

<?php if ($links): ?>
<div class="card">
  <h2 style="margin-top:0">Tautan penting</h2>
  <?php foreach ($links as $l):
      $url = (string)($l['url'] ?? '');
      if (!preg_match('#^https?://#i', $url)) continue;
  ?>
    <div class="bagian" style="padding:14px">
      <div class="isi">
        <h3 style="margin:0"><a href="<?= e($url) ?>" target="_blank" rel="noopener"><?= e($l['judul'] ?? $url) ?></a></h3>
        <?php if (!empty($l['ket'])): ?>
          <p class="muted small" style="margin:2px 0 0"><?= e($l['ket']) ?></p>
        <?php endif; ?>
      </div>
    </div>
  <?php endforeach; ?>
</div>
<?php endif; ?>

<div class="card tight">
  <div class="row">
    <a class="btn ghost blok" href="cari.php">Cari materi</a>
    <a class="btn ghost blok" href="faq.php">FAQ</a>
    <a class="btn ghost blok" href="tanya.php">Tanya Admin</a>
  </div>
</div>

<?php foot_html();
