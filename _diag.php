<?php
/**
 * _diag.php — pemeriksa koneksi database, dipakai sekali lalu HAPUS.
 *
 * Cara pakai:
 *   1. Unggah berkas ini ke folder /member/ (sebelah _config.php)
 *   2. Buka https://juraganprompt.biz.id/member/_diag.php?kunci=periksa2026
 *   3. Kirim hasilnya, lalu HAPUS berkas ini
 *
 * Dilindungi kunci supaya tidak bisa dibuka orang lain. Password tidak pernah
 * dicetak — hanya panjangnya, supaya bisa dibedakan "kosong" vs "terisi".
 */
if (($_GET['kunci'] ?? '') !== 'periksa2026') {
    http_response_code(404);
    die('404');
}
header('Content-Type: text/plain; charset=utf-8');

$cfg = __DIR__ . '/_config.php';
echo "1. _config.php ada?  " . (is_file($cfg) ? "YA" : "TIDAK ADA <-- ini masalahnya") . "\n";
if (!is_file($cfg)) exit;

require $cfg;

$perlu = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS', 'TBL'];
echo "\n2. Isi konstanta:\n";
foreach ($perlu as $k) {
    if (!defined($k)) { echo "   $k = BELUM DIDEFINISIKAN <-- masalah\n"; continue; }
    $v = constant($k);
    if ($k === 'DB_PASS') {
        echo "   DB_PASS = " . ($v === '' ? "KOSONG <-- masalah" : strlen($v) . " karakter") . "\n";
    } else {
        echo "   $k = " . var_export($v, true) . "\n";
    }
}

echo "\n3. Percobaan koneksi:\n";
if (!defined('DB_HOST')) { echo "   dilewati, konstanta kurang\n"; exit; }

$dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
try {
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    echo "   BERHASIL tersambung.\n";
    $n = $pdo->query('SELECT COUNT(*) FROM information_schema.tables
                      WHERE table_schema = ' . $pdo->quote(DB_NAME) . '
                        AND table_name LIKE ' . $pdo->quote(TBL . '%'))->fetchColumn();
    echo "   Tabel ber-prefix '" . TBL . "': $n\n";
    echo "   " . ($n > 0 ? "Sudah ter-install." : "Belum ter-install -> buka setup.php.") . "\n";
} catch (PDOException $e) {
    echo "   GAGAL: " . $e->getMessage() . "\n\n";
    $m = $e->getMessage();
    echo "   Artinya: ";
    if (stripos($m, 'Access denied') !== false) {
        echo "user/password salah, ATAU user belum ditambahkan ke database itu.\n"
           . "   Perbaiki di cPanel > MySQL Databases > 'Add User To Database'\n"
           . "   (pilih user + database, centang ALL PRIVILEGES).\n";
    } elseif (stripos($m, 'Unknown database') !== false) {
        echo "database bernama '" . DB_NAME . "' belum ada.\n"
           . "   Bikin dulu di cPanel > MySQL Databases > Create New Database.\n";
    } elseif (stripos($m, 'refused') !== false || stripos($m, 'No such') !== false) {
        echo "DB_HOST salah. Di cPanel hampir selalu 'localhost'.\n";
    } else {
        echo "lihat pesan di atas.\n";
    }
}

echo "\n4. Versi PHP: " . PHP_VERSION . "\n";
echo "\nSELESAI — hapus berkas ini setelah dibaca.\n";
