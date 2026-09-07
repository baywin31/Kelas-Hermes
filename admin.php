<?php
// admin.php — ringkasan statistik + pintu ke panel lain.
declare(strict_types=1);
require __DIR__ . '/_boot.php';

require_admin();
$pdo = db();

// --- Buka blokir percobaan (rate limit) ---
// Muncul sebagai tombol kalau ada blokir aktif. Berguna saat admin sendiri
// atau pembeli telanjur terkunci setelah salah ketik kode/password.
$pesanBlokir = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['aksi'] ?? '') === 'buka_blokir') {
    csrf_check();
    $hapus = rate_clear_all();
    audit('ratelimit_dibuka', (int)($_SESSION['uid'] ?? 0), (string)$hapus . ' baris');
    $pesanBlokir = $hapus > 0
        ? "Blokir percobaan dibuka ($hapus catatan dihapus). Silakan coba lagi sekarang."
        : 'Tidak ada blokir yang aktif.';
}

try {
    $blokirAktif = (int)$pdo->query('SELECT COUNT(*) FROM ' . t('ratelimit'))->fetchColumn();
} catch (Throwable $e) { $blokirAktif = 0; }

$n = function (string $sql) use ($pdo): int {
    try { return (int)$pdo->query($sql)->fetchColumn(); } catch (Throwable $e) { return 0; }
};

$totalKode   = $n('SELECT COUNT(*) FROM ' . t('codes'));
$kodeDipakai = $n('SELECT COUNT(*) FROM ' . t('codes') . ' WHERE redeemed_by IS NOT NULL');
$kodeDicabut = $n('SELECT COUNT(*) FROM ' . t('codes') . ' WHERE revoked = 1');
$kodeSisa    = max(0, $totalKode - $kodeDipakai - $kodeDicabut);
$member      = $n('SELECT COUNT(*) FROM ' . t('users') . " WHERE role='member'");
$aktif7      = $n('SELECT COUNT(DISTINCT user_id) FROM ' . t('progress') .
                  ' WHERE updated_at > DATE_SUB(NOW(), INTERVAL 7 DAY)');
$tuntas      = $n('SELECT COUNT(*) FROM (
                     SELECT user_id FROM ' . t('progress') . " WHERE status='selesai'
                     GROUP BY user_id HAVING COUNT(*) >= (SELECT COUNT(*) FROM " . t('content') . ')
                   ) x');

// Aktivitas terbaru.
try {
    $terbaru = $pdo->query('SELECT u.nama, u.email, u.created_at
        FROM ' . t('users') . ' u WHERE u.role = "member"
        ORDER BY u.created_at DESC LIMIT 8')->fetchAll();
} catch (Throwable $e) { $terbaru = []; }

try {
    $log = $pdo->query('SELECT event, ip, detail, created_at FROM ' . t('audit') . '
        ORDER BY id DESC LIMIT 12')->fetchAll();
} catch (Throwable $e) { $log = []; }

head_html('Panel Admin', true);
?>
<div class="card">
  <h1>Panel Admin</h1>
  <p class="sub">Ringkasan kelas <?= e(COURSE_NAME) ?>.</p>

  <div class="stat">
    <div class="box"><b><?= $member ?></b><span>Member terdaftar</span></div>
    <div class="box"><b><?= $kodeSisa ?></b><span>Kode belum dipakai</span></div>
    <div class="box"><b><?= $kodeDipakai ?></b><span>Kode terpakai</span></div>
    <div class="box"><b><?= $aktif7 ?></b><span>Aktif 7 hari terakhir</span></div>
    <div class="box"><b><?= $tuntas ?></b><span>Tuntas semua Bagian</span></div>
  </div>

  <div class="row">
    <a class="btn blok" href="admin_kode.php">Kelola kode akses</a>
    <a class="btn ghost blok" href="admin_member.php">Kelola member</a>
    <a class="btn ghost blok" href="admin_materi.php">Edit materi</a>
    <a class="btn ghost blok" href="admin_setelan.php">Setelan</a>
  </div>
</div>

<div class="card">
  <h2 style="margin-top:0">Blokir percobaan</h2>
  <?php if ($pesanBlokir !== ''): ?>
    <p class="flash ok"><?= e($pesanBlokir) ?></p>
  <?php endif; ?>
  <p class="muted small">
    Setelah 15 kali salah kode dalam 15 menit (atau 10 kali gagal masuk), alamat
    IP-nya ditahan sementara. Hitungan terhapus sendiri setelah 15 menit, atau
    lewat tombol ini kalau ada pembeli yang tidak mau menunggu.
  </p>
  <p>Catatan blokir aktif sekarang: <b><?= $blokirAktif ?></b></p>
  <form method="post">
    <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
    <input type="hidden" name="aksi" value="buka_blokir">
    <button class="btn ghost" type="submit">Buka semua blokir</button>
  </form>
</div>

<div class="card">
  <h2 style="margin-top:0">Member terbaru</h2>
  <?php if (!$terbaru): ?>
    <p class="muted">Belum ada member.</p>
  <?php else: ?>
    <table class="data">
      <tr><th>Nama</th><th>Email</th><th>Bergabung</th></tr>
      <?php foreach ($terbaru as $m): ?>
        <tr>
          <td><?= e($m['nama']) ?></td>
          <td class="mono small"><?= e($m['email']) ?></td>
          <td class="small muted"><?= e(date('j M Y H:i', strtotime((string)$m['created_at']))) ?></td>
        </tr>
      <?php endforeach; ?>
    </table>
  <?php endif; ?>
</div>

<div class="card">
  <h2 style="margin-top:0">Catatan aktivitas</h2>
  <?php if (!$log): ?>
    <p class="muted">Belum ada catatan.</p>
  <?php else: ?>
    <table class="data">
      <tr><th>Waktu</th><th>Peristiwa</th><th>IP</th><th>Detail</th></tr>
      <?php foreach ($log as $l): ?>
        <tr>
          <td class="small muted"><?= e(date('j/n H:i', strtotime((string)$l['created_at']))) ?></td>
          <td class="small mono"><?= e($l['event']) ?></td>
          <td class="small muted"><?= e($l['ip']) ?></td>
          <td class="small"><?= e(mb_substr((string)$l['detail'], 0, 70)) ?></td>
        </tr>
      <?php endforeach; ?>
    </table>
  <?php endif; ?>
</div>
<?php foot_html();
