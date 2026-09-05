<?php
/**
 * _setwa.php — sekali pakai: isi nomor WhatsApp admin ke tabel setelan.
 *
 * Kenapa lewat skrip, bukan menimpa _config.php: _config.php di server
 * menyimpan password database asli yang tidak ada di sini. Menimpanya
 * akan mematikan seluruh app. Skrip ini hanya MENULIS SATU BARIS setelan
 * lalu dihapus.
 *
 * Dikunci: tanpa ?k= yang benar, balas 404 seperti berkas tidak ada.
 */
declare(strict_types=1);

const KUNCI = 'setwa2026';
if (($_GET['k'] ?? '') !== KUNCI) {
    http_response_code(404);
    exit('Not Found');
}

require __DIR__ . '/_boot.php';

header('Content-Type: text/plain; charset=utf-8');

$masuk = (string)($_GET['n'] ?? '');
if ($masuk === '') {
    echo "Nomor kosong. Pakai ?k=" . KUNCI . "&n=08xxxxxxxxxx\n";
    exit;
}

$bersih = wa_normal($masuk);
if ($bersih === '') {
    echo "GAGAL: nomor '{$masuk}' tidak masuk akal.\n";
    exit;
}

$pesan = (string)($_GET['p'] ?? '');

try {
    setting_put('wa_nomor', $bersih);
    if ($pesan !== '') setting_put('wa_pesan', $pesan);

    // Baca ulang dari database — jangan percaya bahwa tulis pasti berhasil.
    $cek = setting('wa_nomor');
    echo "nomor_masuk   : {$masuk}\n";
    echo "nomor_tersimpan: {$cek}\n";
    echo "wa_link        : " . wa_link('') . "\n";
    echo "pesan_tersimpan: " . setting('wa_pesan', '(bawaan)') . "\n";
    echo ($cek === $bersih) ? "\nOK tersimpan di database.\n" : "\nGAGAL tidak cocok.\n";
} catch (Throwable $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
