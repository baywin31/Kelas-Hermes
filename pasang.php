<?php
declare(strict_types=1);
/**
 * pasang.php — pemasang satu-berkas untuk Karyawan Digital.
 *
 * Kenapa berkas ini ada: menyunting _config.php lewat File Manager gampang
 * gagal (satu huruf salah, prefix nama DB kelupaan) dan pesan error PHP-nya
 * tidak menjelaskan apa pun. Berkas ini:
 *   1. mencari kredensial database yang BENAR-BENAR bisa dipakai — termasuk
 *      meminjam dari app lain di akun hosting yang sama,
 *   2. mengujinya langsung ke MySQL,
 *   3. menuliskan _config.php sendiri kalau ada yang berhasil.
 *
 * Pakai:
 *   1. Unggah ke folder /member/
 *   2. Buka https://<domain>/member/pasang.php?k=pasang2026
 *   3. Ikuti satu halaman itu sampai tombol "Pasang sekarang" hijau
 *   4. HAPUS pasang.php dan setup.php
 */

const KUNCI = 'pasang2026';
if ((string)($_GET['k'] ?? $_POST['k'] ?? '') !== KUNCI) {
    http_response_code(404);
    exit('404');
}

/** Setelan non-rahasia yang ikut ditulis ke _config.php. */
const BAWAAN = [
    'TBL'          => 'kd_',
    'APP_NAME'     => 'Karyawan Digital',
    'COURSE_NAME'  => 'Hermes Agent',
    'TELEGRAM_URL' => 'https://t.me/+ganti_link_kamu',
    'MAIL_FROM'    => '',
    'TZ'           => 'Asia/Jakarta',
];

function h(?string $s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function samar(string $s): string { return $s === '' ? '(kosong)' : strlen($s) . ' karakter'; }

/**
 * Ambil kredensial DB dari teks berkas konfigurasi PHP apa pun.
 * Sengaja pakai regex, bukan require, supaya konstanta app lain tidak
 * ikut terdefinisi dan bertabrakan.
 */
function kredensial_dari_teks(string $isi): ?array
{
    $alias = [
        'host' => ['DB_HOST', 'DBHOST', 'MYSQL_HOST', 'db_host', 'dbhost', 'servername', 'hostname', 'host'],
        'user' => ['DB_USER', 'DBUSER', 'MYSQL_USER', 'db_user', 'dbuser', 'username', 'user'],
        'pass' => ['DB_PASS', 'DB_PASSWORD', 'DBPASS', 'MYSQL_PASSWORD', 'db_pass', 'db_password', 'dbpass', 'password', 'pass'],
        'name' => ['DB_NAME', 'DBNAME', 'MYSQL_DATABASE', 'db_name', 'dbname', 'database'],
    ];

    $hasil = [];
    foreach ($alias as $bagian => $daftar) {
        foreach ($daftar as $k) {
            // cocok untuk: const K = 'v';  define('K','v');  $k = 'v';  'K' => 'v'
            $re = '/(?:const\s+|define\s*\(\s*[\'"]|\$|[\'"])'
                . preg_quote($k, '/')
                . '[\'"]?\s*(?:=>|=|,)\s*[\'"]([^\'"]*)[\'"]/i';
            if (preg_match($re, $isi, $m)) {
                $hasil[$bagian] = $m[1];
                break;
            }
        }
    }

    // Tanpa user + nama database, tebakan ini tidak berguna.
    if (!isset($hasil['user'], $hasil['name']) || $hasil['user'] === '' || $hasil['name'] === '') {
        return null;
    }
    $hasil['host'] = $hasil['host'] ?? 'localhost';
    $hasil['pass'] = $hasil['pass'] ?? '';
    return $hasil;
}

/** Cari berkas konfigurasi milik app lain di akun yang sama. */
function cari_config(string $akar, int $maksDalam = 2): array
{
    $pola   = '/^(_?config.*|koneksi.*|db|db_.*|database.*|wp-config|conn.*|setelan.*|setting.*)\.php$/i';
    $temuan = [];
    $antre  = [[$akar, 0]];

    while ($antre) {
        [$dir, $dalam] = array_shift($antre);
        $isi = @scandir($dir);
        if (!$isi) continue;

        foreach ($isi as $nama) {
            if ($nama === '.' || $nama === '..') continue;
            $p = $dir . '/' . $nama;
            if (is_dir($p)) {
                if ($dalam < $maksDalam) $antre[] = [$p, $dalam + 1];
            } elseif (preg_match($pola, $nama) && (int)@filesize($p) < 80000) {
                $temuan[] = $p;
            }
        }
        if (count($temuan) > 80) break;
    }
    return $temuan;
}

/** DSN yang menerima host bergaya "127.0.0.1:3399". */
function dsn_dari(array $k, bool $pakaiNama): string
{
    $host = $k['host'];
    $port = '';
    if (strpos($host, ':') !== false) {
        [$host, $port] = explode(':', $host, 2);
    }
    $dsn = 'mysql:host=' . $host;
    if ($port !== '') $dsn .= ';port=' . (int)$port;
    if ($pakaiNama)   $dsn .= ';dbname=' . $k['name'];
    return $dsn . ';charset=utf8mb4';
}

/** Uji satu set kredensial. Balikan: ok, pesan, daftar db, target_ada. */
function uji_koneksi(array $k): array
{
    try {
        $pdo = new PDO(dsn_dari($k, false), $k['user'], $k['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_TIMEOUT => 6,
        ]);
    } catch (Throwable $e) {
        return ['ok' => false, 'pesan' => $e->getMessage(), 'db' => [], 'target_ada' => false];
    }

    $db = [];
    try {
        foreach ($pdo->query('SHOW DATABASES') as $r) {
            $n = (string)reset($r);
            if (!in_array($n, ['information_schema', 'mysql', 'performance_schema', 'sys'], true)) {
                $db[] = $n;
            }
        }
    } catch (Throwable $e) {
        // sebagian hosting menutup SHOW DATABASES — tidak fatal
    }

    return [
        'ok'         => true,
        'pesan'      => 'tersambung',
        'db'         => $db,
        'target_ada' => $db === [] ? true : in_array($k['name'], $db, true),
    ];
}

/** Terjemahkan error MySQL jadi langkah perbaikan yang bisa dikerjakan. */
function saran(string $pesan): string
{
    if (stripos($pesan, 'Access denied') !== false) {
        return 'User atau password salah, ATAU user belum ditambahkan ke database itu. '
             . 'Perbaiki di cPanel &rsaquo; MySQL Databases &rsaquo; <b>Add User To Database</b> '
             . '(pilih user + database, centang ALL PRIVILEGES).';
    }
    if (stripos($pesan, 'Unknown database') !== false) {
        return 'Nama database belum ada. Bikin dulu di cPanel &rsaquo; MySQL Databases '
             . '&rsaquo; Create New Database. Ingat prefix akun, misal <code>akunmu_</code>.';
    }
    if (stripos($pesan, 'refused') !== false || stripos($pesan, 'No such') !== false
        || stripos($pesan, 'resolve') !== false) {
        return 'DB_HOST salah. Di cPanel hampir selalu <code>localhost</code>.';
    }
    return 'Lihat pesan aslinya di atas.';
}

// ---------------------------------------------------------------- kumpulkan
// Semua kandidat kredensial: dari _config.php sendiri, lalu dari app lain.
$kandidat = [];
$catatan  = [];

$cfgSendiri = __DIR__ . '/_config.php';
if (is_file($cfgSendiri)) {
    $k = kredensial_dari_teks((string)@file_get_contents($cfgSendiri));
    if ($k) $kandidat['_config.php (folder ini)'] = $k;
}

// Naik dua tingkat: /member -> docroot -> home. Docroot biasanya berisi app
// lain milik user yang kredensial DB-nya sudah pasti benar.
$akar = [dirname(__DIR__), dirname(dirname(__DIR__))];
foreach (array_unique($akar) as $a) {
    if (!is_dir($a)) continue;
    foreach (cari_config($a) as $p) {
        if (realpath($p) === realpath($cfgSendiri)) continue;
        $k = kredensial_dari_teks((string)@file_get_contents($p));
        if (!$k) continue;
        $label = str_replace(dirname(dirname(__DIR__)), '~', $p);
        // Hindari duplikat kredensial yang sama dari beberapa berkas.
        $sidik = $k['host'] . '|' . $k['user'] . '|' . $k['pass'] . '|' . $k['name'];
        foreach ($kandidat as $ada) {
            if ($ada['host'] . '|' . $ada['user'] . '|' . $ada['pass'] . '|' . $ada['name'] === $sidik) {
                continue 2;
            }
        }
        $kandidat[$label] = $k;
        if (count($kandidat) >= 12) break 2;
    }
}

// ---------------------------------------------------------------- tindakan
$aksi   = (string)($_POST['aksi'] ?? '');
$pesan  = '';
$sukses = false;

if ($aksi === 'pasang') {
    $pilih = (string)($_POST['pilih'] ?? '');
    $k = [
        'host' => trim((string)($_POST['host'] ?? 'localhost')),
        'user' => trim((string)($_POST['user'] ?? '')),
        'pass' => (string)($_POST['pass'] ?? ''),
        'name' => trim((string)($_POST['name'] ?? '')),
    ];
    if ($pilih !== '' && isset($kandidat[$pilih])) {
        $k = $kandidat[$pilih];
    }

    $hasil = uji_koneksi($k);
    if (!$hasil['ok']) {
        $pesan = '<b>Gagal tersambung.</b><br>Pesan MySQL: <code>' . h($hasil['pesan'])
               . '</code><br><br>' . saran($hasil['pesan']);
    } elseif (!$hasil['target_ada']) {
        $pesan = '<b>Tersambung, tapi database <code>' . h($k['name'])
               . '</code> tidak ada.</b><br>Database yang bisa dipakai user ini: <code>'
               . h(implode(', ', $hasil['db'])) . '</code><br><br>'
               . 'Pilih salah satu nama itu di kolom Nama database, lalu coba lagi.';
    } else {
        // Tulis _config.php.
        $baris = [
            '<?php',
            '// _config.php — dibuat otomatis oleh pasang.php pada ' . date('Y-m-d H:i:s'),
            '// Kredensial nyata. Jangan dibagikan, jangan masuk git.',
            '',
            "const DB_HOST = " . var_export($k['host'], true) . ';',
            "const DB_USER = " . var_export($k['user'], true) . ';',
            "const DB_PASS = " . var_export($k['pass'], true) . ';',
            "const DB_NAME = " . var_export($k['name'], true) . ';',
            '',
        ];
        foreach (BAWAAN as $nama => $nilai) {
            $baris[] = "const $nama = " . var_export($nilai, true) . ';';
        }
        // BASE_URL disusun dari alamat yang sedang dibuka, jadi selalu tepat.
        $skema  = (($_SERVER['HTTPS'] ?? '') !== '' && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host   = (string)($_SERVER['HTTP_HOST'] ?? 'localhost');
        $folder = rtrim(str_replace('\\', '/', dirname((string)($_SERVER['SCRIPT_NAME'] ?? ''))), '/');
        $baris[] = "const BASE_URL = " . var_export($skema . '://' . $host . $folder, true) . ';';
        $baris[] = '';

        $isi = implode("\n", $baris);
        if (@file_put_contents($cfgSendiri, $isi) === false) {
            $pesan = '<b>Kredensial benar, tapi _config.php tidak bisa ditulis.</b><br>'
                   . 'Ubah izin folder <code>/member</code> jadi 755 dan '
                   . '<code>_config.php</code> jadi 644 di File Manager, lalu ulangi.';
        } else {
            @chmod($cfgSendiri, 0644);
            $sukses = true;
            $pesan  = 'Kredensial diuji dan <b>_config.php sudah ditulis</b>.';
        }
    }
}

// ---------------------------------------------------------------- tampilan
$adaConfig = is_file($cfgSendiri);
?><!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Pemasang — Karyawan Digital</title>
<style>
:root{
  --bg:#08090a; --panel:rgba(255,255,255,.024); --panel2:rgba(255,255,255,.05);
  --line:rgba(255,255,255,.08); --fg:#f7f8f8; --fg2:#d0d6e0; --muted:#8a8f98;
  --accent:#5e6ad2; --accent2:#7170ff; --ok:#10b981; --danger:#f2555a;
}
*{box-sizing:border-box}
body{margin:0;padding:32px 20px 64px;background:var(--bg);color:var(--fg2);
  font:15px/1.6 'Inter',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
  background-image:radial-gradient(900px 420px at 50% -180px,rgba(94,106,210,.14),transparent 70%)}
.wrap{max-width:760px;margin:0 auto}
h1{color:var(--fg);font-size:24px;font-weight:590;margin:0 0 6px;letter-spacing:-.01em}
.sub{color:var(--muted);margin:0 0 28px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:20px;margin-bottom:16px}
h2{color:var(--fg);font-size:15px;font-weight:510;margin:0 0 14px}
table{width:100%;border-collapse:collapse;font-size:14px}
th,td{text-align:left;padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--muted);font-weight:510;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
code{background:var(--panel2);padding:2px 6px;border-radius:6px;font:13px/1.5 'JetBrains Mono',ui-monospace,monospace;color:var(--fg)}
label{display:block;color:var(--muted);font-size:13px;margin:12px 0 5px}
input[type=text],input[type=password]{width:100%;padding:9px 11px;background:var(--panel2);
  color:var(--fg);border:1px solid var(--line);border-radius:6px;font-size:14px;font-family:inherit}
input:focus{outline:0;border-color:var(--accent2);box-shadow:0 0 0 3px rgba(113,112,255,.18)}
.btn{display:inline-block;margin-top:16px;padding:9px 18px;background:var(--accent);color:#fff;
  border:0;border-radius:6px;font:510 14px/1.4 inherit;cursor:pointer;text-decoration:none}
.btn:hover{background:var(--accent2)}
.btn.kecil{margin:0;padding:6px 13px;font-size:13px}
.btn.hijau{background:var(--ok)}
.kabar{padding:14px 16px;border-radius:8px;margin-bottom:18px;font-size:14px}
.kabar.ok{background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.35);color:#6ee7b7}
.kabar.err{background:rgba(242,85,90,.1);border:1px solid rgba(242,85,90,.35);color:#fca5a5}
ol{margin:0;padding-left:22px}
li{margin-bottom:7px}
.mini{color:var(--muted);font-size:13px}
a{color:#828fff}
</style>
</head>
<body>
<div class="wrap">

<h1>Pemasang Karyawan Digital</h1>
<p class="sub">Mencari kredensial database yang benar, mengujinya, lalu menulis <code>_config.php</code> sendiri.</p>

<?php if ($pesan !== ''): ?>
  <div class="kabar <?= $sukses ? 'ok' : 'err' ?>"><?= $pesan ?></div>
<?php endif; ?>

<?php if ($sukses): ?>
  <div class="card">
    <h2>Tinggal dua langkah</h2>
    <ol>
      <li>Buka <a href="setup.php">setup.php</a> — bikin tabel, materi awal, dan akun admin pertama.</li>
      <li>Setelah muncul &ldquo;Instalasi selesai&rdquo;, <b>hapus <code>pasang.php</code> dan <code>setup.php</code></b> dari File Manager.</li>
    </ol>
    <a class="btn hijau" href="setup.php">Lanjut ke setup.php</a>
  </div>

<?php else: ?>

  <div class="card">
    <h2>Kandidat kredensial yang ditemukan</h2>
    <?php if (!$kandidat): ?>
      <p class="mini">Tidak ada berkas konfigurasi yang bisa dibaca. Isi manual di bawah.</p>
    <?php else: ?>
      <table>
        <tr><th>Sumber</th><th>User</th><th>Database</th><th>Password</th><th></th></tr>
        <?php foreach ($kandidat as $label => $k): ?>
          <tr>
            <td><code><?= h($label) ?></code></td>
            <td><?= h($k['user']) ?></td>
            <td><?= h($k['name']) ?></td>
            <td class="mini"><?= h(samar($k['pass'])) ?></td>
            <td>
              <form method="post" style="margin:0">
                <input type="hidden" name="k" value="<?= h(KUNCI) ?>">
                <input type="hidden" name="aksi" value="pasang">
                <input type="hidden" name="pilih" value="<?= h($label) ?>">
                <button class="btn kecil" type="submit">Uji &amp; pakai</button>
              </form>
            </td>
          </tr>
        <?php endforeach; ?>
      </table>
      <p class="mini" style="margin:14px 0 0">
        Kredensial dari app lain di akun ini biasanya sudah pasti benar — coba baris itu lebih dulu.
        Password tidak pernah ditampilkan, hanya panjangnya.
      </p>
    <?php endif; ?>
  </div>

  <div class="card">
    <h2>Atau isi manual</h2>
    <form method="post">
      <input type="hidden" name="k" value="<?= h(KUNCI) ?>">
      <input type="hidden" name="aksi" value="pasang">
      <label for="f1">DB_HOST</label>
      <input id="f1" type="text" name="host" value="localhost">
      <label for="f2">DB_USER</label>
      <input id="f2" type="text" name="user" placeholder="cth: akunmu_userdb" autocomplete="off">
      <label for="f3">DB_PASS</label>
      <input id="f3" type="password" name="pass" autocomplete="new-password">
      <label for="f4">DB_NAME</label>
      <input id="f4" type="text" name="name" placeholder="cth: akunmu_namadb" autocomplete="off">
      <button class="btn" type="submit">Uji &amp; pasang</button>
    </form>
    <p class="mini" style="margin:16px 0 0">
      Ambil dari cPanel &rsaquo; MySQL Databases. Nama database dan user selalu berawalan
      prefix akun, misalnya <code>akunmu_</code>. Kalau user-nya baru dibuat, jangan lupa
      bagian <b>Add User To Database</b> &rarr; centang ALL PRIVILEGES.
    </p>
  </div>

  <div class="card">
    <h2>Keadaan sekarang</h2>
    <table>
      <tr><td>_config.php</td><td><?= $adaConfig ? 'ada' : '<b>belum ada</b>' ?></td></tr>
      <tr><td>Folder bisa ditulis</td><td><?= is_writable(__DIR__) ? 'ya' : '<b>tidak</b> — ubah izin folder jadi 755' ?></td></tr>
      <tr><td>Versi PHP</td><td><?= h(PHP_VERSION) ?></td></tr>
      <tr><td>Driver MySQL</td><td><?= in_array('mysql', PDO::getAvailableDrivers(), true) ? 'tersedia' : '<b>tidak ada</b>' ?></td></tr>
    </table>
  </div>

<?php endif; ?>

</div>
</body>
</html>
