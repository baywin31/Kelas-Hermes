<?php
// index.php — halaman depan: arahkan ke redeem atau login.
declare(strict_types=1);
require __DIR__ . '/_boot.php';

if (current_user()) {
    redirect('dashboard.php');
}

try {
    $rows = db()->query('SELECT urutan, judul, ringkas FROM ' . t('content') . ' ORDER BY urutan')->fetchAll();
} catch (Throwable $e) {
    $rows = [];
}

head_html('Member area');
?>
<section class="hero">
  <span class="eyebrow">Member area · akses selamanya</span>
  <h1>Kelas <?= e(COURSE_NAME) ?></h1>
  <p class="sub">
    Sudah beli kelasnya? Tukarkan kode akses yang kamu terima setelah pembayaran,
    buat akunmu sendiri, dan langsung mulai belajar.
  </p>
  <div class="hero-aksi">
    <a class="btn" href="redeem.php">Tukarkan kode akses</a>
    <a class="btn ghost" href="login.php">Sudah punya akun</a>
  </div>
</section>

<section class="card">
  <h2 style="margin-top:0">Isi kelasnya</h2>
  <?php if (!$rows): ?>
    <p class="muted">Materi belum disiapkan. Kalau kamu admin, jalankan
      <span class="mono">setup.php</span> dulu.</p>
  <?php else: ?>
    <?php foreach ($rows as $r): ?>
      <div class="bagian">
        <div class="no"><?= (int)$r['urutan'] ?></div>
        <div class="isi">
          <h3><?= e($r['judul']) ?></h3>
          <p class="muted small" style="margin:0"><?= e($r['ringkas']) ?></p>
        </div>
      </div>
    <?php endforeach; ?>
  <?php endif; ?>
  <p class="hint">Isi lengkap tiap Bagian terbuka setelah kode akses ditukarkan.</p>
</section>

<section class="fitur">
  <div class="fitur-item">
    <b>Akses permanen</b>
    <span>Sekali redeem, akunmu tetap hidup — termasuk materi yang ditambahkan nanti.</span>
  </div>
  <div class="fitur-item">
    <b>Komunitas Telegram</b>
    <span>Tanya-jawab langsung dan pengumuman tiap ada materi baru.</span>
  </div>
  <div class="fitur-item">
    <b>Catatan &amp; progres</b>
    <span>Tandai Bagian yang selesai dan simpan catatanmu di tiap materi.</span>
  </div>
</section>
<?php foot_html();
