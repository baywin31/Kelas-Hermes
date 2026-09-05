<?php
// redeem.php — langkah 1: validasi kode. Langkah 2: form buat akun.
declare(strict_types=1);
require __DIR__ . '/_boot.php';
require __DIR__ . '/_kode.php';

if (current_user()) redirect('dashboard.php');

$tahap  = 'kode';          // 'kode' | 'akun'
$kodeOk = '';
$err    = '';
$isi    = ['nama' => '', 'email' => ''];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $aksi = (string)($_POST['aksi'] ?? 'cek');

    // ---------------- Tahap 1: cek kode ----------------
    if ($aksi === 'cek') {
        // Batas 15 percobaan / 15 menit. Cukup longgar untuk orang yang salah
        // ketik berkali-kali, tapi tetap menahan percobaan menebak kode.
        if (!rate_ok('redeem', client_ip(), 15, 900)) {
            $err = 'Terlalu banyak percobaan. Coba lagi sekitar 15 menit, '
                 . 'atau hubungi admin lewat <a href="tanya.php">Tanya Admin</a>.';
            audit('redeem_ratelimit', null, client_ip());
        } else {
            $norm = kode_normalize((string)($_POST['kode'] ?? ''));
            if ($norm === null) {
                $err = 'Format kode tidak sesuai. Contoh: HRMS-A2B3-C4D5-E6F7';
            } else {
                switch (kode_status($norm)) {
                    case 'ok':
                        $tahap  = 'akun';
                        $kodeOk = $norm;
                        // Kode benar: bebaskan hitungan supaya salah ketik
                        // sebelumnya tidak menghalangi pendaftaran.
                        rate_reset('redeem', client_ip());
                        break;
                    case 'sudah_dipakai':
                        $err = 'Kode ini sudah dipakai untuk membuat akun. Silakan <a href="login.php">masuk</a>.';
                        break;
                    case 'dicabut':
                        $err = 'Kode ini sudah tidak berlaku. Hubungi admin.';
                        break;
                    default:
                        $err = 'Kode tidak ditemukan. Periksa lagi ketikannya.';
                }
                if ($err !== '') audit('redeem_gagal', null, $norm);
            }
        }
        if ($err !== '') http_response_code(400);
    }

    // ---------------- Tahap 2: buat akun ----------------
    if ($aksi === 'daftar') {
        $norm = kode_normalize((string)($_POST['kode'] ?? ''));
        $isi['nama']  = trim((string)($_POST['nama'] ?? ''));
        $isi['email'] = strtolower(trim((string)($_POST['email'] ?? '')));
        $pw  = (string)($_POST['password'] ?? '');
        $pw2 = (string)($_POST['password2'] ?? '');

        $tahap  = 'akun';
        $kodeOk = $norm ?? '';

        if ($norm === null || kode_status($norm) !== 'ok') {
            $tahap = 'kode';
            $err   = 'Kode sudah tidak berlaku. Mulai lagi dari awal.';
        } elseif ($isi['nama'] === '' || mb_strlen($isi['nama']) > 120) {
            $err = 'Nama wajib diisi (maksimal 120 karakter).';
        } elseif (!filter_var($isi['email'], FILTER_VALIDATE_EMAIL)) {
            $err = 'Email tidak valid.';
        } elseif (strlen($pw) < 8) {
            $err = 'Password minimal 8 karakter.';
        } elseif ($pw !== $pw2) {
            $err = 'Dua kolom password belum sama.';
        } else {
            $pdo = db();
            try {
                $pdo->beginTransaction();

                // Kunci baris kode supaya dua orang tidak bisa menukar kode yang sama.
                $st = $pdo->prepare('SELECT id, redeemed_by, revoked FROM ' . t('codes') .
                                    ' WHERE kode = ? FOR UPDATE');
                $st->execute([$norm]);
                $row = $st->fetch();

                if (!$row || (int)$row['revoked'] === 1 || !empty($row['redeemed_by'])) {
                    $pdo->rollBack();
                    $tahap = 'kode';
                    $err   = 'Kode baru saja dipakai. Kalau itu kamu, silakan <a href="login.php">masuk</a>.';
                } else {
                    $ins = $pdo->prepare('INSERT INTO ' . t('users') . '
                        (nama, email, pass_hash, role, kode_id, created_at)
                        VALUES (?, ?, ?, "member", ?, NOW())');
                    $ins->execute([$isi['nama'], $isi['email'], pw_hash($pw), (int)$row['id']]);
                    $uid = (int)$pdo->lastInsertId();

                    $pdo->prepare('UPDATE ' . t('codes') . '
                        SET redeemed_by = ?, redeemed_at = NOW() WHERE id = ?')
                        ->execute([$uid, (int)$row['id']]);

                    $pdo->commit();

                    session_regenerate_id(true);
                    $_SESSION['uid'] = $uid;
                    audit('redeem_sukses', $uid, $norm);
                    flash_set('ok', 'Akun aktif. Selamat belajar!');
                    redirect('dashboard.php');
                }
            } catch (PDOException $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                // 23000 = pelanggaran UNIQUE (email sudah dipakai / kode kebalap)
                if ($e->getCode() === '23000') {
                    $err = 'Email itu sudah terdaftar. Silakan <a href="login.php">masuk</a> atau pakai email lain.';
                } else {
                    $err = 'Terjadi kesalahan di server. Coba lagi sebentar.';
                }
            }
        }
        if ($err !== '') http_response_code(400);
    }
}

head_html('Redeem kode');
?>
<div class="card" style="max-width:520px;margin:0 auto">
  <?php if ($err !== ''): ?>
    <div class="flash err"><?= $err /* sudah aman: hanya link statis yang disisipkan */ ?></div>
  <?php endif; ?>

  <?php if ($tahap === 'kode'): ?>
    <h1>Masukkan kode akses</h1>
    <p class="sub">Kode dikirim setelah pembayaran, formatnya HRMS-XXXX-XXXX-XXXX.</p>
    <form method="post" novalidate>
      <?= csrf_field() ?>
      <input type="hidden" name="aksi" value="cek">
      <label for="kode">Kode akses</label>
      <input class="kode-input" id="kode" name="kode" required autocomplete="off"
             spellcheck="false" placeholder="HRMS-____-____-____"
             value="<?= e((string)($_POST['kode'] ?? '')) ?>">
      <p class="hint">Huruf besar/kecil tidak masalah, tanda hubung otomatis dirapikan.</p>
      <p style="margin-top:18px"><button class="btn blok" type="submit">Cek kode</button></p>
    </form>
    <p class="hint" style="margin-top:16px">Sudah pernah daftar? <a href="login.php">Masuk</a>.</p>
    <?php $waKode = wa_link('Halo admin, saya sudah bayar tapi kode akses ' . APP_NAME . ' saya belum bisa dipakai. Mohon dibantu.'); ?>
    <?php if ($waKode !== ''): ?>
      <p class="hint" style="margin-top:6px">Kode bermasalah atau belum dapat?
        <a href="<?= e($waKode) ?>" target="_blank" rel="noopener">Chat admin di WhatsApp</a>.</p>
    <?php endif; ?>

  <?php else: ?>
    <h1>Buat akunmu</h1>
    <p class="sub">Kode <span class="mono"><?= e($kodeOk) ?></span> valid. Lengkapi data di bawah.</p>
    <form method="post" novalidate>
      <?= csrf_field() ?>
      <input type="hidden" name="aksi" value="daftar">
      <input type="hidden" name="kode" value="<?= e($kodeOk) ?>">

      <label for="nama">Nama</label>
      <input id="nama" name="nama" required maxlength="120" value="<?= e($isi['nama']) ?>">

      <label for="email">Email</label>
      <input id="email" name="email" type="email" required maxlength="190"
             autocomplete="email" value="<?= e($isi['email']) ?>">
      <p class="hint">Dipakai untuk masuk dan memulihkan password.</p>

      <label for="password">Password (min 8 karakter)</label>
      <input id="password" name="password" type="password" required minlength="8"
             autocomplete="new-password">

      <label for="password2">Ulangi password</label>
      <input id="password2" name="password2" type="password" required minlength="8"
             autocomplete="new-password">

      <p style="margin-top:20px"><button class="btn blok" type="submit">Aktifkan akun</button></p>
    </form>
  <?php endif; ?>
</div>
<?php foot_html();
