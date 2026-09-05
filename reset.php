<?php
// reset.php — pasang password baru dari tautan reset.
declare(strict_types=1);
require __DIR__ . '/_boot.php';

$token = (string)($_GET['t'] ?? $_POST['t'] ?? '');
$err   = '';
$valid = false;
$uid   = 0;

if ($token !== '' && preg_match('/^[a-f0-9]{64}$/', $token)) {
    $st = db()->prepare('SELECT id, user_id FROM ' . t('resets') . '
        WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()');
    $st->execute([hash('sha256', $token)]);
    if ($row = $st->fetch()) {
        $valid  = true;
        $uid    = (int)$row['user_id'];
        $resetId = (int)$row['id'];
    }
}

if ($valid && $_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $baru  = (string)($_POST['baru'] ?? '');
    $ulang = (string)($_POST['ulang'] ?? '');

    if (strlen($baru) < 8) {
        $err = 'Password minimal 8 karakter.';
    } elseif ($baru !== $ulang) {
        $err = 'Dua kolom password belum sama.';
    } else {
        $pdo = db();
        $pdo->beginTransaction();
        try {
            $pdo->prepare('UPDATE ' . t('users') . ' SET pass_hash = ? WHERE id = ?')
                ->execute([pw_hash($baru), $uid]);
            // Token hanya sekali pakai.
            $pdo->prepare('UPDATE ' . t('resets') . ' SET used_at = NOW() WHERE id = ?')
                ->execute([$resetId]);
            // Batalkan token lain yang masih menganggur untuk user ini.
            $pdo->prepare('UPDATE ' . t('resets') . '
                SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL')
                ->execute([$uid]);
            $pdo->commit();
            audit('reset_sukses', $uid);
            flash_set('ok', 'Password baru aktif. Silakan masuk.');
            redirect('login.php');
        } catch (Throwable $e) {
            $pdo->rollBack();
            $err = 'Gagal menyimpan. Coba lagi.';
        }
    }
    if ($err !== '') http_response_code(400);
}

head_html('Password baru');
?>
<div class="card" style="max-width:460px;margin:0 auto">
  <h1>Buat password baru</h1>

  <?php if (!$valid): ?>
    <div class="flash err">
      Tautan tidak berlaku — mungkin sudah dipakai, sudah lewat 1 jam, atau salah ketik.
    </div>
    <p style="margin-top:16px">
      <a class="btn blok" href="lupa.php">Minta tautan baru</a>
    </p>
  <?php else: ?>
    <p class="sub">Pilih password yang belum pernah kamu pakai di tempat lain.</p>
    <?php if ($err !== ''): ?><div class="flash err"><?= e($err) ?></div><?php endif; ?>
    <form method="post" novalidate>
      <?= csrf_field() ?>
      <input type="hidden" name="t" value="<?= e($token) ?>">
      <label for="baru">Password baru (min 8 karakter)</label>
      <input id="baru" name="baru" type="password" required minlength="8" autocomplete="new-password">
      <label for="ulang">Ulangi password baru</label>
      <input id="ulang" name="ulang" type="password" required minlength="8" autocomplete="new-password">
      <p style="margin-top:18px"><button class="btn blok" type="submit">Simpan password baru</button></p>
    </form>
  <?php endif; ?>
</div>
<?php foot_html();
