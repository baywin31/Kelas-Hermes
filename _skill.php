<?php
// _skill.php — simpanan paket skill (unggahan admin) + helper daftar/unduh.
//
// DI MANA BERKAS DISIMPAN — ini keputusan keamanan, bukan selera:
// hosting ini memakai LiteSpeed dan TERBUKTI mengabaikan .htaccess pada tingkat
// berkas (folder bisa 403, tapi .zip-nya tetap terkirim 200 ke siapa pun).
// Karena itu berkas paket ditaruh DI LUAR public_html — di /home/<akun>/kdsimpan
// — satu-satunya tempat yang tidak bisa dijangkau alamat web sama sekali.
// Kalau folder itu tidak bisa ditulisi (hosting lain), dipakai folder
// `unduhan/` di dalam app sebagai cadangan, dan lapisan .htaccess + nama
// berkas acak tetap dipasang sebagai pertahanan berlapis.
//
// Berkas TIDAK disimpan di database: hosting bersama membatasi ukuran DB dan
// kolom BLOB membuat setiap query berat. Semua unduhan lewat unduh.php supaya
// login + gembok tier Premium tetap berlaku.

declare(strict_types=1);

const SKILL_MAX = 12 * 1024 * 1024;   // 12 MB; paket skill biasanya < 1 MB

/**
 * Folder penyimpanan paket. Dipilih sekali per proses:
 *   1. di luar public_html  → tidak bisa diakses web sama sekali (paling aman)
 *   2. unduhan/ di dalam app → cadangan, dilindungi .htaccess + nama acak
 */
function skill_dir(): string
{
    static $dir = null;
    if ($dir !== null) return $dir;

    // Kandidat 1: dua tingkat di atas app. Di hosting ini hasilnya
    // /home/<akun>/kdsimpan — di luar /home/<akun>/public_html.
    $luar = dirname(__DIR__, 2) . '/kdsimpan';
    $induk = dirname($luar);
    if (is_dir($induk) && is_writable($induk)) {
        if (!is_dir($luar)) @mkdir($luar, 0755, true);
        if (is_dir($luar) && is_writable($luar)) return $dir = $luar;
    }

    // Kandidat 2: folder di dalam app.
    $dalam = __DIR__ . '/unduhan';
    if (!is_dir($dalam)) @mkdir($dalam, 0755, true);
    return $dir = $dalam;
}

/** Benar kalau paket tersimpan di luar jangkauan web (tanpa .htaccess). */
function skill_di_luar_publik(): bool
{
    return !str_starts_with(skill_dir(), __DIR__);
}

/** Semua skill, urut sesuai keinginan admin. */
function skill_semua(bool $termasukNonaktif = false): array
{
    $sql = 'SELECT id, judul, keterangan, berkas, ukuran, akses, urutan, unduhan, aktif
            FROM ' . t('skills');
    if (!$termasukNonaktif) $sql .= ' WHERE aktif = 1';
    $sql .= ' ORDER BY urutan, judul';
    try {
        return db()->query($sql)->fetchAll();
    } catch (Throwable $e) {
        return [];   // tabel belum ada (pemasangan lama sebelum migrasi jalan)
    }
}

/** Apakah user ini boleh mengambil skill tersebut. */
function skill_boleh(array $skill, array $user): bool
{
    if (($skill['akses'] ?? 'reguler') !== 'premium') return true;
    return ($user['tier'] ?? 'reguler') === 'premium';
}

function skill_satu(int $id): ?array
{
    try {
        $st = db()->prepare('SELECT * FROM ' . t('skills') . ' WHERE id = ?');
        $st->execute([$id]);
        return $st->fetch() ?: null;
    } catch (Throwable $e) {
        return null;
    }
}

/** Jalur lengkap berkas sebuah skill. */
function skill_path(array $skill): string
{
    return skill_dir() . '/' . basename((string)$skill['berkas']);
}

/** Nama berkas yang aman: tanpa jalur, tanpa karakter aneh, plus akhiran acak. */
function skill_nama_aman(string $asli): string
{
    $dasar = strtolower(pathinfo($asli, PATHINFO_FILENAME));
    $dasar = preg_replace('/[^a-z0-9]+/', '-', (string)$dasar) ?? '';
    $dasar = trim((string)$dasar, '-');
    if ($dasar === '') $dasar = 'skill';
    // Akhiran acak: kalau lapisan .htaccess gagal (pernah terjadi di hosting
    // ini), nama berkasnya tetap tidak bisa ditebak dari judul paketnya.
    return substr($dasar, 0, 60) . '-' . bin2hex(random_bytes(3)) . '.zip';
}

/** Nama berkas yang enak dibaca di folder Download pembeli. */
function skill_nama_unduhan(string $judul): string
{
    $bersih = preg_replace('/[^A-Za-z0-9 \-_]+/', '', $judul) ?? '';
    $bersih = trim((string)preg_replace('/\s+/', ' ', $bersih));
    if ($bersih === '') $bersih = 'skill';
    return $bersih . '.zip';
}

/** Daftar berkas .zip yang ada di folder penyimpanan. */
function skill_berkas_tersedia(): array
{
    $dir = skill_dir();
    if (!is_dir($dir)) return [];
    $out = [];
    foreach (scandir($dir) ?: [] as $f) {
        if ($f === '.' || $f === '..' || $f === '.htaccess') continue;
        if (strtolower((string)pathinfo($f, PATHINFO_EXTENSION)) !== 'zip') continue;
        $out[$f] = (int)filesize($dir . '/' . $f);
    }
    ksort($out);
    return $out;
}

/**
 * Simpan berkas yang diunggah. Mengembalikan [nama berkas, ukuran]
 * atau melempar RuntimeException dengan pesan siap tampil.
 */
function skill_simpan_unggahan(array $file): array
{
    $err = (int)($file['error'] ?? UPLOAD_ERR_NO_FILE);
    if ($err !== UPLOAD_ERR_OK) {
        throw new RuntimeException(match ($err) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'Berkasnya melebihi batas server. Maksimal 12 MB.',
            UPLOAD_ERR_PARTIAL => 'Unggahan terputus di tengah jalan. Coba lagi.',
            UPLOAD_ERR_NO_FILE => 'Belum ada berkas yang dipilih.',
            default            => 'Berkas gagal diunggah (kode ' . $err . ').',
        });
    }

    $ukuran = (int)($file['size'] ?? 0);
    if ($ukuran <= 0)        throw new RuntimeException('Berkasnya kosong.');
    if ($ukuran > SKILL_MAX) throw new RuntimeException('Berkas lebih dari 12 MB. Kecilkan dulu paketnya.');

    $ext = strtolower((string)pathinfo((string)($file['name'] ?? ''), PATHINFO_EXTENSION));
    if ($ext !== 'zip') throw new RuntimeException('Hanya berkas .zip yang diterima.');

    // Ekstensi bisa dipalsukan, jadi 2 byte pertama diperiksa: arsip zip selalu
    // diawali "PK". Tidak memakai ZipArchive karena ekstensi itu sering tidak
    // aktif di hosting bersama.
    $tmp = (string)($file['tmp_name'] ?? '');
    if (!is_uploaded_file($tmp)) throw new RuntimeException('Unggahan tidak sah.');
    $fh = @fopen($tmp, 'rb');
    $kepala = $fh ? (string)fread($fh, 2) : '';
    if ($fh) fclose($fh);
    if ($kepala !== 'PK') throw new RuntimeException('Berkas itu bukan arsip zip yang sah.');

    $dir = skill_dir();
    if (!is_dir($dir) && !@mkdir($dir, 0755, true)) {
        throw new RuntimeException('Folder penyimpanan paket tidak bisa dibuat. Periksa izin tulis hosting.');
    }

    $nama = skill_nama_aman((string)($file['name'] ?? 'skill.zip'));
    $tuju = $dir . '/' . $nama;
    if (!move_uploaded_file($tmp, $tuju)) {
        throw new RuntimeException('Gagal menyimpan berkas (periksa izin tulis folder penyimpanan).');
    }
    @chmod($tuju, 0644);

    return [$nama, $ukuran];
}

/** Hapus berkas fisik (dipanggil saat admin menghapus datanya). */
function skill_hapus_berkas(string $nama): void
{
    $path = skill_dir() . '/' . basename($nama);   // basename menolak "../"
    if (is_file($path)) @unlink($path);
}

function skill_ukuran_teks(int $b): string
{
    if ($b >= 1048576) return number_format($b / 1048576, 1, ',', '.') . ' MB';
    if ($b >= 1024)    return number_format($b / 1024, 0, ',', '.') . ' KB';
    return $b . ' B';
}
