<?php
// profil.php — lihat data akun, ganti nama, ganti password.
declare(strict_types=1);
require __DIR__ . '/_boot.php';

$u   = require_login();
$uid = (int)$u['id'];
$err = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $aksi = (string)($_POST['aksi'] ?? '');

    if ($aksi === 'nama') {
        $nama = trim((string)($_POST['nama'] ?? ''));
        if ($nama === '' || mb_strlen($nama) > 120) {
            $err = 'Nama wajib diisi (maksimal 120 karakter).';
        } else {
            db()->prepare('UPDATE ' . t('users') . ' SET nama = ? WHERE id = ?')
                ->execute([$nama, $uid]);
            audit('profil_nama', $uid);
            flash_set('ok', 'Nama diperbarui.');
            redirect('profil.php');
        }
    }

    if ($aksi === 'password') {
        $lama = (string)($_POST['lama'] ?? '');
        $baru = (string)($_POST['baru'] ?? '');
        $ulang = (string)($_POST['ulang'] ?? '');

        $st = db()->prepare('SELECT pass_hash FROM ' . t('users') . ' WHERE id = ?');
        $st->execute([$uid]);
        $hash = (string)$st->fetchColumn();

        if (!password_verify($lama, $hash)) {
            $err = 'Password lama salah.';
        } elseif (strlen($baru) < 8) {
            $err = 'Password baru minimal 8 karakter.';
        } elseif ($baru !== $ulang) {
            $err = 'Dua kolom password baru belum sama.';
        } else {
            db()->prepare('UPDATE ' . t('users') . ' SET pass_hash = ? WHERE id = ?')
                ->execute([pw_hash($baru), $uid]);
            audit('profil_password', $uid);
            flash_set('ok', 'Password diganti.');
            redirect('profil.php');
        }
    }
    if ($err !== '') http_response_code(400);
}

// Kode akses yang dipakai akun ini.
$st = db()->prepare('SELECT kode, redeemed_at FROM ' . t('codes') . ' WHERE redeemed_by = ?');
$st->execute([$uid]);
$kode = $st->fetch();

head_html('Profil');
?>
<?php if ($err !== ''): ?><div class="flash err"><?= e($err) ?></div><?php endif; ?>

<div class="card">
  <h1>Profil</h1>
  <table class="data">
    <tr><th style="width:150px">Nama</th><td><?= e($u['nama']) ?></td></tr>
    <tr><th>Email</th><td><?= e($u['email']) ?></td></tr>
    <tr><th>Peran</th><td><?= e($u['role']) ?></td></tr>
    <tr><th>Bergabung</th><td><?= e(date('j M Y, H:i', strtotime((string)$u['created_at']))) ?></td></tr>
    <?php if ($kode): ?>
      <tr><th>Kode akses</th><td class="mono"><?= e($kode['kode']) ?></td></tr>
      <tr><th>Ditukarkan</th><td><?= e(date('j M Y, H:i', strtotime((string)$kode['redeemed_at']))) ?></td></tr>
    <?php endif; ?>
  </table>
</div>

<div class="card">
  <h2 style="margin-top:0">Ganti nama</h2>
  <form method="post">
    <?= csrf_field() ?>
    <input type="hidden" name="aksi" value="nama">
    <label for="nama">Nama tampilan</label>
    <input id="nama" name="nama" required maxlength="120" value="<?= e($u['nama']) ?>">
    <p style="margin-top:16px"><button class="btn" type="submit">Simpan nama</button></p>
  </form>
</div>

<div class="card">
  <h2 style="margin-top:0">Ganti password</h2>
  <form method="post">
    <?= csrf_field() ?>
    <input type="hidden" name="aksi" value="password">
    <label for="lama">Password sekarang</label>
    <input id="lama" name="lama" type="password" required autocomplete="current-password">

    <label for="baru">Password baru (min 8 karakter)</label>
    <input id="baru" name="baru" type="password" required minlength="8" autocomplete="new-password">

    <label for="ulang">Ulangi password baru</label>
    <input id="ulang" name="ulang" type="password" required minlength="8" autocomplete="new-password">

    <p style="margin-top:16px"><button class="btn" type="submit">Ganti password</button></p>
  </form>
</div>
<?php foot_html();
