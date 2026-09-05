<?php
// tanya.php — arahkan member ke kanal bantuan admin.
declare(strict_types=1);
require __DIR__ . '/_boot.php';

$u = require_login();
$telegram = setting('telegram_url', TELEGRAM_URL);
$emailAdmin = setting('email_admin', '');
// Pesan dibuat spesifik: admin langsung tahu siapa yang chat tanpa harus tanya.
$waChat = wa_link('Halo admin, saya ' . $u['nama'] . ' (' . $u['email'] . '), member '
    . APP_NAME . '. Saya mau tanya:');

head_html('Tanya Admin');
?>
<div class="card">
  <h1>Tanya Admin</h1>
  <p class="sub">Pilih kanal yang paling cepat dibalas.</p>

  <?php if ($waChat !== ''): ?>
    <a class="btn btn-wa blok" href="<?= e($waChat) ?>" target="_blank" rel="noopener">
      Chat admin di WhatsApp
    </a>
    <p class="hint">Paling langsung — nama dan emailmu sudah otomatis terisi di pesannya.</p>
  <?php endif; ?>

  <a class="btn btn-tele blok" style="margin-top:<?= $waChat !== '' ? '12px' : '0' ?>"
     href="<?= e($telegram) ?>" target="_blank" rel="noopener">
    Tanya di grup Telegram
  </a>
  <p class="hint">Sesama member juga sering membantu.</p>

  <?php if ($emailAdmin !== ''): ?>
    <?php
      $subjek = rawurlencode('[' . APP_NAME . '] Bantuan untuk ' . $u['email']);
      $isi = rawurlencode("Nama: {$u['nama']}\nEmail: {$u['email']}\n\nPertanyaan saya:\n");
    ?>
    <a class="btn ghost blok" style="margin-top:12px"
       href="mailto:<?= e($emailAdmin) ?>?subject=<?= $subjek ?>&body=<?= $isi ?>">
      Kirim email ke admin
    </a>
    <p class="hint">Balasan biasanya dalam 1×24 jam kerja.</p>
  <?php endif; ?>
</div>

<div class="card tight">
  <p class="sub" style="margin:0 0 12px">Sebelum bertanya, cek dulu:</p>
  <div class="row">
    <a class="btn ghost blok" href="faq.php">FAQ</a>
    <a class="btn ghost blok" href="cari.php">Cari materi</a>
  </div>
</div>
<?php foot_html();
