<?php
// login.php — masuk dengan email + password.
declare(strict_types=1);
require __DIR__ . '/_boot.php';

if (current_user()) redirect('dashboard.php');

$err   = '';
$email = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $email = strtolower(trim((string)($_POST['email'] ?? '')));
    $pw    = (string)($_POST['password'] ?? '');

    // Batas login: 20 per IP / 8 per email dalam 15 menit. Hitungan dibebaskan
    // begitu login berhasil (lihat rate_reset di bawah), jadi salah ketik
    // password beberapa kali tidak menumpuk selamanya.
    $okIp    = rate_ok('login_ip', client_ip(), 20, 900);
    $okEmail = rate_ok('login_email', $email, 8, 900);

    if (!$okIp || !$okEmail) {
        $err = 'Terlalu banyak percobaan masuk. Tunggu sekitar 15 menit.';
        audit('login_ratelimit', null, $email);
        http_response_code(429);
    } else {
        $st = db()->prepare('SELECT id, pass_hash FROM ' . t('users') . ' WHERE email = ?');
        $st->execute([$email]);
        $u = $st->fetch();

        // Verifikasi selalu dijalankan (pakai hash dummy kalau user tidak ada)
        // supaya waktu respons tidak membocorkan email mana yang terdaftar.
        $hash = $u['pass_hash'] ?? '$2y$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin';
        if (password_verify($pw, $hash) && $u) {
            if (password_needs_rehash($hash, pw_algo())) {
                db()->prepare('UPDATE ' . t('users') . ' SET pass_hash = ? WHERE id = ?')
                    ->execute([pw_hash($pw), (int)$u['id']]);
            }
            session_regenerate_id(true);
            $_SESSION['uid'] = (int)$u['id'];
            // Login berhasil: bebaskan hitungan percobaan supaya salah password
            // beberapa kali tidak menyisakan blokir.
            rate_reset('login_ip', client_ip());
            rate_reset('login_email', $email);
            db()->prepare('UPDATE ' . t('users') . ' SET last_login = NOW() WHERE id = ?')
                ->execute([(int)$u['id']]);
            audit('login_sukses', (int)$u['id'], $email);

            $tujuan = $_SESSION['after_login'] ?? 'dashboard.php';
            unset($_SESSION['after_login']);
            // Hanya izinkan tujuan lokal.
            if (!preg_match('#^[a-z0-9_]+\.php(\?.*)?$#i', (string)$tujuan)) {
                $tujuan = 'dashboard.php';
            }
            redirect($tujuan);
        }
        $err = 'Email atau password salah.';
        audit('login_gagal', null, $email);
        http_response_code(401);
    }
}

head_html('Masuk');
?>
<div class="card" style="max-width:460px;margin:0 auto">
  <h1>Masuk</h1>
  <p class="sub">Sudah punya akun member.</p>

  <?php if ($err !== ''): ?><div class="flash err"><?= e($err) ?></div><?php endif; ?>

  <form method="post" novalidate>
    <?= csrf_field() ?>
    <label for="email">Email</label>
    <input id="email" name="email" type="email" required autocomplete="email"
           value="<?= e($email) ?>">

    <label for="password">Password</label>
    <input id="password" name="password" type="password" required autocomplete="current-password">

    <p style="margin-top:20px"><button class="btn blok" type="submit">Masuk</button></p>
  </form>

  <p class="hint" style="margin-top:16px">
    <a href="lupa.php">Lupa password?</a>
    <span class="sep">·</span>
    Belum punya akun? <a href="redeem.php">Redeem kode</a>.
  </p>
</div>
<?php foot_html();
