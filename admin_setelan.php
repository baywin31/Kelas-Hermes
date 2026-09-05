<?php
// admin_setelan.php — link Telegram, email admin, FAQ, quick links.
declare(strict_types=1);
require __DIR__ . '/_boot.php';
require __DIR__ . '/_markdown.php';
require __DIR__ . '/_progress.php';

$admin = require_admin();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $aksi = (string)($_POST['aksi'] ?? '');

    if ($aksi === 'umum') {
        $tele = trim((string)($_POST['telegram_url'] ?? ''));
        $mail = trim((string)($_POST['email_admin'] ?? ''));
        $waIn = trim((string)($_POST['wa_nomor'] ?? ''));
        $waMsg = trim((string)($_POST['wa_pesan'] ?? ''));
        // Nomor divalidasi lewat wa_normal: kalau tidak bisa dirapikan, tolak
        // sekarang daripada memasang tombol yang membuka chat kosong.
        $waBersih = $waIn === '' ? '' : wa_normal($waIn);
        if ($tele !== '' && !preg_match('#^https?://#i', $tele)) {
            flash_set('err', 'Link Telegram harus dimulai dengan http:// atau https://');
        } elseif ($mail !== '' && !filter_var($mail, FILTER_VALIDATE_EMAIL)) {
            flash_set('err', 'Email admin tidak valid.');
        } elseif ($waIn !== '' && $waBersih === '') {
            flash_set('err', 'Nomor WhatsApp tidak masuk akal. Contoh benar: 081234567890 atau 6281234567890.');
        } else {
            setting_put('telegram_url', $tele);
            setting_put('email_admin', $mail);
            setting_put('wa_nomor', $waBersih);
            setting_put('wa_pesan', $waMsg);
            audit('setelan_umum', (int)$admin['id']);
            flash_set('ok', 'Setelan umum disimpan.');
        }
        redirect('admin_setelan.php');
    }

    if ($aksi === 'faq') {
        setting_put('faq_md', (string)($_POST['faq_md'] ?? ''));
        audit('setelan_faq', (int)$admin['id']);
        flash_set('ok', 'FAQ disimpan.');
        redirect('admin_setelan.php');
    }

    if ($aksi === 'links') {
        // Satu baris = satu tautan, format: Judul | https://url | keterangan
        $raw = (string)($_POST['links_raw'] ?? '');
        $out = [];
        foreach (explode("\n", $raw) as $baris) {
            $baris = trim($baris);
            if ($baris === '') continue;
            $p = array_map('trim', explode('|', $baris));
            $url = $p[1] ?? '';
            if (!preg_match('#^https?://#i', $url)) continue;   // baris tak valid dilewati
            $out[] = ['judul' => $p[0] ?? $url, 'url' => $url, 'ket' => $p[2] ?? ''];
        }
        setting_put('links_json', json_encode($out, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
        audit('setelan_links', (int)$admin['id'], count($out) . ' tautan');
        flash_set('ok', count($out) . ' tautan disimpan (baris tanpa URL valid dilewati).');
        redirect('admin_setelan.php');
    }
}

$links = links_ambil();
$linksRaw = '';
foreach ($links as $l) {
    $linksRaw .= ($l['judul'] ?? '') . ' | ' . ($l['url'] ?? '') . ' | ' . ($l['ket'] ?? '') . "\n";
}

head_html('Setelan', true);
?>
<p class="small muted" style="margin:0 0 14px"><a href="admin.php">Panel Admin</a> › Setelan</p>

<div class="card">
  <h2 style="margin-top:0">Umum</h2>
  <form method="post">
    <?= csrf_field() ?>
    <input type="hidden" name="aksi" value="umum">
    <label for="telegram_url">Link grup Telegram</label>
    <input id="telegram_url" name="telegram_url" value="<?= e(setting('telegram_url')) ?>"
           placeholder="https://t.me/+xxxxx">
    <p class="hint">Dipakai tombol utama di dashboard dan halaman Tanya Admin.</p>

    <label for="email_admin">Email admin (opsional)</label>
    <input id="email_admin" name="email_admin" type="email" value="<?= e(setting('email_admin')) ?>"
           placeholder="admin@domainmu.com">
    <p class="hint">Kalau diisi, muncul tombol kirim email di halaman Tanya Admin.</p>

    <label for="wa_nomor">Nomor WhatsApp admin</label>
    <input id="wa_nomor" name="wa_nomor" value="<?= e(setting('wa_nomor', defined('WA_NOMOR') ? WA_NOMOR : '')) ?>"
           placeholder="081234567890 atau 6281234567890">
    <p class="hint">
      Boleh pakai 08xx, spasi, atau tanda hubung — dirapikan otomatis jadi format wa.me.
      Kalau dikosongkan, semua tombol WhatsApp hilang sendiri.
      <?php $waCek = wa_link(); ?>
      <?php if ($waCek !== ''): ?>
        <br>Aktif sekarang: <span class="mono"><?= e(wa_nomor()) ?></span> —
        <a href="<?= e($waCek) ?>" target="_blank" rel="noopener">uji tautannya</a>.
      <?php endif; ?>
    </p>

    <label for="wa_pesan">Pesan pembuka WhatsApp (opsional)</label>
    <input id="wa_pesan" name="wa_pesan" value="<?= e(setting('wa_pesan', '')) ?>"
           placeholder="Halo admin, saya butuh bantuan soal <?= e(APP_NAME) ?>.">
    <p class="hint">Terisi otomatis di kotak chat member. Di halaman Tanya Admin, nama &amp; email member ditambahkan sendiri.</p>

    <p style="margin-top:16px"><button class="btn" type="submit">Simpan</button></p>
  </form>
</div>

<div class="card">
  <h2 style="margin-top:0">FAQ</h2>
  <p class="sub">Markdown. Tiap pertanyaan sebaiknya jadi heading <span class="mono">##</span>.</p>
  <form method="post">
    <?= csrf_field() ?>
    <input type="hidden" name="aksi" value="faq">
    <textarea name="faq_md" rows="14" spellcheck="false"
              style="font-family:ui-monospace,Consolas,monospace;font-size:13.5px"><?= e(setting('faq_md')) ?></textarea>
    <p style="margin-top:14px">
      <button class="btn" type="submit">Simpan FAQ</button>
      <a class="btn ghost" href="faq.php" target="_blank">Lihat hasilnya</a>
    </p>
  </form>
</div>

<div class="card">
  <h2 style="margin-top:0">Tautan penting</h2>
  <p class="sub">Satu baris satu tautan, formatnya: <span class="mono">Judul | https://url | keterangan</span></p>
  <form method="post">
    <?= csrf_field() ?>
    <input type="hidden" name="aksi" value="links">
    <textarea name="links_raw" rows="7" spellcheck="false"
              style="font-family:ui-monospace,Consolas,monospace;font-size:13.5px"><?= e(trim($linksRaw)) ?></textarea>
    <p class="hint">Baris tanpa URL http/https akan dilewati tanpa peringatan.</p>
    <p style="margin-top:14px"><button class="btn" type="submit">Simpan tautan</button></p>
  </form>
</div>
<?php foot_html();
