<?php
/*
 * _lihat.php — halaman PRATINJAU SEMENTARA: menampilkan satu Bagian materi
 * tanpa login, dikunci lewat kunci acak di URL.
 *
 * Kenapa ada: pemilik bilang "belum lihat ada perubahan", sedangkan halaman
 * materi berada di balik login sehingga tidak bisa dibuka sambil lalu. Halaman
 * ini merender materi dari DATABASE HOSTING dengan CSS hosting juga — jadi yang
 * dia lihat persis apa yang dilihat pembeli, bukan tiruan lokal.
 *
 * Kenapa tidak memakai materi.php langsung: materi.php menulis progres dan
 * kunjungan ke database atas nama satu member. Pratinjau tidak boleh mengubah
 * data siapa pun, jadi halaman ini hanya membaca.
 *
 * WAJIB DICABUT setelah dilihat: bash hapus-lihat.sh
 */
declare(strict_types=1);

require __DIR__ . '/_boot.php';
require __DIR__ . '/_markdown.php';
require __DIR__ . '/_progress.php';

// Kunci acak, bukan kata yang bisa ditebak: tanpa ini materi berbayar
// terbuka untuk siapa saja yang menebak nama berkas.
const KUNCI_LIHAT = 'lihat-bd93f1a7';

if (!hash_equals(KUNCI_LIHAT, (string)($_GET['k'] ?? ''))) {
    http_response_code(404);
    exit('Not found');
}

// Lapis kedua kalau kunci bocor ke riwayat browser atau log.
header('X-Robots-Tag: noindex, nofollow, noarchive');

$semua = bagian_semua();
$no    = (int)($_GET['b'] ?? 1);
$b     = bagian_satu($no > 0 ? $no : 1);
if (!$b) { exit('Bagian tidak ada di database hosting.'); }
$no = (int)$b['urutan'];

$html  = md_to_html((string)$b['isi_md']);
$toc   = md_toc((string)$b['isi_md']);
$menit = komp_menit_baca((string)$b['isi_md']);

$langkah = 0;
foreach ($toc as $h) if ($h['level'] <= 2) $langkah++;

head_html('Pratinjau Bagian ' . $no . ' — ' . (string)$b['judul'], true);
?>

<div class="<?= komp_kartu_kelas('mb-6 bg-kd-accent/[.07]') ?>">
  <?= komp_kilau() ?>
  <div class="p-5">
    <p class="m-0 flex items-center gap-2 text-[13px] font-semibold text-kd-accent">
      <?= komp_ikon('bendera', 'h-4 w-4') ?> PRATINJAU SEMENTARA
    </p>
    <p class="m-0 mt-2 text-[14px] leading-relaxed text-kd-fg2">
      Ini tampilan Bagian <?= $no ?> yang dilihat pembeli, diambil dari database
      hosting. Halaman ini akan dicabut setelah kamu selesai melihat — jangan
      dibagikan. Tombol "Tandai selesai" dan catatan pribadi tidak muncul di sini
      karena pratinjau tidak menyentuh data member.
    </p>
  </div>
</div>

<div class="materi">
  <aside class="toc">
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
      </div>
    </div>

    <?php if (count($semua) > 1): ?>
      <div class="<?= komp_kartu_kelas('mt-4 overflow-hidden') ?>">
        <div class="p-5">
          <p class="m-0 mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[.14em] text-kd-muted">
            <?= komp_ikon('buku', 'h-[14px] w-[14px] text-kd-accent') ?>
            Semua Bagian
          </p>
          <nav class="flex flex-col gap-0.5">
            <?php foreach ($semua as $r):
              $rn   = (int)$r['urutan'];
              $kini = $rn === $no; ?>
              <a class="kd-rel-item<?= $kini ? ' kd-rel-kini' : '' ?>"
                 href="_lihat.php?k=<?= KUNCI_LIHAT ?>&amp;b=<?= $rn ?>">
                <span class="<?= $kini ? 'text-kd-accent' : 'text-kd-muted2' ?>">
                  <?= komp_ikon($kini ? 'panah' : 'kotak', 'h-[13px] w-[13px]') ?>
                </span>
                <span class="kd-meta shrink-0 text-kd-muted2"><?= str_pad((string)$rn, 2, '0', STR_PAD_LEFT) ?></span>
                <span class="min-w-0 flex-1 truncate"><?= e($r['judul']) ?></span>
              </a>
            <?php endforeach; ?>
          </nav>
        </div>
      </div>
    <?php endif; ?>
  </aside>

  <div class="isi-materi">
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
          <?= komp_meta('jam', $menit . ' menit baca') ?>
          <?php if ($langkah > 0): ?><?= komp_meta('buku', $langkah . ' bagian') ?><?php endif; ?>
        </div>
      </div>
    </header>

    <div data-materi-isi><?= $html ?></div>
  </div>
</div>

<?php foot_html(); ?>
