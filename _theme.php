<?php
// _theme.php — kerangka halaman (header/footer) + CSS inline.
// CSS ditaruh di file terpisah style.css agar bisa di-cache browser.

declare(strict_types=1);

// $body_kelas: kelas tambahan untuk <body>. Dipakai mode edit langsung
// (.kd-edit-on) supaya seluruh aturan CSS mode edit mustahil aktif di halaman
// member — pengamanan struktural, bukan sekadar kerapian.
function head_html(string $judul, bool $lebar = false, string $body_kelas = ''): void
{
    $u = current_user();
    $isAdmin = ($u['role'] ?? '') === 'admin';
    ?><!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= e($judul) ?> — <?= e(APP_NAME) ?></title>
<meta name="robots" content="noindex, nofollow">
<meta name="color-scheme" content="dark">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="style.css?v=7">
<!-- tw.css dimuat SETELAH style.css: berkas ini hanya memuat kelas utility
     untuk kartu materi, dan urutan ini yang membuatnya menang saat menimpa
     tanpa perlu !important. Dikompilasi di mesin sendiri (tw/bangun.sh),
     bukan dari CDN — hosting bersama tidak punya Node dan pembeli tidak
     perlu build apa pun. -->
<link rel="stylesheet" href="tw.css?v=2">
</head>
<body<?= $body_kelas !== '' ? ' class="' . e($body_kelas) . '"' : '' ?>>
<a class="skip" href="#konten">Lompat ke konten</a>
<header class="topbar">
  <div class="wrap bar">
    <a class="brand" href="<?= $u ? 'dashboard.php' : 'index.php' ?>">
      <strong><?= e(APP_NAME) ?></strong>
      <span class="tag">Member area kelas <?= e(COURSE_NAME) ?></span>
    </a>
    <nav class="nav">
      <?php if ($u): ?>
        <a href="dashboard.php">Dashboard</a>
        <a href="cari.php">Cari</a>
        <a href="faq.php">FAQ</a>
        <a href="profil.php">Profil</a>
        <?php if ($isAdmin): ?><a class="pill" href="admin.php">Admin</a><?php endif; ?>
        <a href="logout.php">Keluar</a>
      <?php else: ?>
        <a href="redeem.php">Redeem kode</a>
        <a href="login.php">Masuk</a>
      <?php endif; ?>
    </nav>
  </div>
</header>
<main id="konten" class="wrap <?= $lebar ? 'lebar' : '' ?>">
<?php
    foreach (flash_take() as $f) {
        echo '<div class="flash ' . e($f['type']) . '">' . e($f['msg']) . '</div>';
    }
}

function foot_html(array $skrip = []): void
{
    $waFooter = function_exists('wa_link') ? wa_link() : '';
    ?>
</main>
<footer class="footer">
  <div class="wrap">
    <?= e(APP_NAME) ?> — kelas <?= e(COURSE_NAME) ?>
    <span class="sep">·</span>
    <a href="faq.php">Bantuan</a>
    <?php if ($waFooter !== ''): ?>
      <span class="sep">·</span>
      <a href="<?= e($waFooter) ?>" target="_blank" rel="noopener">Chat WhatsApp</a>
    <?php endif; ?>
  </div>
</footer>
<?php if ($waFooter !== ''): ?>
<a class="wa-apung" href="<?= e($waFooter) ?>" target="_blank" rel="noopener"
   aria-label="Chat WhatsApp dengan admin" title="Chat admin di WhatsApp">
  <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false">
    <path fill="currentColor" d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.15c-1.5 0-2.97-.4-4.25-1.16l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.37c0-4.54 3.7-8.23 8.24-8.23 4.54 0 8.23 3.69 8.23 8.23 0 4.54-3.69 8.24-8.17 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.7-.8-.23-.09-.4-.13-.56.12-.17.25-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.12-1.06-.39-2.02-1.25-.75-.67-1.25-1.5-1.4-1.75-.14-.25-.01-.39.11-.51.11-.11.25-.29.37-.44.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.55.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.17-.47-.29z"/>
  </svg>
</a>
<?php endif; ?>
<script src="app.js?v=5" defer></script>
<?php
    // Skrip tambahan per halaman. Dipakai supaya berkas berat seperti TinyMCE
    // (1,3 MB) HANYA dimuat di halaman editor admin, bukan di setiap halaman
    // yang dibuka member.
    foreach ($skrip as $s) {
        echo '<script src="' . e($s) . '" defer></script>' . "\n";
    }
    ?>
</body>
</html>
<?php
}
