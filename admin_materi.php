<?php
// admin_materi.php — daftar Bagian + editor markdown dengan pratinjau.
declare(strict_types=1);
require __DIR__ . '/_boot.php';
require __DIR__ . '/_markdown.php';
require __DIR__ . '/_progress.php';
require __DIR__ . '/_lampiran.php';

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
    $akses   = in_array($_POST['akses'] ?? '', ['reguler', 'premium'], true) ? $_POST['akses'] : 'reguler';

    // ---- Lampiran: ditempel ke satu Bagian, bisa diunduh member ----
    // Dipisah dari aksi `simpan` materi supaya mengunggah berkas tidak pernah
    // menulis ulang isi materi — risiko terbesar di halaman ini justru
    // tertimpanya tulisan yang sudah disusun lama.
    if ($aksi === 'lampir_tambah') {
        $edit = $urutan;
        try {
            [$berkas, $ukuran] = lamp_simpan_unggahan($_FILES['berkas_lampiran'] ?? []);
            $judulL = trim((string)($_POST['judul_lampiran'] ?? ''));
            if ($judulL === '') {
                // Judul dikosongkan: pakai nama berkasnya sebagai judul,
                // huruf pertama tiap kata dibesarkan biar enak dibaca.
                $judulL = ucwords(trim(str_replace(['-', '_'], ' ', (string)pathinfo(
                    (string)($_FILES['berkas_lampiran']['name'] ?? 'lampiran'), PATHINFO_FILENAME))));
            }
            $urutL = (int)($_POST['urutan_lampiran'] ?? 0);
            if ($urutL <= 0) {
                $st = db()->prepare('SELECT COALESCE(MAX(urutan),0) FROM ' . t('lampiran') . ' WHERE bagian = ?');
                $st->execute([$urutan]);
                $urutL = 1 + (int)$st->fetchColumn();
            }
            db()->prepare('INSERT INTO ' . t('lampiran') . '
                (bagian, judul, keterangan, berkas, ukuran, urutan, aktif, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())')
                ->execute([$urutan, mb_substr($judulL, 0, 190),
                    mb_substr(trim((string)($_POST['keterangan_lampiran'] ?? '')), 0, 500),
                    $berkas, $ukuran, $urutL]);
            audit('lampiran_tambah', (int)$admin['id'], "bagian=$urutan $judulL ($berkas)");
            flash_set('ok', "Lampiran \"$judulL\" ditambahkan ke Bagian $urutan.");
        } catch (RuntimeException $ex) {
            flash_set('err', $ex->getMessage());
        }
        redirect('admin_materi.php?b=' . $urutan);
    }

    if ($aksi === 'lampir_ubah') {
        $id = (int)($_POST['lampiran_id'] ?? 0);
        $l  = $id > 0 ? lamp_satu($id) : null;
        if ($l) {
            $edit = (int)$l['bagian'];
            $judulL = trim((string)($_POST['judul_lampiran'] ?? '')) ?: (string)$l['judul'];
            $ketL   = trim((string)($_POST['keterangan_lampiran'] ?? ''));
            $urutL  = (int)($_POST['urutan_lampiran'] ?? 0);
            $aktifL = !empty($_POST['aktif_lampiran']) ? 1 : 0;

            // Ganti berkas bersifat opsional: kalau tidak ada berkas baru,
            // berkas lama tetap dipakai. Berkas lama baru dihapus SETELAH
            // yang baru berhasil tersimpan.
            $berkas = (string)$l['berkas'];
            $ukuran = (int)$l['ukuran'];
            if (!empty($_FILES['berkas_lampiran']['name'])) {
                try {
                    [$berkasBaru, $ukuranBaru] = lamp_simpan_unggahan($_FILES['berkas_lampiran']);
                    lamp_hapus_berkas($berkas);
                    $berkas = $berkasBaru;
                    $ukuran = $ukuranBaru;
                } catch (RuntimeException $ex) {
                    flash_set('err', 'Berkas pengganti ditolak: ' . $ex->getMessage());
                    redirect('admin_materi.php?b=' . (int)$l['bagian']);
                }
            }

            db()->prepare('UPDATE ' . t('lampiran') . '
                SET judul = ?, keterangan = ?, berkas = ?, ukuran = ?, urutan = ?, aktif = ?, updated_at = NOW()
                WHERE id = ?')
                ->execute([mb_substr($judulL, 0, 190), mb_substr($ketL, 0, 500),
                    $berkas, $ukuran, $urutL, $aktifL, $id]);
            audit('lampiran_ubah', (int)$admin['id'], "id=$id $judulL aktif=$aktifL");
            flash_set('ok', "Lampiran \"$judulL\" disimpan.");
        }
        redirect('admin_materi.php?b=' . $edit);
    }

    if ($aksi === 'lampir_hapus') {
        $id = (int)($_POST['lampiran_id'] ?? 0);
        $l  = $id > 0 ? lamp_satu($id) : null;
        if ($l) {
            $edit = (int)$l['bagian'];
            lamp_hapus_berkas((string)$l['berkas']);
            db()->prepare('DELETE FROM ' . t('lampiran') . ' WHERE id = ?')->execute([$id]);
            audit('lampiran_hapus', (int)$admin['id'], "id=$id {$l['judul']}");
            flash_set('ok', "Lampiran \"{$l['judul']}\" dihapus.");
        }
        redirect('admin_materi.php?b=' . $edit);
    }


    if ($aksi === 'pratinjau') {
        $edit = $urutan;
        $pratinjau = md_to_html($isi);
        // Tampilkan kembali isi yang sedang diketik, bukan yang di database.
        $draf = ['urutan' => $urutan, 'judul' => $judul, 'ringkas' => $ringkas, 'isi_md' => $isi, 'akses' => $akses];
    }

    if ($aksi === 'simpan') {
        if ($urutan < 1 || $judul === '') {
            flash_set('err', 'Nomor Bagian dan judul wajib diisi.');
            $edit = $urutan;
        } else {
            db()->prepare('INSERT INTO ' . t('content') . '
                (urutan, judul, ringkas, isi_md, akses, updated_at)
                VALUES (?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE
                  judul = VALUES(judul), ringkas = VALUES(ringkas),
                  isi_md = VALUES(isi_md), akses = VALUES(akses), updated_at = NOW()')
                ->execute([$urutan, mb_substr($judul, 0, 190), mb_substr($ringkas, 0, 255), $isi, $akses]);
            audit('materi_simpan', (int)$admin['id'], "bagian=$urutan akses=$akses");
            flash_set('ok', "Bagian $urutan ($akses) disimpan.");
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
      <tr><th style="width:50px">No</th><th>Judul</th><th>Akses</th><th>Diperbarui</th><th></th></tr>
      <?php foreach ($list as $b): ?>
        <tr>
          <td><?= (int)$b['urutan'] ?></td>
          <td>
            <?= e($b['judul']) ?><br>
            <span class="muted small"><?= e($b['ringkas']) ?></span>
          </td>
          <td>
            <span class="pill <?= ($b['akses'] ?? 'reguler') === 'premium' ? 'ok' : '' ?>">
              <?= ($b['akses'] ?? 'reguler') === 'premium' ? '⭐ Premium' : 'Reguler' ?>
            </span>
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
  <form method="post" enctype="multipart/form-data">
    <?= csrf_field() ?>
    <input type="hidden" name="urutan" value="<?= (int)$row['urutan'] ?>">

    <div class="row">
      <div style="flex:2">
        <label for="judul">Judul</label>
        <input id="judul" name="judul" required maxlength="190" value="<?= e($row['judul']) ?>">
      </div>
      <div style="flex:2">
        <label for="ringkas">Ringkasan satu baris</label>
        <input id="ringkas" name="ringkas" maxlength="255" value="<?= e($row['ringkas']) ?>">
      </div>
      <div style="flex:1">
        <label for="akses">Tingkat Akses</label>
        <select id="akses" name="akses" style="width:100%;padding:10px;border-radius:8px;background:var(--bg-soft,#2b2f32);color:var(--fg,#f2f7fc);border:1px solid rgba(255,255,255,.14)">
          <option value="reguler" <?= ($row['akses'] ?? 'reguler') === 'reguler' ? 'selected' : '' ?>>Reguler (Semua Member)</option>
          <option value="premium" <?= ($row['akses'] ?? 'reguler') === 'premium' ? 'selected' : '' ?>>⭐ Premium / VVIP</option>
        </select>
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

<?php
// ---- Lampiran Bagian ini ----
// Dibuat sebagai kartu & form TERPISAH dari form materi di atas, bukan
// ditempelkan di dalamnya. Alasannya keselamatan data: satu form yang sama
// berarti setiap kali admin mengunggah lampiran, isi materi ikut terkirim dan
// ditulis ulang. Kalau ada satu saja kesalahan di sisi itu, tulisan yang sudah
// disusun lama bisa tertimpa. Dipisah begini, mengunggah berkas tidak pernah
// menyentuh tabel content.
$lampiran = bagian_satu((int)$row['urutan']) ? lamp_semua((int)$row['urutan'], true) : [];
$adaBagian = (bool)bagian_satu((int)$row['urutan']);
?>
<?php if ($adaBagian): ?>
<div class="card">
  <h2 style="margin-top:0">📎 Lampiran Bagian <?= (int)$row['urutan'] ?></h2>
  <p class="sub" style="margin:0 0 14px">
    Berkas di sini muncul sebagai tombol unduh di halaman materi member.
    Cocok untuk menempelkan berkas skill <span class="mono">.md</span> yang bisa
    mereka pakai langsung. Izin unduhnya <strong>ikut tingkat akses Bagian ini</strong> —
    jadi kalau Bagian ini Premium, lampirannya terkunci otomatis.
  </p>

  <?php if (!$lampiran): ?>
    <p class="muted" style="margin:0 0 16px">Belum ada lampiran di Bagian ini.</p>
  <?php else: ?>
    <?php foreach ($lampiran as $l): ?>
      <div style="border:1px solid var(--line);border-radius:10px;padding:14px;margin-bottom:12px">
        <form method="post" enctype="multipart/form-data">
          <?= csrf_field() ?>
          <input type="hidden" name="aksi" value="lampir_ubah">
          <input type="hidden" name="lampiran_id" value="<?= (int)$l['id'] ?>">

          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px">
            <strong><?= lamp_lambang((string)$l['berkas']) ?> <?= e($l['judul']) ?></strong>
            <span class="badge mulai"><?= (int)$l['unduhan'] ?>× diunduh</span>
            <span class="badge belum"><?= e($l['berkas']) ?> · <?= lamp_ukuran_teks((int)$l['ukuran']) ?></span>
            <?php if ((int)$l['aktif'] !== 1): ?><span class="badge belum">Disembunyikan</span><?php endif; ?>
          </div>

          <div class="row">
            <div style="flex:2">
              <label>Judul lampiran</label>
              <input name="judul_lampiran" value="<?= e($l['judul']) ?>">
              <p class="hint">Ini yang jadi nama berkas saat member mengunduh.</p>
            </div>
            <div style="flex:0 0 110px">
              <label>Urutan</label>
              <input name="urutan_lampiran" type="number" min="0" value="<?= (int)$l['urutan'] ?>">
            </div>
          </div>

          <label>Keterangan</label>
          <input name="keterangan_lampiran" value="<?= e($l['keterangan']) ?>"
                 placeholder="Satu baris: berkas ini buat apa">

          <div class="row" style="margin-top:6px">
            <div style="flex:1 1 300px">
              <label>Ganti berkas (opsional)</label>
              <input name="berkas_lampiran" type="file"
                     accept=".md,.markdown,.txt,.zip,.pdf,.json">
              <p class="hint">Dikosongkan = berkas lama tetap dipakai.</p>
            </div>
            <div style="flex:0 0 auto;display:flex;align-items:flex-end;padding-bottom:4px">
              <label style="display:flex;align-items:center;gap:8px;margin:0">
                <input type="checkbox" name="aktif_lampiran" value="1"
                       <?= (int)$l['aktif'] === 1 ? 'checked' : '' ?> style="width:auto;margin:0">
                Tampilkan ke member
              </label>
            </div>
          </div>

          <div class="row" style="margin-top:14px">
            <button class="btn" type="submit" style="flex:0 0 auto">Simpan lampiran</button>
            <a class="btn ghost" style="flex:0 0 auto" href="unduh-lampiran.php?id=<?= (int)$l['id'] ?>"
               target="_blank">Uji unduh</a>
          </div>
        </form>

        <form method="post" style="margin-top:10px"
              data-konfirmasi="Hapus lampiran &quot;<?= e($l['judul']) ?>&quot; beserta berkasnya?">
          <?= csrf_field() ?>
          <input type="hidden" name="aksi" value="lampir_hapus">
          <input type="hidden" name="lampiran_id" value="<?= (int)$l['id'] ?>">
          <button class="btn ghost" type="submit">Hapus lampiran ini</button>
        </form>
      </div>
    <?php endforeach; ?>
  <?php endif; ?>

  <hr class="my-4 border-0 border-t border-kd-line">

  <h3 style="margin:0 0 10px">Tambah lampiran</h3>
  <form method="post" enctype="multipart/form-data">
    <?= csrf_field() ?>
    <input type="hidden" name="aksi" value="lampir_tambah">
    <input type="hidden" name="urutan" value="<?= (int)$row['urutan'] ?>">

    <label for="berkas_lampiran">Berkas yang ditempel</label>
    <input id="berkas_lampiran" name="berkas_lampiran" type="file" required
           accept=".md,.markdown,.txt,.zip,.pdf,.json">
    <p class="hint">
      Boleh: <span class="mono">.md</span>, <span class="mono">.markdown</span>,
      <span class="mono">.txt</span>, <span class="mono">.zip</span>,
      <span class="mono">.pdf</span>, <span class="mono">.json</span> — maksimal 12 MB.
      Untuk skill, tempel berkas <span class="mono">SKILL.md</span>-nya.
    </p>

    <div class="row">
      <div style="flex:2">
        <label for="judul_lampiran">Judul lampiran</label>
        <input id="judul_lampiran" name="judul_lampiran"
               placeholder="misalnya: Skill deploy otomatis">
        <p class="hint">Boleh dikosongkan — nanti diisi dari nama berkasnya.</p>
      </div>
      <div style="flex:0 0 110px">
        <label for="urutan_lampiran">Urutan</label>
        <input id="urutan_lampiran" name="urutan_lampiran" type="number" min="0" placeholder="otomatis">
      </div>
    </div>

    <label for="keterangan_lampiran">Keterangan</label>
    <input id="keterangan_lampiran" name="keterangan_lampiran"
           placeholder="Satu baris: berkas ini buat apa">

    <p style="margin-top:14px"><button class="btn" type="submit">Tempelkan lampiran</button></p>
  </form>
</div>
<?php endif; ?>

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
