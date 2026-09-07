<?php
// materi.php — isi satu Bagian + daftar isi + catatan pribadi.
declare(strict_types=1);
require __DIR__ . '/_boot.php';
require __DIR__ . '/_markdown.php';
require __DIR__ . '/_progress.php';

$u   = require_login();
$uid = (int)$u['id'];

$no = (int)($_GET['b'] ?? 0);
$b  = $no > 0 ? bagian_satu($no) : null;

if (!$b) {
    http_response_code(404);
    head_html('Tidak ditemukan');
    echo '<div class="card"><h1>Bagian tidak ditemukan</h1>'
       . '<p class="sub">Materi yang kamu cari tidak ada.</p>'
       . '<a class="btn" href="dashboard.php">Kembali ke dashboard</a></div>';
    foot_html();
    exit;
}

// Cek Pembatasan Hak Akses Tier (Reguler vs Premium)
$tierUser = $u['tier'] ?? 'reguler';
$aksesMateri = $b['akses'] ?? 'reguler';
$isTerkunci = ($aksesMateri === 'premium' && $tierUser !== 'premium');

if ($isTerkunci) {
    head_html('Materi Khusus Premium — ' . $b['judul']);
    $pesanWa = 'Halo admin, saya member ' . APP_NAME . ' (email: ' . $u['email'] . '). Saya mau upgrade akun ke Premium / VVIP untuk membuka Bagian ' . $no . ' (' . $b['judul'] . '). Mohon infonya ya.';
    $linkWa  = wa_link($pesanWa);
    ?>
    <div class="card" style="text-align:center;padding:48px 20px;max-width:680px;margin:40px auto">
      <div style="font-size:52px;margin-bottom:16px">🔒</div>
      <span class="pill ok" style="margin-bottom:12px;display:inline-block">⭐ Khusus Member Premium / VVIP</span>
      <h1 style="margin:8px 0 12px;font-size:26px"><?= e($b['judul']) ?></h1>
      <p class="sub" style="max-width:520px;margin:0 auto 24px;line-height:1.6">
        Modul ini adalah materi eksklusif untuk member tingkat <strong>Premium</strong>.
        Akun kamu saat ini adalah <strong>Reguler</strong>.
      </p>
      <div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap">
        <?php if ($linkWa !== ''): ?>
          <a class="btn ok" href="<?= e($linkWa) ?>" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:8px">
            <?= komp_ikon('cek', 'h-4 w-4') ?> Upgrade ke Premium Sekarang
          </a>
        <?php endif; ?>
        <a class="btn ghost" href="dashboard.php">Kembali ke Dashboard</a>
      </div>
    </div>
    <?php
    foot_html();
    exit;
}

// Ubah status Bagian dari tombol di halaman ini, lalu kembali ke sini
// supaya member tidak kehilangan posisi bacaan.
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $st = (string)($_POST['status'] ?? '');
    progres_set($uid, $no, $st);
    audit('progres_ubah', $uid, "bagian=$no status=$st");
    redirect('materi.php?b=' . $no);
}

// Tandai "sedang dipelajari" begitu dibuka, kalau belum ada status.
$progres = progres_user($uid);
$status  = $progres[$no] ?? 'belum';
if ($status === 'belum') {
    progres_set($uid, $no, 'mulai');
    $status = 'mulai';
}
kunjungan_catat($uid, $no);

// Mode edit langsung: admin mengklik blok di halaman ini lalu mengubahnya di
// tempat. Sengaja dipasang di halaman materi, BUKAN di panel admin terpisah,
// karena yang admin lihat saat mengedit harus sama dengan yang dilihat pembeli.
$bisa_edit = ($u['role'] ?? '') === 'admin';
$mode_edit = $bisa_edit && (int)($_GET['edit'] ?? 0) === 1;

if ($mode_edit) {
    require __DIR__ . '/_blok.php';
    $blok = md_pecah_blok((string)$b['isi_md']);
    $html = materi_html_edit($blok);
} else {
    $html = md_to_html((string)$b['isi_md']);
}
$toc     = md_toc((string)$b['isi_md']);
$catatan = catatan_ambil($uid, $no);
$menit   = komp_menit_baca((string)$b['isi_md']);

// Jumlah langkah = heading "##". Dipakai di bilah kepala supaya pembaca tahu
// besarnya Bagian ini sebelum menggulir.
$langkah = 0;
foreach ($toc as $h) if ($h['level'] <= 2) $langkah++;

$semua = bagian_semua();

// Peta status semua Bagian untuk rel kurikulum di sisi kiri. Diambil dari
// $progres yang sudah dimuat di atas — tanpa query tambahan.
// $progres[$no] disegarkan dulu: kalau Bagian ini baru saja berubah dari
// "belum" jadi "mulai" di atas, salinan lamanya masih tersimpan di array.
$progres[$no] = $status;
$peta_status  = [];
$selesai_n    = 0;
foreach ($semua as $row) {
    $rn = (int)$row['urutan'];
    $st = $progres[$rn] ?? 'belum';
    $peta_status[$rn] = $st;
    if ($st === 'selesai') $selesai_n++;
}

$prev = $next = null;
foreach ($semua as $i => $row) {
    if ((int)$row['urutan'] === $no) {
        $prev = $semua[$i - 1] ?? null;
        $next = $semua[$i + 1] ?? null;
        break;
    }
}

head_html($b['judul'], true, $mode_edit ? 'kd-edit-on' : '');
?>
<!-- Bilah kemajuan baca. Diletakkan di paling atas viewport dan diisi oleh
     app.js. Fungsinya psikologis: pembaca gaptek paling sering berhenti karena
     merasa "masih panjang banget"; garis yang bergerak memberi tahu bahwa dia
     sedang maju, dan itu yang membuat dia menyelesaikan bacaan. -->
<div class="kd-baca-maju" aria-hidden="true"><span data-baca-maju></span></div>

<p class="small muted" style="margin:0 0 14px">
  <a href="dashboard.php">Dashboard</a> › Bagian <?= $no ?>
</p>

<?php if ($mode_edit): ?>
  <!-- Bilah ini sengaja mencolok dan menempel di atas: admin harus selalu sadar
       bahwa yang dia klik-ubah adalah materi yang dilihat pembeli, bukan draf. -->
  <div class="kd-edit-bilah">
    <span class="kd-edit-titik" aria-hidden="true"></span>
    <p><strong>Mode ubah langsung.</strong> Klik bagian mana pun untuk mengubahnya. Tersimpan begitu kamu tekan Simpan.</p>
    <a class="btn ghost" style="margin-left:auto" href="materi.php?b=<?= $no ?>">Selesai mengubah</a>
  </div>
<?php elseif ($bisa_edit): ?>
  <p style="margin:0 0 14px">
    <a class="btn ghost" href="materi.php?b=<?= $no ?>&amp;edit=1">Ubah materi ini langsung di halaman</a>
  </p>
<?php endif; ?>

<div class="materi">
  <aside class="toc">
    <!-- Daftar isi dibungkus kartu supaya tetap terlihat sebagai panel navigasi
         saat masuk tangkapan layar, bukan daftar tautan yang melayang. -->
    <div class="<?= komp_kartu_kelas('sticky top-4 overflow-hidden') ?>">
      <div class="p-5">
        <p class="m-0 mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[.14em] text-kd-muted">
          <?= komp_ikon('daftar', 'h-[14px] w-[14px] text-kd-accent') ?>
          Isi Bagian ini
        </p>
        <?php if (!$toc): ?>
          <p class="m-0 text-[13px] text-kd-muted">—</p>
        <?php else: ?>
          <nav class="kd-toc kd-toc-gulir" data-toc>
            <?php foreach ($toc as $h): ?>
              <a class="kd-toc-tautan<?= $h['level'] >= 3 ? ' kd-toc-l3' : '' ?>"
                 href="#<?= e($h['id']) ?>"><?= e($h['text']) ?></a>
            <?php endforeach; ?>
          </nav>
        <?php endif; ?>
        <hr class="my-4 border-0 border-t border-kd-line">
        <a class="inline-flex items-center gap-2 text-[13px] text-kd-fg2 no-underline hover:text-kd-accent"
           href="cetak.php?b=<?= $no ?>" target="_blank">
          <?= komp_ikon('cetak', 'h-[14px] w-[14px]') ?> Versi cetak / PDF
        </a>
      </div>
    </div>

    <!-- Rel kurikulum: daftar SELURUH Bagian dengan tanda sudah/belum.
         Ini bukan navigasi tambahan — dashboard sudah punya itu. Fungsinya:
         satu tangkapan layar halaman materi jadi ikut membuktikan bahwa
         kelasnya punya isi banyak dan ini area berbayar, bukan artikel blog.
         Bagian yang belum dibuka tetap bisa diklik (tidak ada penguncian
         palsu) — yang ditampilkan cuma keadaan sebenarnya. -->
    <?php if (count($semua) > 1): ?>
      <div class="<?= komp_kartu_kelas('mt-4 overflow-hidden') ?>">
        <div class="p-5">
          <p class="m-0 mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[.14em] text-kd-muted">
            <?= komp_ikon('buku', 'h-[14px] w-[14px] text-kd-accent') ?>
            Semua Bagian
            <span class="kd-meta ml-auto normal-case tracking-normal text-kd-muted2"><?= $selesai_n ?>/<?= count($semua) ?></span>
          </p>
          <nav class="flex flex-col gap-0.5">
            <?php foreach ($semua as $r):
              $rn         = (int)$r['urutan'];
              $rs         = $peta_status[$rn] ?? 'belum';
              $kini       = $rn === $no;
              $aksesR     = $r['akses'] ?? 'reguler';
              $terkunciR  = ($aksesR === 'premium' && ($u['tier'] ?? 'reguler') !== 'premium');
            ?>
              <a class="kd-rel-item<?= $kini ? ' kd-rel-kini' : '' ?>" href="materi.php?b=<?= $rn ?>" style="<?= $terkunciR ? 'opacity:0.75' : '' ?>">
                <span class="<?= $terkunciR ? 'text-kd-accent' : ($rs === 'selesai' ? 'text-emerald-300' : ($kini ? 'text-kd-accent' : 'text-kd-muted2')) ?>">
                  <?= $terkunciR ? '🔒' : komp_ikon($rs === 'selesai' ? 'cek' : ($kini ? 'panah' : 'kotak'), 'h-[13px] w-[13px]') ?>
                </span>
                <span class="kd-meta shrink-0 text-kd-muted2"><?= str_pad((string)$rn, 2, '0', STR_PAD_LEFT) ?></span>
                <span class="min-w-0 flex-1 truncate"><?= e($r['judul']) ?></span>
                <?php if ($aksesR === 'premium'): ?>
                  <span class="kd-meta shrink-0" style="font-size:10px;color:#A4D8FF">VIP</span>
                <?php endif; ?>
              </a>
            <?php endforeach; ?>
          </nav>
        </div>
      </div>
    <?php endif; ?>
  </aside>

  <div class="isi-materi">
    <!-- Bilah kepala Bagian. Dipisah dari kartu isi supaya tangkapan layar
         bagian mana pun tetap membawa identitas: nomor Bagian, judul, dan
         ukuran bacaan. Ini yang membuat satu potongan layar terlihat sebagai
         bagian dari kelas yang tersusun, bukan potongan dokumen acak. -->
    <header class="<?= komp_kartu_kelas('mb-7 bg-gradient-to-b from-white/[.04] to-transparent') ?>">
      <?= komp_kilau() ?>
      <div class="p-6 sm:p-8">
        <p class="m-0 mb-3 flex items-center gap-2 font-mono text-[12px] uppercase tracking-[.14em] text-kd-accent/80">
          <span class="inline-block h-px w-6 bg-kd-accent/50"></span>
          Bagian <?= $no ?> dari <?= count($semua) ?>
        </p>
        <h1 class="m-0 text-[27px] font-semibold leading-[1.18] tracking-[-.6px] text-kd-fg sm:text-[33px]">
          <?= e($b['judul']) ?>
        </h1>
        <p class="mb-0 mt-3 max-w-[62ch] text-[15.5px] leading-relaxed text-kd-fg2"><?= e($b['ringkas']) ?></p>
        <div class="mt-5 flex flex-wrap items-center gap-2">
          <?php if (($b['akses'] ?? 'reguler') === 'premium'): ?>
            <span class="pill ok">⭐ Akses VIP</span>
          <?php endif; ?>
          <?= komp_meta('jam', $menit . ' menit baca') ?>
          <?php if ($langkah > 0): ?><?= komp_meta('buku', $langkah . ' bagian') ?><?php endif; ?>
          <?= badge_status($status) ?>
        </div>
      </div>
    </header>

    <div data-materi-isi><?= $html ?></div>

    <div class="<?= komp_kartu_kelas('my-8 bg-kd-accent/[.05]') ?>">
      <?= komp_kilau() ?>
      <div class="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div class="min-w-0">
          <p class="m-0 text-[16px] font-semibold text-kd-fg">
            <?= $status === 'selesai' ? 'Bagian ini sudah kamu selesaikan' : 'Sudah selesai Bagian ini?' ?>
          </p>
          <p class="m-0 mt-1 text-[14px] text-kd-muted">
            <?= $status === 'selesai'
                ? 'Progresmu sudah tercatat. Lanjut ke Bagian berikutnya kapan pun siap.'
                : 'Tandai selesai supaya progres di dashboard ikut naik.' ?>
          </p>
        </div>
        <form method="post" action="materi.php?b=<?= $no ?>" class="shrink-0">
          <?= csrf_field() ?>
          <input type="hidden" name="bagian" value="<?= $no ?>">
          <input type="hidden" name="status" value="<?= $status === 'selesai' ? 'belum' : 'selesai' ?>">
          <button class="btn <?= $status === 'selesai' ? 'ghost' : 'ok' ?>" type="submit">
            <?= $status === 'selesai' ? 'Tandai belum selesai' : 'Tandai Bagian ini selesai' ?>
          </button>
        </form>
      </div>
    </div>

    <div class="card">
      <h2 style="margin-top:0">Catatan pribadi</h2>
      <p class="sub">Hanya kamu yang bisa melihat ini. Tersimpan otomatis.</p>
      <textarea data-catatan-bagian="<?= $no ?>"
                data-csrf="<?= e(csrf_token()) ?>"
                placeholder="Tulis langkah yang berhasil, kendala, atau ide…"><?= e($catatan) ?></textarea>
      <p class="hint" data-catatan-status>Belum ada perubahan.</p>
      <noscript><p class="hint">Auto-save butuh JavaScript aktif.</p></noscript>
    </div>

    <div class="card tight">
      <div class="row">
        <?php if ($prev): ?>
          <a class="btn ghost blok" href="materi.php?b=<?= (int)$prev['urutan'] ?>">
            ← Bagian <?= (int)$prev['urutan'] ?>
          </a>
        <?php endif; ?>
        <a class="btn ghost blok" href="dashboard.php">Dashboard</a>
        <?php if ($next): ?>
          <a class="btn blok" href="materi.php?b=<?= (int)$next['urutan'] ?>">
            Bagian <?= (int)$next['urutan'] ?> →
          </a>
        <?php endif; ?>
      </div>
    </div>
  </div>
</div>
<?php
// Skrip mode edit hanya dimuat untuk admin yang memang sedang mengedit.
// Member tidak pernah mengunduh satu byte pun dari berkas ini.
$skrip = [];
if ($mode_edit) {
    // Data blok dikirim sebagai JSON: markdown ASLI setiap blok. Klien memakai
    // ini saat membuka kotak sunting, bukan membaca balik HTML di layar —
    // membaca balik HTML berarti menebak, dan tebakan yang salah menulis ulang
    // materi dengan isi yang keliru.
    $payload = [
        'aktif'  => true,
        'bagian' => $no,
        'csrf'   => csrf_token(),
        'blok'   => array_map(
            static fn(array $x): array => ['md' => $x['md'], 'jenis' => $x['jenis']],
            $blok
        ),
    ];
    echo '<script>window.KD_EDIT=' .
         json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) .
         ';</script>' . "\n";
    $skrip[] = 'edit-langsung.js?v=1';
}
foot_html($skrip);
