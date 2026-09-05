<?php
// _kode.php — pembuatan & validasi kode akses.
// Format: HRMS-XXXX-XXXX-XXXX, alfabet 31 karakter tanpa 0 O 1 I L
// supaya tidak ambigu saat dibaca/ditulis ulang pembeli.

declare(strict_types=1);

const KODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // 31 karakter
const KODE_PREFIX   = 'HRMS';

/** Bikin satu kode acak kriptografis. ~59,5 bit entropi (31^12). */
function kode_generate(): string
{
    $alpha = KODE_ALPHABET;
    $n     = strlen($alpha);
    $blok  = [];
    for ($b = 0; $b < 3; $b++) {
        $s = '';
        for ($i = 0; $i < 4; $i++) {
            $s .= $alpha[random_int(0, $n - 1)];
        }
        $blok[] = $s;
    }
    return KODE_PREFIX . '-' . implode('-', $blok);
}

/**
 * Rapikan input user: huruf kecil jadi besar, spasi/tanda hubung berlebih
 * dibuang, lalu dipasang ulang jadi HRMS-XXXX-XXXX-XXXX.
 * Mengembalikan null kalau bentuknya tidak mungkin valid.
 */
function kode_normalize(string $raw): ?string
{
    $s = strtoupper(trim($raw));
    $s = preg_replace('/[^A-Z0-9]/', '', $s) ?? '';

    // Boleh diketik dengan atau tanpa prefix.
    if (str_starts_with($s, KODE_PREFIX)) {
        $s = substr($s, strlen(KODE_PREFIX));
    }
    if (strlen($s) !== 12) {
        return null;
    }
    // Tolak karakter di luar alfabet (mis. angka 0 atau huruf O).
    for ($i = 0; $i < 12; $i++) {
        if (!str_contains(KODE_ALPHABET, $s[$i])) {
            return null;
        }
    }
    return KODE_PREFIX . '-' . substr($s, 0, 4) . '-' . substr($s, 4, 4) . '-' . substr($s, 8, 4);
}

/** Simpan sejumlah kode baru. Mengembalikan array kode yang dibuat. */
function kode_buat_banyak(int $jumlah, string $batch = '', string $note = ''): array
{
    $jumlah = max(1, min(500, $jumlah));
    $pdo    = db();
    $ins    = $pdo->prepare(
        'INSERT INTO ' . t('codes') . ' (kode, batch, note, created_at)
         VALUES (?, ?, ?, NOW())'
    );

    $hasil = [];
    for ($i = 0; $i < $jumlah; $i++) {
        // Ulang kalau kebetulan tabrakan dengan kode yang sudah ada.
        for ($coba = 0; $coba < 6; $coba++) {
            $k = kode_generate();
            try {
                $ins->execute([$k, $batch, $note]);
                $hasil[] = $k;
                break;
            } catch (PDOException $e) {
                if ($e->getCode() !== '23000') throw $e; // bukan duplikat
            }
        }
    }
    return $hasil;
}

/** Ambil baris kode. */
function kode_cari(string $kode): ?array
{
    $st = db()->prepare('SELECT * FROM ' . t('codes') . ' WHERE kode = ?');
    $st->execute([$kode]);
    return $st->fetch() ?: null;
}

/** Status kode untuk pesan ke user: ok | tidak_ada | sudah_dipakai | dicabut */
function kode_status(string $kode): string
{
    $row = kode_cari($kode);
    if (!$row)                          return 'tidak_ada';
    if ((int)$row['revoked'] === 1)     return 'dicabut';
    if (!empty($row['redeemed_by']))    return 'sudah_dipakai';
    return 'ok';
}
