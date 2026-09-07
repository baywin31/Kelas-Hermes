<?php
// admin_member.php — Daftar member, pencarian, dan ubah status tier (Reguler <-> VIP/Premium)
declare(strict_types=1);
require __DIR__ . '/_boot.php';

$admin = require_admin();
$pdo = db();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $aksi = (string)($_POST['aksi'] ?? '');

    if ($aksi === 'ubah_tier') {
        $uid = (int)($_POST['user_id'] ?? 0);
        $tierBaru = in_array($_POST['tier'] ?? '', ['reguler', 'premium'], true) ? $_POST['tier'] : 'reguler';

        if ($uid > 0) {
            $st = $pdo->prepare('UPDATE ' . t('users') . ' SET tier = ? WHERE id = ? AND role = "member"');
            $st->execute([$tierBaru, $uid]);
            audit('member_tier_ubah', (int)$admin['id'], "user_id=$uid tier=$tierBaru");
            flash_set('ok', "Status member #$uid berhasil diubah menjadi: " . strtoupper($tierBaru));
        }
        redirect('admin_member.php');
    }
}

$q = trim((string)($_GET['q'] ?? ''));
$tierFilter = (string)($_GET['tier'] ?? 'semua');

$sql = 'SELECT u.id, u.nama, u.email, u.tier, u.created_at, u.last_login, c.kode, c.batch
        FROM ' . t('users') . ' u
        LEFT JOIN ' . t('codes') . ' c ON u.kode_id = c.id
        WHERE u.role = "member"';
$args = [];

if ($q !== '') {
    $sql .= ' AND (u.nama LIKE ? OR u.email LIKE ? OR c.kode LIKE ?)';
    array_push($args, "%$q%", "%$q%", "%$q%");
}

if ($tierFilter === 'reguler') {
    $sql .= ' AND (u.tier = "reguler" OR u.tier IS NULL)';
} elseif ($tierFilter === 'premium') {
    $sql .= ' AND u.tier = "premium"';
}

$sql .= ' ORDER BY u.id DESC LIMIT 200';
$st = $pdo->prepare($sql);
$st->execute($args);
$members = $st->fetchAll();

head_html('Kelola Member', true);
?>
<p class="small muted" style="margin:0 0 14px"><a href="admin.php">Panel Admin</a> › Member</p>

<div class="card">
  <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
    <div>
      <h1 style="margin:0 0 4px">Daftar Member</h1>
      <p class="sub" style="margin:0">Kelola status tier (Reguler atau VIP/Premium) tanpa perlu pembeli daftar ulang.</p>
    </div>
  </div>
</div>

<div class="card">
  <form method="get">
    <div class="row">
      <div style="flex:2">
        <label for="q">Cari Member</label>
        <input id="q" name="q" value="<?= e($q) ?>" placeholder="Nama, email, atau kode redeem">
      </div>
      <div style="flex:1">
        <label for="tier">Filter Tier</label>
        <select id="tier" name="tier">
          <option value="semua" <?= $tierFilter === 'semua' ? 'selected' : '' ?>>Semua Member</option>
          <option value="reguler" <?= $tierFilter === 'reguler' ? 'selected' : '' ?>>Reguler Saja</option>
          <option value="premium" <?= $tierFilter === 'premium' ? 'selected' : '' ?>>⭐ VIP / Premium Saja</option>
        </select>
      </div>
      <div style="display:flex;align-items:flex-end;gap:8px">
        <button class="btn" type="submit">Terapkan</button>
        <a class="btn ghost" href="admin_member.php">Reset</a>
      </div>
    </div>
  </form>

  <p class="hint" style="margin:14px 0">
    <?= count($members) ?> member ditemukan.
  </p>

  <?php if (!$members): ?>
    <p class="muted">Belum ada data member yang cocok.</p>
  <?php else: ?>
    <table class="data">
      <tr>
        <th>ID</th>
        <th>Nama & Email</th>
        <th>Status Tier Saat Ini</th>
        <th>Aksi Ubah Tier</th>
        <th>Kode Awal</th>
        <th>Bergabung</th>
      </tr>
      <?php foreach ($members as $m): 
          $tKini = ($m['tier'] ?? 'reguler') === 'premium' ? 'premium' : 'reguler';
      ?>
        <tr>
          <td><?= (int)$m['id'] ?></td>
          <td>
            <strong><?= e($m['nama']) ?></strong><br>
            <span class="mono small muted"><?= e($m['email']) ?></span>
          </td>
          <td>
            <span class="pill <?= $tKini === 'premium' ? 'ok' : '' ?>">
              <?= $tKini === 'premium' ? '⭐ VIP / Premium' : 'Reguler' ?>
            </span>
          </td>
          <td>
            <form method="post" style="margin:0;display:flex;align-items:center;gap:6px">
              <?= csrf_field() ?>
              <input type="hidden" name="aksi" value="ubah_tier">
              <input type="hidden" name="user_id" value="<?= (int)$m['id'] ?>">
              <select name="tier" style="padding:6px 10px;font-size:13px;border-radius:6px;background:var(--bg-soft,#2b2f32);color:var(--fg,#f2f7fc);border:1px solid rgba(255,255,255,.14)">
                <option value="reguler" <?= $tKini === 'reguler' ? 'selected' : '' ?>>Reguler</option>
                <option value="premium" <?= $tKini === 'premium' ? 'selected' : '' ?>>⭐ Premium</option>
              </select>
              <button class="btn ghost small" type="submit" style="min-height:32px;padding:4px 10px">Simpan</button>
            </form>
          </td>
          <td class="small mono muted">
            <?= $m['kode'] ? e($m['kode']) : '—' ?>
            <?= $m['batch'] ? '<br>(' . e($m['batch']) . ')' : '' ?>
          </td>
          <td class="small muted">
            <?= e(date('j M Y', strtotime((string)$m['created_at']))) ?>
          </td>
        </tr>
      <?php endforeach; ?>
    </table>
  <?php endif; ?>
</div>

<?php foot_html(); ?>
