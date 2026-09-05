<?php
// lupa.php — minta link reset password.
declare(strict_types=1);
require __DIR__ . '/_boot.php';

if (current_user()) redirect('dashboard.php');

$err = '';
$kirim = false;
$linkDev = '';   // hanya diisi kalau pengiriman email gagal DAN pemintanya admin

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $email = strtolower(trim((string)($_POST['email'] ?? '')));

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $err = 'Email tidak valid.';
        http_response_code(400);
    } elseif (!rate_ok('reset', $email, 3, 3600)) {
        $err = 'Sudah 3 kali dalam sejam. Coba lagi nanti.';
        audit('reset_ratelimit', null, $email);
        http_response_code(429);
    } else {
        $st = db()->prepare('SELECT id, nama FROM ' . t('users') . ' WHERE email = ?');
        $st->execute([$email]);
        $u = $st->fetch();

        if ($u) {
            $token = bin2hex(random_bytes(32));
            db()->prepare('INSERT INTO ' . t('resets') . '
                (user_id, token_hash, expires_at, created_at)
                VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR), NOW())')
                ->execute([(int)$u['id'], hash('sha256', $token)]);

            $link = rtrim(BASE_URL, '/') . '/reset.php?t=' . $token;
            $pesan = "Halo {$u['nama']},\n\n"
                   . "Ada permintaan reset password untuk akunmu di " . APP_NAME . ".\n"
                   . "Buka tautan ini untuk membuat password baru (berlaku 1 jam):\n\n"
                   . $link . "\n\n"
                   . "Kalau bukan kamu yang meminta, abaikan email ini.\n";

            $terkirim = false;
            if (MAIL_FROM !== '') {
                $headers = 'From: ' . APP_NAME . ' <' . MAIL_FROM . ">\r\n"
                         . "Content-Type: text/plain; charset=utf-8\r\n";
                $terkirim = @mail($email, 'Reset password ' . APP_NAME, $pesan, $headers);
            }

            audit($terkirim ? 'reset_email_terkirim' : 'reset_email_gagal',
                  (int)$u['id'], $terkirim ? $email : "GAGAL KIRIM — link: $link");
        } else {
            // Email tidak terdaftar: tetap tampilkan pesan sama supaya tidak
            // bisa dipakai menebak siapa saja yang jadi member.
            audit('reset_email_tidak_ada', null, $email);
        }
        $kirim = true;
    }
}

head_html('Lupa password');
?>
<div class="card" style="max-width:460px;margin:0 auto">
  <h1>Lupa password</h1>

  <?php if ($kirim): ?>
    <div class="flash ok">
      Kalau email itu terdaftar, tautan reset sudah dikirim. Berlaku 1 jam.
    </div>
    <p class="hint">
      Tidak masuk dalam 10 menit? Cek folder spam, atau hubungi admin lewat
      grup Telegram — admin bisa mengirimkan tautannya manual.
    </p>
    <p style="margin-top:18px"><a class="btn ghost blok" href="login.php">Kembali ke halaman masuk</a></p>

  <?php else: ?>
    <p class="sub">Masukkan email yang kamu pakai saat mendaftar.</p>
    <?php if ($err !== ''): ?><div class="flash err"><?= e($err) ?></div><?php endif; ?>
    <form method="post" novalidate>
      <?= csrf_field() ?>
      <label for="email">Email</label>
      <input id="email" name="email" type="email" required autocomplete="email">
      <p style="margin-top:18px"><button class="btn blok" type="submit">Kirim tautan reset</button></p>
    </form>
    <p class="hint" style="margin-top:14px"><a href="login.php">Kembali</a></p>
  <?php endif; ?>
</div>
<?php foot_html();
