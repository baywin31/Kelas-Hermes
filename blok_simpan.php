<?php
// blok_simpan.php — simpan SATU blok materi dari mode edit langsung.
//
// Kenapa endpoint terpisah, bukan lewat admin_materi.php:
// Di mode edit langsung admin mengklik satu paragraf di halaman materi lalu
// mengubahnya di tempat. Yang dikirim ke sini hanya blok itu. Bedanya penting —
// kalau seluruh dokumen dikirim ulang tiap kali menyimpan, satu kesalahan
// konversi merusak bagian yang admin tidak sentuh. Dengan cara ini kerusakan
// paling buruk hanya sebatas blok yang memang sedang diedit.
//
// Yang dikembalikan: seluruh HTML materi hasil render ulang, bukan cuma blok
// yang diubah. Alasannya struktural — menambah "##" mengubah pengelompokan
// kartu section, jadi menambal satu elemen saja akan membuat tampilan
// menyimpang dari yang dilihat pembeli.
declare(strict_types=1);
require __DIR__ . '/_boot.php';
require __DIR__ . '/_markdown.php';
require __DIR__ . '/_progress.php';
require __DIR__ . '/_blok.php';

header('Content-Type: application/json; charset=utf-8');

/** Balas JSON lalu berhenti. */
function jbalas(array $data, int $kode = 200): never
{
    http_response_code($kode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// Mode edit hanya untuk admin. Ini gerbang wewenang, bukan cuma soal tampilan:
// tanpa ini, member mana pun bisa menulis ulang materi kelas.
$u = current_user();
if (!$u || ($u['role'] ?? '') !== 'admin') {
    jbalas(['ok' => false, 'pesan' => 'Perlu akun admin.'], 403);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jbalas(['ok' => false, 'pesan' => 'Metode salah.'], 405);
}

csrf_check();

$bagian = (int)($_POST['bagian'] ?? 0);
$aksi   = (string)($_POST['aksi'] ?? '');
$idx    = (int)($_POST['idx'] ?? -1);

$row = $bagian > 0 ? bagian_satu($bagian) : null;
if (!$row) {
    jbalas(['ok' => false, 'pesan' => 'Bagian tidak ditemukan.'], 404);
}

$blok  = md_pecah_blok((string)$row['isi_md']);
$jumlah = count($blok);

// Aksi yang menyentuh blok tertentu wajib menunjuk blok yang ada.
if (in_array($aksi, ['ubah', 'hapus', 'naik', 'turun', 'tambah'], true)) {
    if ($idx < 0 || $idx >= $jumlah) {
        jbalas(['ok' => false, 'pesan' => 'Blok tidak ditemukan — halaman ini mungkin sudah berubah. Muat ulang dulu.'], 409);
    }
}

switch ($aksi) {
    case 'ubah':
        $baru = (string)($_POST['md'] ?? '');
        // Pemeriksaan tabrakan: klien mengirim isi blok yang dia LIHAT saat mulai
        // mengedit. Kalau isi di database sudah berbeda, berarti ada yang
        // menyimpan lebih dulu — lebih baik menolak daripada menimpa diam-diam.
        $lama = (string)($_POST['md_lama'] ?? '');
        if ($lama !== '' && rtrim(str_replace("\r\n", "\n", $lama)) !== rtrim($blok[$idx]['md'])) {
            jbalas(['ok' => false, 'pesan' => 'Blok ini sudah diubah dari tempat lain. Muat ulang halaman supaya tidak menimpa perubahan itu.'], 409);
        }
        if (trim($baru) === '') {
            jbalas(['ok' => false, 'pesan' => 'Isi blok tidak boleh kosong. Pakai tombol hapus kalau memang mau dibuang.'], 400);
        }
        // Blok baru dipecah ulang: admin boleh mengetik beberapa paragraf dalam
        // satu kotak, dan hasilnya harus jadi beberapa blok yang benar — bukan
        // satu blok berisi baris ganda yang nanti salah dipotong.
        $ganti = md_pecah_blok($baru);
        if (!$ganti) {
            jbalas(['ok' => false, 'pesan' => 'Isi blok tidak terbaca.'], 400);
        }
        array_splice($blok, $idx, 1, $ganti);
        break;

    case 'hapus':
        array_splice($blok, $idx, 1);
        if (!$blok) {
            jbalas(['ok' => false, 'pesan' => 'Materi tidak boleh jadi kosong sama sekali.'], 400);
        }
        break;

    case 'tambah':
        $jenis = (string)($_POST['jenis'] ?? 'paragraf');
        $isi   = md_blok_contoh($jenis);
        array_splice($blok, $idx + 1, 0, md_pecah_blok($isi));
        break;

    case 'naik':
        if ($idx === 0) {
            jbalas(['ok' => false, 'pesan' => 'Blok ini sudah paling atas.'], 400);
        }
        $tmp = $blok[$idx - 1];
        $blok[$idx - 1] = $blok[$idx];
        $blok[$idx] = $tmp;
        break;

    case 'turun':
        if ($idx >= $jumlah - 1) {
            jbalas(['ok' => false, 'pesan' => 'Blok ini sudah paling bawah.'], 400);
        }
        $tmp = $blok[$idx + 1];
        $blok[$idx + 1] = $blok[$idx];
        $blok[$idx] = $tmp;
        break;

    default:
        jbalas(['ok' => false, 'pesan' => 'Aksi tidak dikenal.'], 400);
}

$md_baru = md_gabung_blok($blok);

db()->prepare('UPDATE ' . t('content') . ' SET isi_md = ?, updated_at = NOW() WHERE urutan = ?')
    ->execute([$md_baru, $bagian]);
audit('materi_blok_' . $aksi, (int)$u['id'], "bagian=$bagian idx=$idx");

// Pecah ulang dari markdown yang BARU tersimpan, bukan dari array di memori.
// Bedanya halus tapi nyata: pemecahan ulang membuktikan hasil simpanan bisa
// dibaca kembali dengan pembagian blok yang sama — kalau tidak, nomor blok di
// layar tidak lagi cocok dengan yang di database pada penyuntingan berikutnya.
$blok_baru = md_pecah_blok($md_baru);

jbalas([
    'ok'    => true,
    'html'  => materi_html_edit($blok_baru),
    'blok'  => array_map(static fn(array $b): array => ['md' => $b['md'], 'jenis' => $b['jenis']], $blok_baru),
    'aksi'  => $aksi,
]);
