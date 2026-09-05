<?php
// setup.php — bikin tabel + seed materi + akun admin pertama.
// Aman dijalankan berulang (CREATE TABLE IF NOT EXISTS / INSERT IGNORE).
// HAPUS file ini setelah instalasi selesai.

declare(strict_types=1);
require __DIR__ . '/_boot.php';
require __DIR__ . '/_kode.php';

$sudahAdaAdmin = false;
try {
    $sudahAdaAdmin = (bool)db()->query(
        'SELECT 1 FROM ' . t('users') . " WHERE role='admin' LIMIT 1"
    )->fetchColumn();
} catch (Throwable $e) {
    // tabel belum ada — normal saat instalasi pertama
}

$log = [];

function jalankan(string $sql, array &$log, string $label): void
{
    try {
        db()->exec($sql);
        $log[] = ['ok', $label];
    } catch (Throwable $e) {
        $log[] = ['err', $label . ' — ' . $e->getMessage()];
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Kalau admin sudah ada, form ini butuh login admin supaya tidak bisa
    // dipakai orang lain menimpa instalasi.
    if ($sudahAdaAdmin) {
        require_admin();
        csrf_check();
    }

    $eng = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';

    jalankan('CREATE TABLE IF NOT EXISTS ' . t('users') . ' (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        nama VARCHAR(120) NOT NULL,
        email VARCHAR(190) NOT NULL,
        pass_hash VARCHAR(255) NOT NULL,
        role ENUM("member","admin") NOT NULL DEFAULT "member",
        kode_id INT UNSIGNED NULL,
        created_at DATETIME NOT NULL,
        last_login DATETIME NULL,
        UNIQUE KEY uq_email (email),
        UNIQUE KEY uq_kode (kode_id)
    ) ' . $eng, $log, 'tabel users');

    jalankan('CREATE TABLE IF NOT EXISTS ' . t('codes') . ' (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        kode CHAR(19) NOT NULL,
        batch VARCHAR(80) NOT NULL DEFAULT "",
        note VARCHAR(190) NOT NULL DEFAULT "",
        revoked TINYINT(1) NOT NULL DEFAULT 0,
        redeemed_by INT UNSIGNED NULL,
        redeemed_at DATETIME NULL,
        created_at DATETIME NOT NULL,
        UNIQUE KEY uq_kode (kode),
        UNIQUE KEY uq_redeemer (redeemed_by),
        KEY idx_batch (batch)
    ) ' . $eng, $log, 'tabel codes');

    jalankan('CREATE TABLE IF NOT EXISTS ' . t('content') . ' (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        urutan INT NOT NULL,
        judul VARCHAR(190) NOT NULL,
        ringkas VARCHAR(255) NOT NULL DEFAULT "",
        isi_md MEDIUMTEXT NOT NULL,
        updated_at DATETIME NOT NULL,
        UNIQUE KEY uq_urutan (urutan)
    ) ' . $eng, $log, 'tabel content');

    jalankan('CREATE TABLE IF NOT EXISTS ' . t('progress') . ' (
        user_id INT UNSIGNED NOT NULL,
        bagian INT NOT NULL,
        status ENUM("belum","mulai","selesai") NOT NULL DEFAULT "belum",
        updated_at DATETIME NOT NULL,
        PRIMARY KEY (user_id, bagian)
    ) ' . $eng, $log, 'tabel progress');

    jalankan('CREATE TABLE IF NOT EXISTS ' . t('notes') . ' (
        user_id INT UNSIGNED NOT NULL,
        bagian INT NOT NULL,
        isi MEDIUMTEXT NOT NULL,
        updated_at DATETIME NOT NULL,
        PRIMARY KEY (user_id, bagian)
    ) ' . $eng, $log, 'tabel notes');

    jalankan('CREATE TABLE IF NOT EXISTS ' . t('visits') . ' (
        user_id INT UNSIGNED NOT NULL,
        bagian INT NOT NULL,
        last_seen DATETIME NOT NULL,
        PRIMARY KEY (user_id, bagian)
    ) ' . $eng, $log, 'tabel visits');

    jalankan('CREATE TABLE IF NOT EXISTS ' . t('resets') . ' (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        token_hash CHAR(64) NOT NULL,
        expires_at DATETIME NOT NULL,
        used_at DATETIME NULL,
        created_at DATETIME NOT NULL,
        UNIQUE KEY uq_token (token_hash),
        KEY idx_user (user_id)
    ) ' . $eng, $log, 'tabel resets');

    jalankan('CREATE TABLE IF NOT EXISTS ' . t('settings') . ' (
        k VARCHAR(80) NOT NULL PRIMARY KEY,
        v TEXT NOT NULL
    ) ' . $eng, $log, 'tabel settings');

    jalankan('CREATE TABLE IF NOT EXISTS ' . t('ratelimit') . ' (
        id VARCHAR(190) NOT NULL PRIMARY KEY,
        hits INT UNSIGNED NOT NULL DEFAULT 0,
        started BIGINT NOT NULL
    ) ' . $eng, $log, 'tabel ratelimit');

    jalankan('CREATE TABLE IF NOT EXISTS ' . t('audit') . ' (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        event VARCHAR(60) NOT NULL,
        user_id INT UNSIGNED NULL,
        ip VARCHAR(45) NOT NULL DEFAULT "",
        detail VARCHAR(500) NOT NULL DEFAULT "",
        created_at DATETIME NOT NULL,
        KEY idx_event (event),
        KEY idx_created (created_at)
    ) ' . $eng, $log, 'tabel audit');

    // ---------- Seed 4 Bagian ----------
    require __DIR__ . '/_seed.php';
    seed_materi($log);

    // ---------- Setelan awal ----------
    if (!setting('telegram_url')) setting_put('telegram_url', TELEGRAM_URL);
    // Nomor WA diambil dari _config.php kalau ada, supaya tombol chat langsung
    // hidup begitu dipasang tanpa harus mampir ke halaman setelan.
    if (!setting('wa_nomor') && defined('WA_NOMOR') && WA_NOMOR !== '') {
        setting_put('wa_nomor', wa_normal(WA_NOMOR));
    }
    if (!setting('faq_md'))       setting_put('faq_md', seed_faq_md());
    if (!setting('links_json'))   setting_put('links_json', seed_links_json());
    $log[] = ['ok', 'setelan awal'];

    // ---------- Admin pertama ----------
    $nama  = trim((string)($_POST['nama'] ?? ''));
    $email = strtolower(trim((string)($_POST['email'] ?? '')));
    $pw    = (string)($_POST['password'] ?? '');

    if (!$sudahAdaAdmin) {
        if ($nama === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($pw) < 8) {
            $log[] = ['err', 'Admin belum dibuat: nama/email/password (min 8 karakter) tidak valid'];
        } else {
            try {
                db()->prepare('INSERT INTO ' . t('users') . '
                    (nama, email, pass_hash, role, created_at)
                    VALUES (?, ?, ?, "admin", NOW())')
                    ->execute([$nama, $email, pw_hash($pw)]);
                $log[] = ['ok', 'admin dibuat: ' . $email];
            } catch (PDOException $e) {
                $log[] = ['err', 'admin gagal dibuat — ' . $e->getMessage()];
            }
        }
    }
    $selesai = true;
}

head_html('Setup');
?>
<div class="card">
  <h1>Setup Karyawan Digital</h1>

  <?php if (!empty($selesai)): ?>
    <p class="sub">Hasil instalasi:</p>
    <table class="data">
      <?php foreach ($log as [$st, $msg]): ?>
        <tr>
          <td style="width:70px"><?= $st === 'ok'
            ? '<span class="badge selesai">OK</span>'
            : '<span class="badge" style="background:#2b1416;color:#ffb3b3;border:1px solid #6d2a2f">GAGAL</span>' ?></td>
          <td><?= e($msg) ?></td>
        </tr>
      <?php endforeach; ?>
    </table>
    <p style="margin-top:20px">
      <a class="btn" href="login.php">Masuk sebagai admin</a>
      <a class="btn ghost" href="index.php">Lihat halaman depan</a>
    </p>
    <div class="flash err" style="margin-top:20px">
      <strong>Penting:</strong> hapus <span class="mono">setup.php</span> dari server
      sekarang. Selama file ini ada, siapa pun yang tahu URL-nya bisa membukanya.
    </div>

  <?php elseif ($sudahAdaAdmin): ?>
    <p class="sub">Instalasi sudah pernah dijalankan dan admin sudah ada.</p>
    <div class="flash info">
      Menjalankan ulang hanya akan memastikan tabel &amp; materi awal lengkap.
      Data yang sudah ada tidak dihapus. Butuh login admin.
    </div>
    <form method="post">
      <?= csrf_field() ?>
      <button class="btn" type="submit">Jalankan ulang (aman)</button>
    </form>
    <p class="hint">Sebaiknya file ini dihapus dari server.</p>

  <?php else: ?>
    <p class="sub">Bikin tabel database dan akun admin pertama. Cukup sekali.</p>
    <form method="post">
      <?= csrf_field() ?>
      <label for="nama">Nama admin</label>
      <input id="nama" name="nama" required maxlength="120" value="Owner">

      <label for="email">Email admin</label>
      <input id="email" name="email" type="email" required maxlength="190"
             placeholder="admin@domainmu.com">

      <label for="password">Password admin (min 8 karakter)</label>
      <input id="password" name="password" type="password" required minlength="8">

      <p style="margin-top:20px"><button class="btn blok" type="submit">Pasang sekarang</button></p>
    </form>
  <?php endif; ?>
</div>
<?php foot_html();
