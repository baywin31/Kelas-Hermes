<?php
// _boot.php — session, koneksi PDO, helper, CSRF, rate limit, audit.
// Semua halaman wajib `require __DIR__ . '/_boot.php';` paling atas.

declare(strict_types=1);

require_once __DIR__ . '/_config.php';

date_default_timezone_set(TZ);

// ---------- Session dengan cookie yang aman ----------
if (session_status() === PHP_SESSION_NONE) {
    $https = (($_SERVER['HTTPS'] ?? '') !== '' && $_SERVER['HTTPS'] !== 'off')
        || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax',
        'secure'   => $https,
    ]);
    session_name('kdsess');
    session_start();
}

// ---------- Header keamanan ----------
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');

// ---------- Koneksi PDO ----------
function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
            migrate_tier($pdo);
        } catch (PDOException $e) {
            http_response_code(500);
            die('Database belum siap. Jalankan setup.php dulu.');
        }
    }
    return $pdo;
}

/** Pastikan kolom tier/akses ada di tabel. Safe & idempotent. */
function migrate_tier(PDO $pdo): void
{
    static $done = false;
    if ($done) return;
    $done = true;
    try {
        $pdo->exec("ALTER TABLE " . t('content') . " ADD COLUMN akses ENUM('reguler','premium') NOT NULL DEFAULT 'reguler'");
    } catch (Throwable $e) {}
    try {
        $pdo->exec("ALTER TABLE " . t('users') . " ADD COLUMN tier ENUM('reguler','premium') NOT NULL DEFAULT 'reguler'");
    } catch (Throwable $e) {}
    try {
        $pdo->exec("ALTER TABLE " . t('codes') . " ADD COLUMN tier ENUM('reguler','premium') NOT NULL DEFAULT 'reguler'");
    } catch (Throwable $e) {}
}

/** Nama tabel ber-prefix. */
function t(string $name): string
{
    return TBL . $name;
}

// ---------- Helper tampilan ----------
function e($s): string
{
    return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
}

function redirect(string $to): never
{
    header('Location: ' . $to);
    exit;
}

function flash_set(string $type, string $msg): void
{
    $_SESSION['flash'][] = ['type' => $type, 'msg' => $msg];
}

function flash_take(): array
{
    $f = $_SESSION['flash'] ?? [];
    unset($_SESSION['flash']);
    return $f;
}

function client_ip(): string
{
    return (string)($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
}

// ---------- Password ----------
function pw_algo(): string
{
    return defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT;
}

function pw_hash(string $plain): string
{
    return password_hash($plain, pw_algo());
}

// ---------- User aktif ----------
function current_user(): ?array
{
    static $cached = false;
    static $user = null;
    if ($cached) return $user;
    $cached = true;
    if (empty($_SESSION['uid'])) return null;
    $st = db()->prepare(
        'SELECT id, nama, email, role, tier, created_at FROM ' . t('users') . ' WHERE id = ?'
    );
    $st->execute([(int)$_SESSION['uid']]);
    $user = $st->fetch() ?: null;
    if ($user !== null) {
        // Admin selalu dianggap ber-akses premium
        if (($user['role'] ?? '') === 'admin') {
            $user['tier'] = 'premium';
        } else {
            $user['tier'] = $user['tier'] ?? 'reguler';
        }
    } else {
        unset($_SESSION['uid']);
    }
    return $user;
}

function require_login(): array
{
    $u = current_user();
    if (!$u) {
        $_SESSION['after_login'] = $_SERVER['REQUEST_URI'] ?? 'dashboard.php';
        redirect('login.php');
    }
    return $u;
}

function require_admin(): array
{
    $u = require_login();
    if (($u['role'] ?? '') !== 'admin') {
        http_response_code(403);
        die('Halaman ini khusus admin.');
    }
    return $u;
}

// ---------- CSRF ----------
function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(16));
    }
    return $_SESSION['csrf'];
}

function csrf_field(): string
{
    return '<input type="hidden" name="csrf" value="' . e(csrf_token()) . '">';
}

function csrf_check(): void
{
    $sent = (string)($_POST['csrf'] ?? '');
    if (!hash_equals($_SESSION['csrf'] ?? '', $sent)) {
        // 403, bukan 419: Apache pada shared hosting menolak kode status
        // non-standar dan mengubahnya jadi 500.
        http_response_code(403);
        die('Sesi kedaluwarsa. Refresh halaman lalu coba lagi.');
    }
}

// ---------- Rate limit (disimpan di DB, aman untuk shared hosting) ----------
/**
 * Catat satu percobaan. Mengembalikan true kalau MASIH boleh, false kalau
 * sudah melewati batas dalam jendela waktu tsb.
 */
function rate_ok(string $bucket, string $key, int $max, int $windowSec): bool
{
    $pdo = db();
    $id  = substr($bucket . ':' . $key, 0, 190);
    $now = time();

    $st = $pdo->prepare('SELECT hits, started FROM ' . t('ratelimit') . ' WHERE id = ?');
    $st->execute([$id]);
    $row = $st->fetch();

    if (!$row || ($now - (int)$row['started']) > $windowSec) {
        $ins = $pdo->prepare(
            'INSERT INTO ' . t('ratelimit') . ' (id, hits, started) VALUES (?, 1, ?)
             ON DUPLICATE KEY UPDATE hits = 1, started = VALUES(started)'
        );
        $ins->execute([$id, $now]);
        return true;
    }

    $hits = (int)$row['hits'] + 1;
    $pdo->prepare('UPDATE ' . t('ratelimit') . ' SET hits = ? WHERE id = ?')
        ->execute([$hits, $id]);

    return $hits <= $max;
}

/**
 * Hapus hitungan percobaan untuk satu bucket+key. Dipanggil setelah percobaan
 * BERHASIL supaya orang yang cuma salah ketik beberapa kali tidak ikut terkunci
 * setelah akhirnya berhasil.
 */
function rate_reset(string $bucket, string $key): void
{
    $id = substr($bucket . ':' . $key, 0, 190);
    db()->prepare('DELETE FROM ' . t('ratelimit') . ' WHERE id = ?')->execute([$id]);
}

/**
 * Kosongkan SEMUA hitungan percobaan. Dipakai tombol admin "buka blokir" saat
 * pembeli telanjur terkunci dan tidak mau menunggu 15 menit.
 */
function rate_clear_all(): int
{
    return (int)db()->exec('DELETE FROM ' . t('ratelimit'));
}

// ---------- Audit log ----------
function audit(string $event, ?int $uid = null, string $detail = ''): void
{
    try {
        db()->prepare(
            'INSERT INTO ' . t('audit') . ' (event, user_id, ip, detail, created_at)
             VALUES (?, ?, ?, ?, NOW())'
        )->execute([$event, $uid, client_ip(), mb_substr($detail, 0, 500)]);
    } catch (Throwable $e) {
        // Audit tidak boleh menggagalkan permintaan utama.
    }
}

// ---------- Setelan situs (key-value) ----------
function setting(string $key, string $default = ''): string
{
    static $all = null;
    if ($all === null) {
        $all = [];
        try {
            foreach (db()->query('SELECT k, v FROM ' . t('settings')) as $r) {
                $all[$r['k']] = $r['v'];
            }
        } catch (Throwable $e) {
            $all = [];
        }
    }
    return $all[$key] ?? $default;
}

function setting_put(string $key, string $val): void
{
    db()->prepare(
        'INSERT INTO ' . t('settings') . ' (k, v) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE v = VALUES(v)'
    )->execute([$key, $val]);
}

// ---------- WhatsApp admin ----------
/**
 * Rapikan nomor WA jadi format internasional tanpa tanda plus, karena
 * wa.me hanya menerima angka. "0812-3456-789" -> "62812345 6789".
 * Mengembalikan '' kalau nomornya tidak masuk akal, supaya tombol
 * tidak pernah muncul dengan tautan rusak.
 */
function wa_normal(string $nomor): string
{
    $n = preg_replace('/\D+/', '', $nomor) ?? '';
    if ($n === '') return '';
    if (str_starts_with($n, '0'))  $n = '62' . substr($n, 1);   // 0812... -> 62812...
    if (str_starts_with($n, '620')) $n = '62' . substr($n, 3);  // salah tulis 62 0812...
    return (strlen($n) >= 9 && strlen($n) <= 15) ? $n : '';
}

/** Nomor WA admin yang berlaku: setelan panel dulu, baru bawaan _config.php. */
function wa_nomor(): string
{
    $bawaan = defined('WA_NOMOR') ? (string)WA_NOMOR : '';
    return wa_normal(setting('wa_nomor', $bawaan));
}

/**
 * Tautan chat WA. $pesan mengisi kotak chat lebih dulu supaya admin
 * langsung tahu konteksnya, jadi member tidak perlu menjelaskan dari nol.
 */
function wa_link(string $pesan = ''): string
{
    $n = wa_nomor();
    if ($n === '') return '';
    if ($pesan === '') $pesan = setting('wa_pesan', 'Halo admin, saya butuh bantuan soal ' . APP_NAME . '.');
    return 'https://wa.me/' . $n . '?text=' . rawurlencode($pesan);
}

// Kerangka halaman dimuat paling akhir supaya semua helper di atas tersedia.
require_once __DIR__ . '/_theme.php';
