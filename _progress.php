<?php
// _progress.php — helper progres & materi.
declare(strict_types=1);

/** Semua Bagian, urut. */
function bagian_semua(): array
{
    $rows = db()->query(
        'SELECT id, urutan, judul, ringkas, isi_md, akses, updated_at
         FROM ' . t('content') . ' ORDER BY urutan'
    )->fetchAll();
    foreach ($rows as &$r) {
        $r['akses'] = $r['akses'] ?? 'reguler';
    }
    return $rows;
}

/** Satu Bagian berdasarkan nomor urut. */
function bagian_satu(int $urutan): ?array
{
    $st = db()->prepare('SELECT * FROM ' . t('content') . ' WHERE urutan = ?');
    $st->execute([$urutan]);
    $row = $st->fetch();
    if ($row) {
        $row['akses'] = $row['akses'] ?? 'reguler';
        return $row;
    }
    return null;
}

/** Peta progres user: [urutan => status]. */
function progres_user(int $uid): array
{
    $st = db()->prepare('SELECT bagian, status FROM ' . t('progress') . ' WHERE user_id = ?');
    $st->execute([$uid]);
    $out = [];
    foreach ($st as $r) $out[(int)$r['bagian']] = $r['status'];
    return $out;
}

/** Simpan status satu Bagian. */
function progres_set(int $uid, int $bagian, string $status): void
{
    if (!in_array($status, ['belum', 'mulai', 'selesai'], true)) return;
    db()->prepare('INSERT INTO ' . t('progress') . ' (user_id, bagian, status, updated_at)
        VALUES (?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE status = VALUES(status), updated_at = NOW()')
        ->execute([$uid, $bagian, $status]);
}

/** Catat kunjungan (dipakai badge "Materi Baru"). */
function kunjungan_catat(int $uid, int $bagian): void
{
    db()->prepare('INSERT INTO ' . t('visits') . ' (user_id, bagian, last_seen)
        VALUES (?, ?, NOW())
        ON DUPLICATE KEY UPDATE last_seen = NOW()')
        ->execute([$uid, $bagian]);
}

/** Peta kunjungan: [bagian => timestamp]. */
function kunjungan_user(int $uid): array
{
    $st = db()->prepare('SELECT bagian, last_seen FROM ' . t('visits') . ' WHERE user_id = ?');
    $st->execute([$uid]);
    $out = [];
    foreach ($st as $r) $out[(int)$r['bagian']] = strtotime((string)$r['last_seen']);
    return $out;
}

/**
 * Materi dianggap "baru" kalau diperbarui setelah kunjungan terakhir user,
 * atau belum pernah dibuka sama sekali padahal materinya sudah lama ada.
 */
function materi_baru(array $bagian, array $kunjungan): bool
{
    $upd = strtotime((string)$bagian['updated_at']);
    $seen = $kunjungan[(int)$bagian['urutan']] ?? 0;
    return $seen === 0 ? false : $upd > $seen;
}

/** Catatan pribadi user untuk satu Bagian. */
function catatan_ambil(int $uid, int $bagian): string
{
    $st = db()->prepare('SELECT isi FROM ' . t('notes') . ' WHERE user_id = ? AND bagian = ?');
    $st->execute([$uid, $bagian]);
    return (string)($st->fetchColumn() ?: '');
}

function catatan_simpan(int $uid, int $bagian, string $isi): void
{
    $isi = mb_substr($isi, 0, 20000);
    db()->prepare('INSERT INTO ' . t('notes') . ' (user_id, bagian, isi, updated_at)
        VALUES (?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE isi = VALUES(isi), updated_at = NOW()')
        ->execute([$uid, $bagian, $isi]);
}

/** Label badge status. */
function badge_status(string $status): string
{
    return match ($status) {
        'selesai' => '<span class="badge selesai">Selesai</span>',
        'mulai'   => '<span class="badge mulai">Sedang dipelajari</span>',
        default   => '<span class="badge belum">Belum mulai</span>',
    };
}

/** Quick links dari setelan. */
function links_ambil(): array
{
    $raw = setting('links_json', '[]');
    $arr = json_decode($raw, true);
    return is_array($arr) ? $arr : [];
}
