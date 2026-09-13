<?php
// admin_skill.php — kelola paket skill: unggah, atur judul/akses/urutan, hapus.
declare(strict_types=1);
require __DIR__ . '/_boot.php';
require __DIR__ . '/_skill.php';

$admin = require_admin();
$pdo   = db();

/** Tebak judul manusiawi dari nama berkas: "hermes-agent.zip" → "Hermes Agent". */
function skill_judul_dari_berkas(string $berkas): string
{
    $dasar = (string)pathinfo($berkas, PATHINFO_FILENAME);
    $dasar = str_replace(['-', '_'], ' ', $dasar);
    return ucwords(trim($dasar));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $aksi = (string)($_POST['aksi'] ?? '');

    // --- Tambah paket baru: unggah berkas ATAU pakai berkas yang sudah ada ---
    if ($aksi === 'tambah') {
        $judul = trim((string)($_POST['judul'] ?? ''));
        $ket   = trim((string)($_POST['keterangan'] ?? ''));
        $akses = ($_POST['akses'] ?? 'reguler') === 'premium' ? 'premium' : 'reguler';
        $urut  = (int)($_POST['urutan'] ?? 0);
        $pilih = basename((string)($_POST['berkas_ada'] ?? ''));

        try {
            if ($pilih !== '' && is_file(skill_dir() . '/' . $pilih)) {
                // Pakai berkas yang sudah ada: tidak menyentuh unggahan sama sekali.
                $berkas = $pilih;
                $ukuran = (int)filesize(skill_dir() . '/' . $berkas);
                if ($judul === '') $judul = skill_judul_dari_berkas($berkas);
                if ($urut <= 0) {
                    $urut = 1 + (int)$pdo->query('SELECT COALESCE(MAX(urutan),0) FROM ' . t('skills'))->fetchColumn();
                }
            } else {
                [$berkas, $ukuran] = skill_simpan_unggahan($_FILES['berkas'] ?? []);
                if ($judul === '') $judul = skill_judul_dari_berkas($berkas);
                if ($urut <= 0) {
                    $urut = 1 + (int)$pdo->query('SELECT COALESCE(MAX(urutan),0) FROM ' . t('skills'))->fetchColumn();
                }
            }

            if ($judul === '') throw new RuntimeException('Judul paket belum diisi.');
            if (mb_strlen($judul) > 190) $judul = mb_substr($judul, 0, 190);

            $pdo->prepare('INSERT INTO ' . t('skills') .
                ' (judul, keterangan, berkas, ukuran, akses, urutan, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())')
                ->execute([$judul, mb_substr($ket, 0, 500), $berkas, $ukuran, $akses, $urut]);

            audit('skill_tambah', (int)$admin['id'], "$judul ($berkas)");
            flash_set('ok', "Paket \"$judul\" ditambahkan.");
        } catch (RuntimeException $ex) {
            flash_set('err', $ex->getMessage());
        }
        redirect('admin_skill.php');
    }

    // --- Simpan perubahan: judul, keterangan, akses, urutan, aktif ---
    if ($aksi === 'ubah') {
        $id = (int)($_POST['id'] ?? 0);
        $s  = $id > 0 ? skill_satu($id) : null;
        if ($s) {
            $judul = trim((string)($_POST['judul'] ?? '')) ?: (string)$s['judul'];
            $ket   = trim((string)($_POST['keterangan'] ?? ''));
            $akses = ($_POST['akses'] ?? 'reguler') === 'premium' ? 'premium' : 'reguler';
            $urut  = (int)($_POST['urutan'] ?? 0);
            $aktif = !empty($_POST['aktif']) ? 1 : 0;

            // Unggah pengganti bersifat opsional: kalau tidak ada berkas baru,
            // berkas lama tetap dipakai.
            $berkas = (string)$s['berkas'];
            $ukuran = (int)$s['ukuran'];
            if (!empty($_FILES['berkas']['name'])) {
                try {
                    [$berkasBaru, $ukuranBaru] = skill_simpan_unggahan($_FILES['berkas']);
                    skill_hapus_berkas($berkas);
                    $berkas = $berkasBaru;
                    $ukuran = $ukuranBaru;
                } catch (RuntimeException $ex) {
                    flash_set('err', 'Berkas pengganti ditolak: ' . $ex->getMessage());
                    redirect('admin_skill.php');
                }
            }

            $pdo->prepare('UPDATE ' . t('skills') .
                ' SET judul = ?, keterangan = ?, berkas = ?, ukuran = ?, akses = ?, urutan = ?, aktif = ?, updated_at = NOW()
                   WHERE id = ?')
                ->execute([mb_substr($judul, 0, 190), mb_substr($ket, 0, 500), $berkas, $ukuran, $akses, $urut, $aktif, $id]);

            audit('skill_ubah', (int)$admin['id'], "id=$id $judul akses=$akses aktif=$aktif");
            flash_set('ok', "Paket \"$judul\" disimpan.");
        }
        redirect('admin_skill.php');
    }

    // --- Hapus paket beserta berkasnya ---
    if ($aksi === 'hapus') {
        $id = (int)($_POST['id'] ?? 0);
        $s  = $id > 0 ? skill_satu($id) : null;
        if ($s) {
            skill_hapus_berkas((string)$s['berkas']);
            $pdo->prepare('DELETE FROM ' . t('skills') . ' WHERE id = ?')->execute([$id]);
            audit('skill_hapus', (int)$admin['id'], 'id=' . $id . ' ' . $s['judul']);
            flash_set('ok', "Paket \"{$s['judul']}\" dihapus.");
        }
        redirect('admin_skill.php');
    }
}

$daftar  = skill_semua(true);
$adaBerkas = skill_berkas_tersedia();

head_html('Kelola Skill', true);
?>
<p class="small muted" style="margin:0 0 14px"><a href="admin.php">Panel Admin</a> › Paket Skill</p>

<div class="card">
  <h1 style="margin:0 0 6px">Paket Skill</h1>
  <p class="sub" style="margin:0">
    Paket ini yang muncul di halaman <a href="skill.php" target="_blank">Modul Skill</a> dan bisa
    diunduh member. Isinya berkas <span class="mono">.zip</span> berisi folder skill Hermes
    (<span class="mono">SKILL.md</span> + berkas pendukung) yang siap diimport.
  </p>
  <div class="mt-5 flex flex-wrap items-center gap-2">
    <span class="pill"><?= count($daftar) ?> paket</span>
    <span class="pill"><?= count(array_filter($daftar, fn($r) => ($r['akses'] ?? '') === 'premium')) ?> khusus VIP</span>
    <a class="pill" href="skill.php" target="_blank">Lihat halaman member</a>
  </div>
</div>

<div class="card">
  <h2 style="margin-top:0">Tambah paket</h2>
  <p class="sub" style="margin:0 0 14px">
    Cara paling gampang bikin zip-nya: taruh folder skill di
    <span class="mono">skills/…</span>, lalu jalankan
    <span class="mono">python paket-skill.py autonomous-ai-agents/hermes-agent</span> dari folder app.
    Hasilnya muncul di daftar <strong>berkas yang sudah ada</strong> di bawah — tinggal dipilih, tanpa unggah.
  </p>
  <form method="post" enctype="multipart/form-data">
    <?= csrf_field() ?>
    <input type="hidden" name="aksi" value="tambah">
    <div class="row">
      <div style="flex:2">
        <label for="judul">Judul paket</label>
        <input id="judul" name="judul" placeholder="misalnya: Kelola Email otomatis">
        <p class="hint">Boleh dikosongkan — nanti diisi otomatis dari nama berkas.</p>
      </div>
      <div>
        <label for="akses">Tingkat akses</label>
        <select id="akses" name="akses">
          <option value="reguler">Reguler (semua member)</option>
          <option value="premium">⭐ Premium / VVIP</option>
        </select>
      </div>
      <div style="flex:0 0 120px">
        <label for="urutan">Urutan</label>
        <input id="urutan" name="urutan" type="number" min="0" placeholder="otomatis">
      </div>
    </div>

    <label for="keterangan">Keterangan singkat</label>
    <input id="keterangan" name="keterangan" placeholder="Satu baris: paket ini buat apa">

    <div class="row" style="margin-top:6px">
      <div style="flex:1 1 320px">
        <label for="berkas">Unggah berkas .zip (maks 12 MB)</label>
        <input id="berkas" name="berkas" type="file" accept=".zip,application/zip">
      </div>
      <div style="flex:1 1 320px">
        <label for="berkas_ada">…atau pakai berkas yang sudah ada</label>
        <select id="berkas_ada" name="berkas_ada">
          <option value="">— pilih berkas —</option>
          <?php foreach ($adaBerkas as $f => $sz): ?>
            <option value="<?= e($f) ?>"><?= e($f) ?> (<?= skill_ukuran_teks($sz) ?>)</option>
          <?php endforeach; ?>
        </select>
        <p class="hint">Kalau berkas sudah ada, unggahan di kiri diabaikan.</p>
      </div>
    </div>

    <p style="margin-top:14px"><button class="btn" type="submit">Tambah paket</button></p>
  </form>
</div>

<?php if (!$daftar): ?>
  <div class="card"><p class="muted" style="margin:0">Belum ada paket skill. Tambahkan lewat formulir di atas.</p></div>
<?php else: ?>
  <?php foreach ($daftar as $s): ?>
    <div class="card">
      <form method="post" enctype="multipart/form-data">
        <?= csrf_field() ?>
        <input type="hidden" name="aksi" value="ubah">
        <input type="hidden" name="id" value="<?= (int)$s['id'] ?>">

        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px">
          <strong style="font-size:15px"><?= e($s['judul']) ?></strong>
          <span class="pill <?= ($s['akses'] ?? '') === 'premium' ? 'ok' : '' ?>">
            <?= ($s['akses'] ?? '') === 'premium' ? '⭐ Premium / VVIP' : 'Reguler' ?>
          </span>
          <?php if ((int)$s['aktif'] !== 1): ?><span class="badge belum">Nonaktif</span><?php endif; ?>
          <span class="badge mulai"><?= (int)$s['unduhan'] ?>× diunduh</span>
          <span class="badge belum"><?= e($s['berkas']) ?> · <?= skill_ukuran_teks((int)$s['ukuran']) ?></span>
        </div>

        <div class="row">
          <div style="flex:2">
            <label>Judul</label>
            <input name="judul" value="<?= e($s['judul']) ?>">
          </div>
          <div>
            <label>Tingkat akses</label>
            <select name="akses">
              <option value="reguler" <?= ($s['akses'] ?? '') === 'reguler' ? 'selected' : '' ?>>Reguler (semua member)</option>
              <option value="premium" <?= ($s['akses'] ?? '') === 'premium' ? 'selected' : '' ?>>⭐ Premium / VVIP</option>
            </select>
          </div>
          <div style="flex:0 0 110px">
            <label>Urutan</label>
            <input name="urutan" type="number" min="0" value="<?= (int)$s['urutan'] ?>">
          </div>
        </div>

        <label>Keterangan</label>
        <input name="keterangan" value="<?= e($s['keterangan']) ?>">

        <div class="row" style="margin-top:6px">
          <div style="flex:1 1 300px">
            <label>Ganti berkas (opsional)</label>
            <input name="berkas" type="file" accept=".zip,application/zip">
          </div>
          <div style="flex:0 0 auto;display:flex;align-items:flex-end;gap:16px;padding-bottom:4px">
            <label style="display:flex;align-items:center;gap:8px;margin:0">
              <input type="checkbox" name="aktif" value="1" <?= (int)$s['aktif'] === 1 ? 'checked' : '' ?>
                     style="width:auto;margin:0">
              Tampilkan ke member
            </label>
          </div>
        </div>

        <div class="row" style="margin-top:14px">
          <button class="btn" type="submit" style="flex:0 0 auto">Simpan perubahan</button>
          <a class="btn ghost" style="flex:0 0 auto" href="unduh.php?id=<?= (int)$s['id'] ?>" target="_blank">Uji unduh</a>
        </div>
      </form>

      <form method="post" style="margin-top:10px"
            onsubmit="return confirm('Hapus paket &quot;<?= e($s['judul']) ?>&quot; beserta berkasnya?')">
        <?= csrf_field() ?>
        <input type="hidden" name="aksi" value="hapus">
        <input type="hidden" name="id" value="<?= (int)$s['id'] ?>">
        <button class="btn ghost" type="submit" style="flex:0 0 auto">Hapus paket ini</button>
      </form>
    </div>
  <?php endforeach; ?>
<?php endif; ?>
<?php foot_html();
