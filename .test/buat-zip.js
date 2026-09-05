/* buat-zip.js — bikin paket zip tanpa `zip` CLI (pakai PowerShell Compress-Archive
   lewat staging folder, supaya bisa memilih berkas). */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const APPS = 'C:/Users/user/apps';
const TMP = 'C:/Users/user/AppData/Local/Temp/kd-zip';

function bersih(p) { fs.rmSync(p, { recursive: true, force: true }); }
function salin(dari, ke) {
  fs.mkdirSync(path.dirname(ke), { recursive: true });
  fs.copyFileSync(dari, ke);
}
function zip(sumberDir, keluar) {
  fs.rmSync(keluar, { force: true });
  execFileSync('powershell.exe', ['-NoProfile', '-Command',
    `Compress-Archive -Path '${sumberDir}\\*' -DestinationPath '${keluar}' -Force`],
    { stdio: 'pipe' });
}

/* ---------- paket 1: mode HTML ---------- */
bersih(TMP + '/html');
salin(APPS + '/karyawan-digital-html/index.html', TMP + '/html/index.html');
salin(APPS + '/karyawan-digital-html/README.md', TMP + '/html/README.md');
zip(TMP + '/html', APPS + '/karyawan-digital-html.zip');

/* ---------- paket 2: mode PHP siap upload ---------- */
// PENTING: .ftp dan .cpanel menyimpan kredensial deploy, dan _config.prod.php
// hanya salinan cadangan — semuanya JANGAN pernah masuk paket yang dibagikan.
const KECUALI = [
  '_config.local.php', '_config.php', '_config.prod.php', '_config.prod.php.bak',
  'docker-compose.test.yml', 'member.zip',
  '.ftp', '.cpanel', '.gitignore', '.htaccess.contoh',
  // Alat bantu pengembangan — tidak ada gunanya di server pembeli.
  'ambil-palet.js', 'ambil-palet.php', 'palet-blok.js', 'palet-baru.html',
  'hitung-kontras.js', 'hitung-kontras-wa.js', 'cek-kelas.js', 'kontras-kartu.js',
  // Installer, diagnosa & skrip sekali-pakai: sengaja dikirim terpisah,
  // jangan pernah menginap di server pembeli.
  'pasang.php', '_diag.php', '_setwa.php', '_setvid.php', '_setmateri.php'
];
// Folder tw/ (sumber Tailwind + config + skrip bangun) juga tidak ikut:
// pembeli menerima tw.css yang SUDAH dikompilasi, jadi dia tidak perlu Node
// dan tidak ada langkah build di hosting. Folder dilewati otomatis karena
// pemindaian hanya mengambil berkas, bukan direktori.
const POLA_KECUALI = [/\.sh$/i, /^_uji_/i, /\.log$/i, /\.zip$/i, /^\./];
bersih(TMP + '/php');
const src = APPS + '/karyawan-digital-php';
let ikut = 0, lewat = [];
fs.readdirSync(src).forEach(function (f) {
  if (fs.statSync(path.join(src, f)).isDirectory()) return;
  if (KECUALI.includes(f) || POLA_KECUALI.some(r => r.test(f))) { lewat.push(f); return; }
  salin(path.join(src, f), TMP + '/php/' + f);
  ikut++;
});
zip(TMP + '/php', APPS + '/karyawan-digital-php-upload.zip');

function ukuran(p) { return (fs.statSync(p).size / 1024).toFixed(1) + ' KB'; }
console.log('karyawan-digital-html.zip        : 2 berkas, ' + ukuran(APPS + '/karyawan-digital-html.zip'));
console.log('karyawan-digital-php-upload.zip  : ' + ikut + ' berkas, ' + ukuran(APPS + '/karyawan-digital-php-upload.zip'));
console.log('dikecualikan dari paket PHP      : ' + lewat.sort().join(', '));
