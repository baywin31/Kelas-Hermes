<?php
// admin_kode_csv.php — unduh daftar kode sebagai CSV.
declare(strict_types=1);
require __DIR__ . '/_boot.php';

require_admin();

$q      = trim((string)($_GET['q'] ?? ''));
$status = (string)($_GET['status'] ?? 'semua');
$batch  = trim((string)($_GET['batch'] ?? ''));

$where = [];
$args  = [];
if ($q !== '') {
    $where[] = '(c.kode LIKE ? OR c.note LIKE ? OR u.email LIKE ? OR u.nama LIKE ?)';
    array_push($args, "%$q%", "%$q%", "%$q%", "%$q%");
}
if ($batch !== '') { $where[] = 'c.batch = ?'; $args[] = $batch; }
if ($status === 'dipakai')  $where[] = 'c.redeemed_by IS NOT NULL';
if ($status === 'belum')    $where[] = 'c.redeemed_by IS NULL AND c.revoked = 0';
if ($status === 'dicabut')  $where[] = 'c.revoked = 1';

$sql = 'SELECT c.kode, c.batch, c.note, c.revoked, c.created_at, c.redeemed_at,
               u.nama, u.email
        FROM ' . t('codes') . ' c
        LEFT JOIN ' . t('users') . ' u ON u.id = c.redeemed_by';
if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
$sql .= ' ORDER BY c.id DESC';

$st = db()->prepare($sql);
$st->execute($args);

$nama = 'kode-akses-' . date('Ymd-Hi') . '.csv';
header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $nama . '"');

$out = fopen('php://output', 'w');
fwrite($out, "\xEF\xBB\xBF"); // BOM supaya Excel membaca UTF-8 dengan benar
fputcsv($out, ['kode', 'status', 'batch', 'catatan', 'dipakai_oleh', 'email', 'dibuat', 'ditukarkan']);

$n = 0;
while ($r = $st->fetch()) {
    $stat = (int)$r['revoked'] === 1 ? 'dicabut' : ($r['email'] ? 'dipakai' : 'tersedia');
    fputcsv($out, [
        $r['kode'], $stat, $r['batch'], $r['note'],
        (string)($r['nama'] ?? ''), (string)($r['email'] ?? ''),
        $r['created_at'], (string)($r['redeemed_at'] ?? ''),
    ]);
    $n++;
}
fclose($out);

audit('kode_csv_unduh', null, "$n baris");
