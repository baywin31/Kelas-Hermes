<?php
// dashboard.php — halaman utama member.
// URUTAN TAMPILAN WAJIB (dari PRD, jangan ditukar):
//   1. sapaan  2. tombol Telegram  3. daftar Bagian  4. progres
//
// Tampilan mengikuti berkas referensi Figma lewat gaya-lazy.css. Yang
// ditambahkan di sini hanya WIDGET: semuanya diisi data yang sudah diambil
// di bawah — tidak ada satu pun pertanyaan baru ke database, dan tidak ada
// JavaScript baru. Tombol, tautan, dan alur aksi tidak diubah sedikit pun.
declare(strict_types=1);
require __DIR__ . '/_boot.php';
require __DIR__ . '/_progress.php';
require __DIR__ . '/_skill.php';
require __DIR__ . '/_lampiran.php';

$u = require_login();
$uid = (int)$u['id'];

// Ubah status Bagian dari tombol di daftar.
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $bagian = (int)($_POST['bagian'] ?? 0);
    $status = (string)($_POST['status'] ?? '');
    if ($bagian > 0) {
        progres_set($uid, $bagian, $status);
        audit('progres_ubah', $uid, "bagian=$bagian status=$status");
    }
    redirect('dashboard.php');
}

$bagianList = bagian_semua();
$progres    = progres_user($uid);
$kunjungan  = kunjungan_user($uid);
$links      = links_ambil();
$telegram   = setting('telegram_url', TELEGRAM_URL);

$total   = count($bagianList);
$selesai = 0;
$mulai   = 0;
$terakhir = null;   // Bagian yang paling terakhir dibuka (untuk "Lanjutkan belajar")
foreach ($bagianList as $b) {
    $no = (int)$b['urutan'];
    $st = $progres[$no] ?? 'belum';
    if ($st === 'selesai') $selesai++;
    elseif ($st === 'mulai') $mulai++;
    $kunj = $kunjungan[$no] ?? 0;
    if ($kunj > 0 && ($terakhir === null || $kunj > ($kunjungan[(int)$terakhir['urutan']] ?? 0))) {
        $terakhir = $b;
    }
}
$persen = $total > 0 ? (int)round($selesai / $total * 100) : 0;

// Bagian yang disarankan dilanjutkan: yang sudah dibuka tapi belum selesai;
// kalau tidak ada, Bagian pertama yang belum selesai.
$lanjut = null;
foreach ($bagianList as $b) {
    $no = (int)$b['urutan'];
    if (($terakhir['urutan'] ?? null) === $no && ($progres[$no] ?? 'belum') !== 'selesai') {
        $lanjut = $b;
        break;
    }
}
if ($lanjut === null) {
    foreach ($bagianList as $b) {
        if (($progres[(int)$b['urutan']] ?? 'belum') !== 'selesai') { $lanjut = $b; break; }
    }
}
$persenLanjut = $lanjut !== null
    ? (($progres[(int)$lanjut['urutan']] ?? 'belum') === 'mulai' ? 55 : (($progres[(int)$lanjut['urutan']] ?? 'belum') === 'selesai' ? 100 : 0))
    : 0;

// Jumlah paket skill & berkas pendamping yang boleh diunduh member ini.
$jumlahSkill = 0;
foreach (skill_semua() as $sk) {
    if (skill_boleh($sk, $u)) $jumlahSkill++;
}
$jumlahLampiran = 0;
foreach (lamp_hitung_semua() as $lb) {
    if ((string)($lb['akses'] ?? 'reguler') === 'premium' && ($u['tier'] ?? 'reguler') !== 'premium') continue;
    $jumlahLampiran += (int)($lb['jml'] ?? 0);
}

// Rentetan belajar 7 hari dari kunjungan: kunjungan terakhir tiap Bagian
// dianggap sebagai aktivitas belajar pada hari itu.
$hariAktif = [];
foreach ($kunjungan as $k) {
    if ($k > 0) $hariAktif[date('Y-m-d', $k)] = ($hariAktif[date('Y-m-d', $k)] ?? 0) + 1;
}
$namaHari = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
$rentetan = [];
for ($i = 6; $i >= 0; $i--) {
    $tgl = date('Y-m-d', strtotime("-$i day"));
    $rentetan[] = [
        'nama' => $namaHari[(int)date('w', strtotime($tgl))],
        'n'    => $hariAktif[$tgl] ?? 0,
    ];
}

head_html('Dashboard');
?>

<!-- 1. SAPAAN -->
<div class="card penting">
  <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
    <div>
      <?php if (($u['tier'] ?? 'reguler') === 'premium'): ?>
        <span class="pill ok" style="margin-bottom:8px;display:inline-block">⭐ Member VIP / Premium</span>
      <?php else: ?>
        <span class="eyebrow">Akses aktif · Member Reguler</span>
      <?php endif; ?>
      <h1 style="margin:4px 0 8px">Halo, <?= e($u['nama']) ?></h1>
    </div>
    <?php if (($u['tier'] ?? 'reguler') !== 'premium'): ?>
      <?php
        $waUpgrade = wa_link('Halo admin, saya member ' . APP_NAME . ' (' . $u['email'] . '). Mau info upgrade ke akun VIP/Premium.');
      ?>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <a class="btn ghost" style="font-size:13px;padding:6px 12px" href="redeem.php?upgrade=1">
          🔑 Punya Kode Upgrade?
        </a>
        <?php if ($waUpgrade !== ''): ?>
          <a class="btn" style="font-size:13px" href="<?= e($waUpgrade) ?>" target="_blank" rel="noopener">
            ⭐ Upgrade ke VIP
          </a>
        <?php endif; ?>
      </div>
    <?php endif; ?>
  </div>
  <p class="sub" style="margin-bottom:0">
    Selamat datang di member area kelas <?= e(COURSE_NAME) ?>.
    Aksesmu berlaku selamanya, termasuk materi yang ditambahkan nanti.
  </p>
</div>

<!-- 1b. WIDGET: RINGKASAN ANGKA -->
<div class="lz-grid">
  <div class="lz-angka hijau">
    <div class="lz-label">Bagian selesai</div>
    <div class="lz-nilai"><?= $selesai ?> <small>/ <?= $total ?></small></div>
    <div class="lz-catatan"><?= $persen ?>% dari total materi</div>
  </div>
  <div class="lz-angka">
    <div class="lz-label">Sedang dipelajari</div>
    <div class="lz-nilai"><?= $mulai ?></div>
    <div class="lz-catatan">Bagian yang sudah dibuka</div>
  </div>
  <div class="lz-angka kuning">
    <div class="lz-label">Paket skill</div>
    <div class="lz-nilai"><?= $jumlahSkill ?></div>
    <div class="lz-catatan">Siap diunduh</div>
  </div>
  <div class="lz-angka">
    <div class="lz-label">Berkas pendamping</div>
    <div class="lz-nilai"><?= $jumlahLampiran ?></div>
    <div class="lz-catatan">Lampiran tiap Bagian</div>
  </div>
</div>

<!-- 2. TOMBOL TELEGRAM -->
<div class="card tight">
  <a class="btn btn-tele blok" href="<?= e($telegram) ?>" target="_blank" rel="noopener">
    Join Komunitas Telegram
  </a>
  <p class="hint" style="margin:10px 0 0;text-align:center">
    Tempat tanya-jawab dan pengumuman materi baru.
  </p>
</div>

<!-- 2b. WIDGET: LANJUTKAN BELAJAR -->
<?php if ($lanjut !== null): ?>
<div class="lz-lanjut">
  <div class="lz-label">Lanjutkan belajar</div>
  <h3>Bagian <?= (int)$lanjut['urutan'] ?> — <?= e($lanjut['judul']) ?></h3>
  <p><?= e($lanjut['ringkas']) ?></p>
  <div class="lz-bar"><i style="--p:<?= $persenLanjut ?>"></i></div>
  <div class="lz-kaki">
    <span><?= $persenLanjut ?>% selesai</span>
    <?php $kunjL = $kunjungan[(int)$lanjut['urutan']] ?? 0; ?>
    <?php if ($kunjL > 0): ?>
      <span style="margin-left:auto">Terakhir dibuka <?= e(date('j M, H:i', $kunjL)) ?></span>
    <?php endif; ?>
  </div>
</div>
<?php endif; ?>

<?php if ($bagianList): ?>
<!-- 2c. WIDGET: PROGRES PER BAGIAN + CINCIN -->
<div class="lz-grid luas">
  <div class="card">
    <div class="lz-kepala">
      <h2>Progres per Bagian</h2>
      <a href="materi.php?b=<?= (int)($bagianList[0]['urutan'] ?? 1) ?>">Buka materi →</a>
    </div>
    <div class="lz-batang">
      <?php foreach ($bagianList as $b):
          $no = (int)$b['urutan'];
          $st = $progres[$no] ?? 'belum';
          $p  = $st === 'selesai' ? 100 : ($st === 'mulai' ? 55 : 3);
      ?>
        <i class="<?= $st === 'belum' ? 'belum' : '' ?>" style="--p:<?= $p ?>"
           data-n="Bagian <?= $no ?>" title="Bagian <?= $no ?>: <?= e(badge_status($st)) ?>"></i>
      <?php endforeach; ?>
    </div>
  </div>

  <div class="card">
    <h2 style="margin-top:0">Ringkasan belajar</h2>
    <div class="lz-cincin-baris">
      <div class="lz-cincin" style="--p:<?= $persen ?>" role="img"
           aria-label="Progres total <?= $persen ?> persen">
        <b><?= $persen ?>%<small>total</small></b>
      </div>
      <div class="lz-rinci">
        <div><span class="lz-titik" style="background:var(--lz-ok)"></span>Selesai <b><?= $selesai ?></b></div>
        <div><span class="lz-titik" style="background:var(--lz-isi)"></span>Sedang jalan <b><?= $mulai ?></b></div>
        <div><span class="lz-titik" style="background:var(--lz-kotak)"></span>Belum dibuka <b><?= max(0, $total - $selesai - $mulai) ?></b></div>
      </div>
    </div>
  </div>
</div>

<div class="lz-grid luas">
  <div class="card">
    <h2 style="margin-top:0">Rentetan belajar</h2>
    <div class="lz-rentetan">
      <?php foreach ($rentetan as $r): ?>
        <div class="<?= $r['n'] >= 2 ? 'kuat' : ($r['n'] === 1 ? 'ada' : '') ?>"
             title="<?= $r['n'] ?> aktivitas"><?= e($r['nama']) ?></div>
      <?php endforeach; ?>
    </div>
    <p class="muted small" style="margin:10px 0 0">
      Dihitung dari materi yang kamu buka dalam 7 hari terakhir.
    </p>
  </div>

  <div class="card">
    <h2 style="margin-top:0">Aktivitas terbaru</h2>
    <div class="lz-aktivitas">
      <?php
        // Diambil dari kunjungan yang sudah dibaca di atas — bukan pertanyaan baru.
        $urutKunj = $kunjungan;
        arsort($urutKunj);
        $tampil = 0;
        foreach ($urutKunj as $noK => $waktuK):
            if ($waktuK <= 0 || $tampil >= 4) continue;
            $bK = null;
            foreach ($bagianList as $bb) { if ((int)$bb['urutan'] === (int)$noK) { $bK = $bb; break; } }
            if ($bK === null) continue;
            $tampil++;
      ?>
        <div>
          <span><?= ($progres[(int)$noK] ?? 'belum') === 'selesai' ? '✓' : '▸' ?></span>
          <span>Membuka <b>Bagian <?= (int)$noK ?> — <?= e($bK['judul']) ?></b>
            <time><?= e(date('j M Y, H:i', $waktuK)) ?></time></span>
        </div>
      <?php endforeach; ?>
      <?php if ($tampil === 0): ?>
        <div><span>▸</span><span>Belum ada aktivitas. Buka salah satu Bagian untuk mulai.<time>—</time></span></div>
      <?php endif; ?>
    </div>
  </div>
</div>
<?php endif; ?>

<!-- 3. DAFTAR BAGIAN -->
<div class="card">
  <h2 style="margin-top:0">Materi kelas</h2>
  <?php if (!$bagianList): ?>
    <p class="muted">Materi belum tersedia.</p>
  <?php else: ?>
    <?php foreach ($bagianList as $b):
        $no  = (int)$b['urutan'];
        $st  = $progres[$no] ?? 'belum';
        $baru = materi_baru($b, $kunjungan);
        $aksesMateri = $b['akses'] ?? 'reguler';
        $tierUser    = $u['tier'] ?? 'reguler';
        $terkunci    = ($aksesMateri === 'premium' && $tierUser !== 'premium');
    ?>
      <div class="bagian" style="">
        <div class="no"><?= $no ?></div>
        <div class="isi">
          <h3>
            <a href="materi.php?b=<?= $no ?>"><?= e($b['judul']) ?></a>
            <?php if ($terkunci): ?>
              <span class="badge lz-lencana-premium">🔒 Khusus Premium</span>
            <?php elseif ($baru): ?>
              <span class="badge baru">Materi Baru</span>
            <?php endif; ?>
          </h3>
          <p class="muted small" style="margin:0 0 8px"><?= e($b['ringkas']) ?></p>
          <?php if ($terkunci): ?>
            <span class="badge lz-lencana-premium">Terkunci</span>
          <?php else: ?>
            <?= badge_status($st) ?>
          <?php endif; ?>
        </div>
        <div class="aksi">
          <?php if ($terkunci): ?>
            <a class="btn lz-lencana-premium" href="materi.php?b=<?= $no ?>">🔒 Buka</a>
          <?php else: ?>
            <a class="btn ghost" href="materi.php?b=<?= $no ?>">Buka</a>
            <form method="post" style="margin:0">
              <?= csrf_field() ?>
              <input type="hidden" name="bagian" value="<?= $no ?>">
              <?php if ($st === 'selesai'): ?>
                <input type="hidden" name="status" value="belum">
                <button class="btn ok" type="submit" title="Batalkan tanda selesai">✓ Selesai</button>
              <?php else: ?>
                <input type="hidden" name="status" value="selesai">
                <button class="btn" type="submit">Tandai selesai</button>
              <?php endif; ?>
            </form>
          <?php endif; ?>
        </div>
      </div>
    <?php endforeach; ?>
  <?php endif; ?>
</div>

<!-- 4. PROGRES -->
<div class="card">
  <h2 style="margin-top:0">Progres belajar</h2>
  <div class="progres">
    <div class="progres-angka">
      <b><?= $persen ?>%</b>
      <span class="muted small">
        <strong><?= $selesai ?></strong> dari <?= $total ?> Bagian selesai
      </span>
    </div>
    <div class="bar-luar"><div class="bar-dalam" data-persen="<?= $persen ?>"></div></div>
  </div>
</div>

<?php if ($links): ?>
<div class="card">
  <h2 style="margin-top:0">Tautan penting</h2>
  <?php foreach ($links as $l):
      $url = (string)($l['url'] ?? '');
      if (!preg_match('#^https?://#i', $url)) continue;
  ?>
    <div class="bagian" style="padding:14px">
      <div class="isi">
        <h3 style="margin:0"><a href="<?= e($url) ?>" target="_blank" rel="noopener"><?= e($l['judul'] ?? $url) ?></a></h3>
        <?php if (!empty($l['ket'])): ?>
          <p class="muted small" style="margin:2px 0 0"><?= e($l['ket']) ?></p>
        <?php endif; ?>
      </div>
    </div>
  <?php endforeach; ?>
</div>
<?php endif; ?>

<div class="card tight">
  <div class="row">
    <a class="btn ghost blok" href="skill.php">Modul Skill (unduh paket)</a>
    <a class="btn ghost blok" href="cari.php">Cari materi</a>
    <a class="btn ghost blok" href="faq.php">FAQ</a>
    <a class="btn ghost blok" href="tanya.php">Tanya Admin</a>
  </div>
</div>

<?php foot_html();
