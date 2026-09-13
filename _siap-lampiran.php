<?php
// _siap-lampiran.php — SEKALI PAKAI. Siapkan tempat penyimpanan lampiran di
// hosting: buat tabel `lampiran` dan folder penyimpanan DI LUAR public_html.
//
// Kenapa perlu skrip, bukan cukup upload: FTP tidak bisa membuat folder, dan
// tabel baru harus dibuat di database hosting (database lokal tidak ikut naik).
// Kenapa disimpan di luar public_html: hosting ini LiteSpeed dan TERBUKTI
// mengabaikan .htaccess untuk berkas — folder bisa 403 tapi berkasnya tetap
// terkirim ke siapa pun yang tahu namanya.
//
// WAJIB DICABUT setelah dipakai (bash hapus-siap-lampiran.sh): skrip ini bisa
// mengubah skema database hanya dengan kunci di alamat URL.
declare(strict_types=1);
require __DIR__ . '/_boot.php';
require __DIR__ . '/_lampiran.php';

if (($_GET['k'] ?? '') !== 'siap-lampiran-7f31bd') {
    http_response_code(404);
    exit('Tidak ditemukan.');
}

header('Content-Type: text/plain; charset=utf-8');

echo "== 1. Tabel lampiran ==\n";
try {
    db()->exec('CREATE TABLE IF NOT EXISTS ' . t('lampiran') . ' (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        bagian INT NOT NULL,
        judul VARCHAR(190) NOT NULL,
        keterangan VARCHAR(500) NOT NULL DEFAULT "",
        berkas VARCHAR(190) NOT NULL,
        ukuran INT UNSIGNED NOT NULL DEFAULT 0,
        urutan INT NOT NULL DEFAULT 0,
        unduhan INT UNSIGNED NOT NULL DEFAULT 0,
        aktif TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        KEY idx_bagian (bagian)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
    echo "  tabel siap: " . t('lampiran') . "\n";
    $n = (int)db()->query('SELECT COUNT(*) FROM ' . t('lampiran'))->fetchColumn();
    echo "  isi sekarang: $n lampiran\n";
} catch (Throwable $e) {
    echo "  GAGAL: " . $e->getMessage() . "\n";
}

echo "\n== 2. Folder penyimpanan ==\n";
echo "  dipakai     : " . lamp_dir() . "\n";
echo "  di luar web : " . (lamp_di_luar_publik() ? 'YA (aman)' : 'TIDAK — ini kurang aman') . "\n";
echo "  bisa ditulis: " . (is_writable(lamp_dir()) ? 'YA' : 'TIDAK') . "\n";

$uji = lamp_dir() . '/.uji-tulis';
if (@file_put_contents($uji, 'ok') !== false) {
    echo "  uji tulis   : berhasil\n";
    @unlink($uji);
} else {
    echo "  uji tulis   : GAGAL — periksa izin folder\n";
}

echo "\n== 3. Selesai. Cabut skrip ini sekarang juga.\n";
