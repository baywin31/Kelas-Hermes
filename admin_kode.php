<?php
// admin_kode.php — generate, cari, filter, cabut, dan unduh kode akses.
declare(strict_types=1);
require __DIR__ . '/_boot.php';
require __DIR__ . '/_kode.php';

$admin = require_admin();
$baru  = [];   // kode hasil generate, ditampilkan sekali

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $aksi = (string)($_POST['aksi'] ?? '');

    if ($aksi === 'buat') {
        $jumlah = (int)($_POST['jumlah'] ?? 1);
        $batch  = trim((string)($_POST['batch'] ?? ''));
        $note   = trim((string)($_POST['note'] ?? ''));
        $tier   = in_array($_POST['tier'] ?? '', ['reguler', 'premium'], true) ? $_POST['tier'] : 'reguler';
        if ($jumlah < 1 || $jumlah > 500) {
            flash_set('err', 'Jumlah harus 1–500.');
        } else {
            $baru = kode_buat_banyak($jumlah, mb_substr($batch, 0, 80), mb_substr($note, 0, 190), $tier);
            audit('kode_buat', (int)$admin['id'], count($baru) . " kode, batch=$batch tier=$tier");
            flash_set('ok', count($baru) . " kode ($tier) dibuat. Salin sekarang — daftar ini tidak muncul lagi.");
        }
    }

    if ($aksi === 'cabut') {
        $id = (int)($_POST['id'] ?? 0);
        $st = db()->prepare('UPDATE ' . t('codes') . '
            SET revoked = 1 WHERE id = ? AND redeemed_by IS NULL');
        $st->execute([$id]);
        if ($st->rowCount() > 0) {
            audit('kode_cabut', (int)$admin['id'], "id=$id");
            flash_set('ok', 'Kode dicabut.');
        } else {
            flash_set('err', 'Kode tidak bisa dicabut — mungkin sudah dipakai.');
        }
        redirect('admin_kode.php');
    }
}

// ---------- Filter & daftar ----------
$q      = trim((string)($_GET['q'] ?? ''));
$status = (string)($_GET['status'] ?? 'semua');
$batch  = trim((string)($_GET['batch'] ?? ''));

$where = [];
$args  = [];

if ($q !== '') {
    $norm = kode_normalize($q);
    $where[] = '(c.kode LIKE ? OR c.note LIKE ? OR u.email LIKE ? OR u.nama LIKE ?' .
               ($norm ? ' OR c.kode = ?' : '') . ')';
    array_push($args, "%$q%", "%$q%", "%$q%", "%$q%");
    if ($norm) $args[] = $norm;
}
if ($batch !== '') { $where[] = 'c.batch = ?'; $args[] = $batch; }
if ($status === 'dipakai')  $where[] = 'c.redeemed_by IS NOT NULL';
if ($status === 'belum')    $where[] = 'c.redeemed_by IS NULL AND c.revoked = 0';
if ($status === 'dicabut')  $where[] = 'c.revoked = 1';

$sql = 'SELECT c.*, u.nama, u.email FROM ' . t('codes') . ' c
        LEFT JOIN ' . t('users') . ' u ON u.id = c.redeemed_by';
if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
$sql .= ' ORDER BY c.id DESC LIMIT 300';

$st = db()->prepare($sql);
$st->execute($args);
$rows = $st->fetchAll();

// Daftar batch untuk dropdown.
try {
    $batches = db()->query('SELECT DISTINCT batch FROM ' . t('codes') . '
        WHERE batch <> "" ORDER BY batch')->fetchAll(PDO::FETCH_COLUMN);
} catch (Throwable $e) { $batches = []; }

head_html('Kelola kode', true);
?>
<p class="small muted" style="margin:0 0 14px"><a href="admin.php">Panel Admin</a> › Kode akses</p>

<?php if ($baru): ?>
<div class="card">
  <h2 style="margin-top:0"><?= count($baru) ?> kode baru</h2>
  <p class="sub">Salin dan simpan sekarang. Daftar ini tidak ditampilkan lagi.</p>
  <textarea id="kode-baru" readonly rows="<?= min(14, count($baru) + 1) ?>"
            class="mono"><?= e(implode("\n", $baru)) ?></textarea>
  <p style="margin-top:12px">
    <button class="btn" type="button" data-salin="#kode-baru">Salin semua</button>
    <a class="btn ghost" href="admin_kode_csv.php?batch=<?= urlencode((string)($_POST['batch'] ?? '')) ?>">Unduh CSV batch ini</a>
  </p>
</div>
<?php endif; ?>

<div class="card">
  <h2 style="margin-top:0">Buat kode baru</h2>
  <form method="post">
    <?= csrf_field() ?>
    <input type="hidden" name="aksi" value="buat">
    <div class="row">
      <div>
        <label for="jumlah">Jumlah (1–500)</label>
        <input id="jumlah" name="jumlah" type="number" min="1" max="500" value="10" required>
      </div>
      <div>
        <label for="tier">Tingkat Akses (Tier)</label>
        <select id="tier" name="tier" style="width:100%;padding:10px;border-radius:8px;background:var(--bg-soft,#2b2f32);color:var(--fg,#f2f7fc);border:1px solid rgba(255,255,255,.14)">
          <option value="reguler">Reguler (Normal)</option>
          <option value="premium">⭐ Premium / VVIP</option>
        </select>
      </div>
      <div>
        <label for="batch">Label batch</label>
        <input id="batch" name="batch" maxlength="80" placeholder="mis. September-Lynk">
      </div>
      <div>
        <label for="note">Catatan (opsional)</label>
        <input id="note" name="note" maxlength="190" placeholder="mis. promo bundling">
      </div>
    </div>
    <p style="margin-top:16px"><button class="btn" type="submit">Generate</button></p>
  </form>
</div>

<div class="card">
  <h2 style="margin-top:0">Daftar kode</h2>
  <form method="get">
    <div class="row">
      <div>
        <label for="q">Cari</label>
        <input id="q" name="q" value="<?= e($q) ?>" placeholder="kode, email, atau nama">
      </div>
      <div>
        <label for="status">Status</label>
        <select id="status" name="status">
          <?php foreach (['semua' => 'Semua', 'belum' => 'Belum dipakai',
                          'dipakai' => 'Sudah dipakai', 'dicabut' => 'Dicabut'] as $k => $v): ?>
            <option value="<?= $k ?>" <?= $status === $k ? 'selected' : '' ?>><?= $v ?></option>
          <?php endforeach; ?>
        </select>
      </div>
      <div>
        <label for="batchf">Batch</label>
        <select id="batchf" name="batch">
          <option value="">Semua batch</option>
          <?php foreach ($batches as $b): ?>
            <option value="<?= e($b) ?>" <?= $batch === $b ? 'selected' : '' ?>><?= e($b) ?></option>
          <?php endforeach; ?>
        </select>
      </div>
      <div style="display:flex;align-items:flex-end;gap:8px">
        <button class="btn" type="submit">Terapkan</button>
        <a class="btn ghost" href="admin_kode.php">Reset</a>
      </div>
    </div>
  </form>

  <p class="hint" style="margin:14px 0">
    <?= count($rows) ?> baris ditampilkan (maks 300).
    <a href="admin_kode_csv.php?<?= http_build_query(['q' => $q, 'status' => $status, 'batch' => $batch]) ?>">Unduh CSV hasil filter ini</a>
  </p>

  <?php if (!$rows): ?>
    <p class="muted">Tidak ada kode yang cocok.</p>
  <?php else: ?>
    <table class="data">
      <tr><th>Kode</th><th>Akses</th><th>Status</th><th>Dipakai oleh</th><th>Batch</th><th>Dibuat</th><th></th></tr>
      <?php foreach ($rows as $r): ?>
        <tr>
          <td class="mono"><?= e($r['kode']) ?></td>
          <td>
            <span class="pill <?= ($r['tier'] ?? 'reguler') === 'premium' ? 'ok' : '' ?>">
              <?= ($r['tier'] ?? 'reguler') === 'premium' ? '⭐ Premium' : 'Reguler' ?>
            </span>
          </td>
          <td>
            <?php if ((int)$r['revoked'] === 1): ?>
              <span class="badge belum">Dicabut</span>
            <?php elseif ($r['redeemed_by']): ?>
              <span class="badge selesai">Dipakai</span>
            <?php else: ?>
              <span class="badge mulai">Tersedia</span>
            <?php endif; ?>
          </td>
          <td class="small">
            <?php if ($r['redeemed_by']): ?>
              <?= e((string)$r['nama']) ?><br>
              <span class="muted mono"><?= e((string)$r['email']) ?></span>
            <?php else: ?><span class="muted">—</span><?php endif; ?>
          </td>
          <td class="small muted"><?= e((string)$r['batch']) ?></td>
          <td class="small muted"><?= e(date('j/n/y', strtotime((string)$r['created_at']))) ?></td>
          <td>
            <?php if (!$r['redeemed_by'] && (int)$r['revoked'] === 0): ?>
              <form method="post" style="margin:0"
                    data-konfirmasi="Cabut kode <?= e($r['kode']) ?>? Tidak bisa dipakai lagi.">
                <?= csrf_field() ?>
                <input type="hidden" name="aksi" value="cabut">
                <input type="hidden" name="id" value="<?= (int)$r['id'] ?>">
                <button class="btn ghost small" type="submit" style="min-height:36px;padding:6px 12px">Cabut</button>
              </form>
            <?php endif; ?>
          </td>
        </tr>
      <?php endforeach; ?>
    </table>
  <?php endif; ?>
</div>
<?php foot_html();
