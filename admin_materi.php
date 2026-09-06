<?php
// admin_materi.php — daftar Bagian + editor markdown dengan pratinjau.
declare(strict_types=1);
require __DIR__ . '/_boot.php';
require __DIR__ . '/_markdown.php';
require __DIR__ . '/_progress.php';

$admin = require_admin();

$edit = (int)($_GET['b'] ?? 0);
$pratinjau = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $aksi = (string)($_POST['aksi'] ?? '');

    // Nomor Bagian datang dari field tersembunyi; ?b= dipakai sebagai cadangan
    // supaya form tetap benar kalau dibuka langsung dengan query string.
    $urutan  = (int)($_POST['urutan'] ?? ($_GET['b'] ?? 0));
    $judul   = trim((string)($_POST['judul'] ?? ''));
    $ringkas = trim((string)($_POST['ringkas'] ?? ''));
    $isi     = (string)($_POST['isi_md'] ?? '');

    if ($aksi === 'pratinjau') {
        $edit = $urutan;
        $pratinjau = md_to_html($isi);
        // Tampilkan kembali isi yang sedang diketik, bukan yang di database.
        $draf = ['urutan' => $urutan, 'judul' => $judul, 'ringkas' => $ringkas, 'isi_md' => $isi];
    }

    if ($aksi === 'simpan') {
        if ($urutan < 1 || $judul === '') {
            flash_set('err', 'Nomor Bagian dan judul wajib diisi.');
            $edit = $urutan;
        } else {
            db()->prepare('INSERT INTO ' . t('content') . '
                (urutan, judul, ringkas, isi_md, updated_at)
                VALUES (?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE
                  judul = VALUES(judul), ringkas = VALUES(ringkas),
                  isi_md = VALUES(isi_md), updated_at = NOW()')
                ->execute([$urutan, mb_substr($judul, 0, 190), mb_substr($ringkas, 0, 255), $isi]);
            audit('materi_simpan', (int)$admin['id'], "bagian=$urutan");
            flash_set('ok', "Bagian $urutan disimpan. Member akan melihat badge “Materi Baru”.");
            redirect('admin_materi.php');
        }
    }

    if ($aksi === 'hapus') {
        $urutan = (int)($_POST['urutan'] ?? 0);
        db()->prepare('DELETE FROM ' . t('content') . ' WHERE urutan = ?')->execute([$urutan]);
        audit('materi_hapus', (int)$admin['id'], "bagian=$urutan");
        flash_set('ok', "Bagian $urutan dihapus.");
        redirect('admin_materi.php');
    }
}

$list = bagian_semua();
$row  = null;
if ($edit > 0) {
    $row = $draf ?? bagian_satu($edit) ?? ['urutan' => $edit, 'judul' => '', 'ringkas' => '', 'isi_md' => ''];
}

head_html('Edit materi', true);
?>
<p class="small muted" style="margin:0 0 14px"><a href="admin.php">Panel Admin</a> › Materi</p>

<div class="card">
  <h2 style="margin-top:0">Daftar Bagian</h2>
  <?php if (!$list): ?>
    <p class="muted">Belum ada materi.</p>
  <?php else: ?>
    <table class="data">
      <tr><th style="width:50px">No</th><th>Judul</th><th>Diperbarui</th><th></th></tr>
      <?php foreach ($list as $b): ?>
        <tr>
          <td><?= (int)$b['urutan'] ?></td>
          <td>
            <?= e($b['judul']) ?><br>
            <span class="muted small"><?= e($b['ringkas']) ?></span>
          </td>
          <td class="small muted"><?= e(date('j/n/y H:i', strtotime((string)$b['updated_at']))) ?></td>
          <td style="white-space:nowrap">
            <a class="btn ghost" style="min-height:36px;padding:6px 12px"
               href="admin_materi.php?b=<?= (int)$b['urutan'] ?>">Edit</a>
            <a class="btn ghost" style="min-height:36px;padding:6px 12px"
               href="materi.php?b=<?= (int)$b['urutan'] ?>">Lihat</a>
          </td>
        </tr>
      <?php endforeach; ?>
    </table>
  <?php endif; ?>
  <p style="margin-top:16px">
    <a class="btn" href="admin_materi.php?b=<?= count($list) + 1 ?>">Tambah Bagian baru</a>
  </p>
</div>

<?php if ($row): ?>
<div class="card">
  <h2 style="margin-top:0">
    <?= bagian_satu((int)$row['urutan']) ? 'Edit' : 'Bagian baru' ?>: nomor <?= (int)$row['urutan'] ?>
  </h2>
  <form method="post">
    <?= csrf_field() ?>
    <input type="hidden" name="urutan" value="<?= (int)$row['urutan'] ?>">

    <div class="row">
      <div>
        <label for="judul">Judul</label>
        <input id="judul" name="judul" required maxlength="190" value="<?= e($row['judul']) ?>">
      </div>
      <div>
        <label for="ringkas">Ringkasan satu baris</label>
        <input id="ringkas" name="ringkas" maxlength="255" value="<?= e($row['ringkas']) ?>">
      </div>
    </div>

    <label for="isi_md">Isi materi</label>
    <textarea id="isi_md" name="isi_md" rows="22" spellcheck="false"
              style="font-family:ui-monospace,Consolas,monospace;font-size:13.5px"><?= e($row['isi_md']) ?></textarea>
    <p class="hint" data-hint-md>
      Didukung: <span class="mono"># judul</span>, <span class="mono">**tebal**</span>,
      <span class="mono">*miring*</span>, <span class="mono">`kode`</span>,
      blok <span class="mono">```</span>, daftar <span class="mono">-</span> dan
      <span class="mono">1.</span>, kutipan <span class="mono">&gt;</span>,
      tautan <span class="mono">[teks](https://…)</span>.
      HTML mentah tidak dieksekusi — ini disengaja untuk keamanan.
    </p>
    <p class="hint" data-hint-md>
      <strong>Kartu penenang (khusus pembaca gaptek):</strong>
      <span class="mono">:::aman</span> untuk menyebut apa yang bisa &amp; TIDAK bisa
      berubah plus cara membatalkan (ini yang paling menurunkan rasa takut
      merusak laptop), <span class="mono">:::periksa</span> untuk titik periksa
      "kamu sudah benar kalau bisa lihat X di layar", dan
      <span class="mono">:::opsional</span> untuk pendalaman yang boleh dilewati.
    </p>

    <p class="hint" data-hint-md>
      <strong>Kartu warna (paling penting):</strong> tulis pagar
      <span class="mono">:::jenis Judul kartu</span> di baris sendiri, isi di
      bawahnya, lalu tutup dengan <span class="mono">:::</span>.
      Jenis yang tersedia:
      <span class="mono">cerita</span> (pembuka bercerita),
      <span class="mono">hasil</span> (janji hasil akhir),
      <span class="mono">tips</span>, <span class="mono">awas</span>,
      <span class="mono">salah</span> (cara yang salah),
      <span class="mono">insight</span> (yang jarang dibahas),
      <span class="mono">catat</span>, <span class="mono">waktu</span>.
      Judulnya opsional — kalau dikosongkan, dipakai judul bawaan tiap jenis.
    </p>
    <p class="hint" data-hint-md>
      <strong>Checklist:</strong> <span class="mono">- [ ] belum</span> dan
      <span class="mono">- [x] sudah</span> — jadi kotak centang, bukan titik daftar.
      <strong>Tabel:</strong> baris <span class="mono">| a | b |</span> lalu
      <span class="mono">|---|---|</span> di baris kedua.
      <strong>Kartu section:</strong> otomatis — setiap
      <span class="mono">##</span> jadi satu kartu bernomor,
      <span class="mono">###</span> jadi sub-kartu di dalamnya.
    </p>
    <p class="hint" data-hint-md>
      <strong>Gambar:</strong> <span class="mono">![keterangan](https://…/gambar.png)</span>.
      Kalau ditulis di baris sendiri, keterangannya tampil sebagai teks di bawah
      gambar. Bisa juga jalur di hosting sendiri, mis.
      <span class="mono">gambar/langkah-1.png</span>.
    </p>
    <p class="hint" data-hint-md>
      <strong>Video:</strong> tulis satu baris sendiri
      <span class="mono">@video https://youtube.com/shorts/XXXX Judul video</span>
      (judul opsional). Tautan YouTube bentuk apa pun boleh —
      <span class="mono">shorts/</span>, <span class="mono">watch?v=</span>,
      atau <span class="mono">youtu.be/</span>. Shorts otomatis dipasang tegak.
    </p>

    <p class="hint" data-hint-visual hidden>
      <strong>Cara pakai:</strong> tulis seperti di Word. Tombol
      <strong>kartu</strong> (ikon balon) memasang kartu berwarna — pilih
      jenisnya dari daftar. Tombol <strong>checklist</strong> membuat kotak
      centang; klik kotaknya untuk menandai selesai. Ada juga tombol video,
      gambar, tabel, dan blok kode. Judul dipilih dari daftar
      <strong>Jenis teks</strong>: <em>Judul kartu</em> jadi satu kartu
      bernomor di halaman member, <em>Sub-kartu</em> jadi bagian di dalamnya.
    </p>
    <p class="hint" data-hint-visual hidden>
      Yang disimpan tetap format Markdown app ini, jadi materi lama tetap bisa
      dibuka dan halaman member tidak berubah cara kerjanya. Kalau perlu
      mengetik pagar <span class="mono">:::</span> langsung, pindah ke tab
      <strong>Markdown</strong>.
    </p>

    <p style="margin-top:18px">
      <button class="btn" name="aksi" value="simpan" type="submit">Simpan</button>
      <button class="btn ghost" name="aksi" value="pratinjau" type="submit">Pratinjau</button>
      <!-- Kerangka modul: isi editor dengan pola PAS lengkap supaya modul baru
           tidak pernah dimulai dari halaman kosong. Kerangkanya disimpan di
           textarea tersembunyi (bukan di dalam atribut) supaya baris barunya
           tetap utuh dan tidak perlu dilolosi dua kali. -->
      <button class="btn ghost" type="button" data-kerangka="isi_md">Sisipkan kerangka modul</button>
      <a class="btn ghost" href="admin_materi.php">Batal</a>
    </p>
    <textarea id="kerangka-modul" hidden aria-hidden="true" tabindex="-1"><?= e(komp_kerangka_modul()) ?></textarea>
    <p class="hint">
      Tombol <strong>Sisipkan kerangka modul</strong> menempelkan pola lengkap
      (cerita pembuka → masalah → langkah → janji hasil → checklist) ke editor.
      Kalau editor sudah ada isinya, kerangka ditambahkan di bawahnya, tidak menimpa.
    </p>
  </form>

  <?php if (bagian_satu((int)$row['urutan'])): ?>
    <form method="post" style="margin-top:12px"
          data-konfirmasi="Hapus Bagian <?= (int)$row['urutan'] ?>? Progres member untuk Bagian ini ikut hilang dari tampilan.">
      <?= csrf_field() ?>
      <input type="hidden" name="aksi" value="hapus">
      <input type="hidden" name="urutan" value="<?= (int)$row['urutan'] ?>">
      <button class="btn danger" type="submit">Hapus Bagian ini</button>
    </form>
  <?php endif; ?>
</div>

<?php if ($pratinjau !== ''): ?>
<div class="card">
  <h2 style="margin-top:0">Pratinjau</h2>
  <p class="hint">Belum disimpan. Klik Simpan kalau sudah cocok.</p>
  <div class="isi-materi"><?= $pratinjau ?></div>
</div>
<?php endif; ?>
<?php endif; ?>

<?php
// Editor visual hanya dimuat saat ada form editor di halaman ini. TinyMCE 1,3 MB
// — tidak ada gunanya diunduh saat admin cuma melihat daftar Bagian.
$skripHalaman = [];
if ($edit > 0 && $row !== null) {
    $skripHalaman = ['tinymce/tinymce.min.js', 'md-editor.js?v=1', 'editor-materi.js?v=1'];
}
foot_html($skripHalaman);
