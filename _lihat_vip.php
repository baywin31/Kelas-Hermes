<?php
/*
 * _lihat_vip.php — Pratinjau Tampilan Dashboard & Modul untuk VIP vs Reguler
 * (Hanya pratinjau baca saja, tanpa merusak database)
 */
declare(strict_types=1);

$_SERVER['HTTP_HOST'] = '127.0.0.1:8813';
require __DIR__ . '/_boot.php';
require __DIR__ . '/_markdown.php';
require __DIR__ . '/_progress.php';

const KUNCI_VIP = 'vip-bd93f1a7';

if (!hash_equals(KUNCI_VIP, (string)($_GET['k'] ?? ''))) {
    http_response_code(404);
    exit('Not found');
}

header('X-Robots-Tag: noindex, nofollow');

$mode = ($_GET['view'] ?? 'vip') === 'reguler' ? 'reguler' : 'vip';

// Ambil semua bagian dan buat bagian 3/4 sebagai "Premium" untuk contoh pratinjau jika belum ada
$bagianList = bagian_semua();

// Simulasi user
$uSimulasi = [
    'nama' => $mode === 'vip' ? 'Budi (Member VIP)' : 'Andi (Member Reguler)',
    'email' => $mode === 'vip' ? 'budi.vip@demo.id' : 'andi.reg@demo.id',
    'tier' => $mode === 'vip' ? 'premium' : 'reguler',
    'role' => 'member'
];

head_html('Pratinjau Tampilan ' . strtoupper($mode));
?>

<div style="background:#35393C;border:1px solid #A4D8FF;color:#f2f7fc;padding:12px 18px;border-radius:10px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
  <div>
    <strong style="color:#A4D8FF">👁️ SIMULASI TAMPILAN MEMBER:</strong> Kamu sedang melihat tampilan sebagai <strong><?= strtoupper($mode) ?></strong>
  </div>
  <div style="display:flex;gap:8px">
    <a href="?k=<?= KUNCI_VIP ?>&view=vip" class="btn <?= $mode === 'vip' ? 'ok' : 'ghost' ?>" style="font-size:13px">Lihat Mode VIP</a>
    <a href="?k=<?= KUNCI_VIP ?>&view=reguler" class="btn <?= $mode === 'reguler' ? 'ok' : 'ghost' ?>" style="font-size:13px">Lihat Mode Reguler</a>
  </div>
</div>

<!-- SAPAAN -->
<div class="card">
  <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
    <div>
      <?php if (($uSimulasi['tier'] ?? 'reguler') === 'premium'): ?>
        <span class="pill ok" style="margin-bottom:8px;display:inline-block">⭐ Member VIP / Premium</span>
      <?php else: ?>
        <span class="eyebrow">Akses aktif · Member Reguler</span>
      <?php endif; ?>
      <h1 style="margin:4px 0 8px">Halo, <?= e($uSimulasi['nama']) ?></h1>
    </div>
    <?php if (($uSimulasi['tier'] ?? 'reguler') !== 'premium'): ?>
      <a class="btn" style="background:rgba(164,216,255,.15);color:#A4D8FF;border:1px solid rgba(164,216,255,.3);font-size:13px" href="#">
        ⭐ Upgrade ke VIP
      </a>
    <?php endif; ?>
  </div>
  <p class="sub" style="margin-bottom:0">
    Selamat datang di member area kelas <?= e(COURSE_NAME) ?>.
    Aksesmu berlaku selamanya, termasuk materi yang ditambahkan nanti.
  </p>
</div>

<!-- DAFTAR BAGIAN -->
<div class="card">
  <h2 style="margin-top:0">Materi kelas</h2>
  <?php 
  // Untuk keperluan demo visual jika belum ada materi ber-tier premium
  $idx = 1;
  foreach ($bagianList as $b):
      $no  = (int)$b['urutan'];
      // Simulasi bagian 3 & 4 jadi premium jika di database masih reguler semua
      $aksesMateri = ($no >= 3) ? 'premium' : ($b['akses'] ?? 'reguler');
      $tierUser    = $uSimulasi['tier'];
      $terkunci    = ($aksesMateri === 'premium' && $tierUser !== 'premium');
  ?>
    <div class="bagian" style="<?= $terkunci ? 'opacity:0.85;border-left:3px solid rgba(164,216,255,.4)' : '' ?>">
      <div class="no"><?= $no ?></div>
      <div class="isi">
        <h3>
          <a href="#"><?= e($b['judul']) ?></a>
          <?php if ($terkunci): ?>
            <span class="badge" style="background:rgba(164,216,255,.15);color:#A4D8FF;border:1px solid rgba(164,216,255,.3)">🔒 Khusus Premium/VIP</span>
          <?php elseif ($aksesMateri === 'premium'): ?>
            <span class="badge ok">⭐ VIP Bonus</span>
          <?php endif; ?>
        </h3>
        <p class="muted small" style="margin:0 0 8px"><?= e($b['ringkas']) ?></p>
        <?php if ($terkunci): ?>
          <span class="badge" style="background:rgba(255,255,255,.05);color:#94a3af">Terkunci</span>
        <?php else: ?>
          <span class="badge selesai">Tersedia</span>
        <?php endif; ?>
      </div>
      <div class="aksi">
        <?php if ($terkunci): ?>
          <a class="btn" style="background:rgba(164,216,255,.15);color:#A4D8FF;border:1px solid rgba(164,216,255,.3)" href="#">🔒 Buka (Upgrade)</a>
        <?php else: ?>
          <a class="btn ghost" href="#">Buka Materi</a>
        <?php endif; ?>
      </div>
    </div>
  <?php endforeach; ?>
</div>

<?php foot_html(); ?>
