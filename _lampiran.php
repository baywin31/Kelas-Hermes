<?php
// _lampiran.php — berkas lampiran yang ditempel ke satu Bagian materi
// (mis. skill .md yang bisa diunduh member di halaman materi itu).
//
// DI MANA BERKAS DISIMPAN — ini keputusan keamanan, bukan selera:
// hosting ini memakai LiteSpeed dan TERBUKTI mengabaikan perintah tolak
// .htaccess pada tingkat BERKAS (folder bisa 403, tapi berkas di dalamnya tetap
// terkirim 200 ke siapa pun). Karena itu lampiran disimpan di
// /home/<akun>/kdsimpan/lampiran — DI LUAR public_html, satu-satunya tempat
// yang tidak punya alamat web sama sekali. Kalau folder itu tidak bisa ditulisi
// (hosting lain), dipakai folder `lampiran/` di dalam app dengan .htaccess
// sebagai lapisan cadangan.
//
// Izin unduh mengikuti TINGKAT AKSES BAGIAN-nya, bukan disimpan terpisah:
// kalau admin mengubah Bagian jadi Premium, lampirannya ikut terkunci dengan
// sendirinya — tidak ada dua tempat yang bisa jadi tidak sinkron.

declare(strict_types=1);

const LAMP_MAX = 12 * 1024 * 1024;   // 12 MB

/** Ekstensi yang diterima. */
function lamp_ext_boleh(): array
{
    return ['md', 'markdown', 'txt', 'zip', 'pdf', 'json'];
}

/**
 * Folder penyimpanan lampiran.
 *   1. di luar public_html  → tidak bisa diakses web (paling aman)
 *   2. lampiran/ di dalam app → cadangan, dilindungi .htaccess
 */
function lamp_dir(): string
{
    static $dir = null;
    if ($dir !== null) return $dir;

    $luar  = dirname(__DIR__, 2) . '/kdsimpan/lampiran';
    $induk = dirname($luar);                       // .../kdsimpan
    if (is_dir($induk) && is_writable($induk)) {
        if (!is_dir($luar)) @mkdir($luar, 0755, true);
        if (is_dir($luar) && is_writable($luar)) return $dir = $luar;
    }

    $dalam = __DIR__ . '/lampiran';
    if (!is_dir($dalam)) @mkdir($dalam, 0755, true);
    return $dir = $dalam;
}

function lamp_di_luar_publik(): bool
{
    return !str_starts_with(lamp_dir(), __DIR__);
}

/** Semua lampiran satu Bagian. */
function lamp_semua(int $bagian, bool $termasukNonaktif = false): array
{
    try {
        $sql = 'SELECT id, bagian, judul, keterangan, berkas, ukuran, urutan, unduhan, aktif
                FROM ' . t('lampiran') . ' WHERE bagian = ?';
        if (!$termasukNonaktif) $sql .= ' AND aktif = 1';
        $sql .= ' ORDER BY urutan, id';
        $st = db()->prepare($sql);
        $st->execute([$bagian]);
        return $st->fetchAll();
    } catch (Throwable $e) {
        return [];   // tabel belum ada (pemasangan lama sebelum migrasi jalan)
    }
}

/** Jumlah lampiran per Bagian: [bagian => jumlah]. */
function lamp_hitung_semua(): array
{
    try {
        $out = [];
        foreach (db()->query('SELECT bagian, COUNT(*) n FROM ' . t('lampiran') .
            ' WHERE aktif = 1 GROUP BY bagian') as $r) {
            $out[(int)$r['bagian']] = (int)$r['n'];
        }
        return $out;
    } catch (Throwable $e) {
        return [];
    }
}

function lamp_satu(int $id): ?array
{
    try {
        $st = db()->prepare('SELECT * FROM ' . t('lampiran') . ' WHERE id = ?');
        $st->execute([$id]);
        return $st->fetch() ?: null;
    } catch (Throwable $e) {
        return null;
    }
}

function lamp_path(array $l): string
{
    return lamp_dir() . '/' . basename((string)$l['berkas']);
}

/** Nama berkas di disk: rapi + akhiran acak supaya tidak bisa ditebak. */
function lamp_nama_aman(string $asli): string
{
    $dasar = strtolower(pathinfo($asli, PATHINFO_FILENAME));
    $dasar = preg_replace('/[^a-z0-9]+/', '-', (string)$dasar) ?? '';
    $dasar = trim((string)$dasar, '-');
    if ($dasar === '') $dasar = 'lampiran';
    $ext = strtolower((string)pathinfo($asli, PATHINFO_EXTENSION));
    return substr($dasar, 0, 60) . '-' . bin2hex(random_bytes(3)) . '.' . $ext;
}

/** Nama unduhan yang enak dibaca pembeli: "skill-deploy.md". */
function lamp_nama_unduhan(array $l): string
{
    $ext   = strtolower((string)pathinfo((string)$l['berkas'], PATHINFO_EXTENSION));
    $judul = preg_replace('/[^A-Za-z0-9 \-_]+/', '', (string)$l['judul']) ?? '';
    $judul = trim((string)preg_replace('/\s+/', ' ', $judul));
    if ($judul === '') $judul = 'lampiran';
    return $judul . ($ext !== '' ? '.' . $ext : '');
}

/**
 * Simpan berkas yang diunggah. Mengembalikan [nama berkas, ukuran]
 * atau melempar RuntimeException dengan pesan siap tampil.
 */
function lamp_simpan_unggahan(array $file): array
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
    if ($ukuran <= 0)         throw new RuntimeException('Berkasnya kosong.');
    if ($ukuran > LAMP_MAX)   throw new RuntimeException('Berkas lebih dari 12 MB.');

    $ext = strtolower((string)pathinfo((string)($file['name'] ?? ''), PATHINFO_EXTENSION));
    if (!in_array($ext, lamp_ext_boleh(), true)) {
        throw new RuntimeException('Jenis berkas .' . $ext . ' tidak diterima. Yang boleh: ' .
            implode(', ', array_map(fn($x) => '.' . $x, lamp_ext_boleh())) . '.');
    }

    $tmp = (string)($file['tmp_name'] ?? '');
    if (!is_uploaded_file($tmp)) throw new RuntimeException('Unggahan tidak sah.');

    // Berkas .zip wajib arsip sah (2 byte pertama "PK"); yang lain cukup
    // dipastikan bisa dibaca. Pemeriksaan ini murah dan menutup berkas yang
    // sengaja dinamai .md padahal isinya skrip.
    if ($ext === 'zip') {
        $fh = @fopen($tmp, 'rb');
        $kepala = $fh ? (string)fread($fh, 2) : '';
        if ($fh) fclose($fh);
        if ($kepala !== 'PK') throw new RuntimeException('Berkas .zip itu bukan arsip yang sah.');
    }

    $dir = lamp_dir();
    if (!is_dir($dir) && !@mkdir($dir, 0755, true)) {
        throw new RuntimeException('Folder penyimpanan lampiran tidak bisa dibuat. Periksa izin tulis hosting.');
    }

    $nama = lamp_nama_aman((string)($file['name'] ?? 'lampiran.md'));
    $tuju = $dir . '/' . $nama;
    if (!move_uploaded_file($tmp, $tuju)) {
        throw new RuntimeException('Gagal menyimpan berkas (periksa izin tulis folder penyimpanan).');
    }
    @chmod($tuju, 0644);

    return [$nama, $ukuran];
}

function lamp_hapus_berkas(string $nama): void
{
    $path = lamp_dir() . '/' . basename($nama);   // basename menolak "../"
    if (is_file($path)) @unlink($path);
}

/** Ikon sederhana menurut jenis berkas (dipakai di daftar & halaman member). */
function lamp_lambang(string $berkas): string
{
    return match (strtolower((string)pathinfo($berkas, PATHINFO_EXTENSION))) {
        'md', 'markdown' => '📄',
        'zip'            => '🗜️',
        'pdf'            => '📕',
        'json'           => '⚙️',
        default          => '📎',
    };
}

function lamp_ukuran_teks(int $b): string
{
    if ($b >= 1048576) return number_format($b / 1048576, 1, ',', '.') . ' MB';
    if ($b >= 1024)    return number_format($b / 1024, 0, ',', '.') . ' KB';
    return $b . ' B';
}
