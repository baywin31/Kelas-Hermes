/* cek-rar.js — daftar isi .rar publik itu (pakai PowerShell + tar bawaan Windows
   kalau bisa; kalau gagal, cari nama berkas berisiko lewat pencocokan biner). */
const fs = require('fs');
const { execFileSync } = require('child_process');
const RAR = 'C:/Users/user/AppData/Local/Temp/kd.rar';
const buf = fs.readFileSync(RAR);
const teks = buf.toString('latin1');

const CARI = [
  '_config.php', '_config.prod.php', '_config.local.php', '.ftp',
  'smoke.sh', 'smoke2.sh', 'deploy.sh', '_uji_bersih.php', '_uji_demo.php',
  '_uji_reseed.php', 'docker-compose.test.yml', 'setup.php'
];
console.log('== nama berkas berisiko yang muncul di dalam arsip:');
CARI.forEach(function (n) {
  if (teks.includes(n)) console.log('   DITEMUKAN  ' + n);
});

/* Kalau kredensial DB ikut, string password-nya akan muncul mentah. */
console.log('== jejak kredensial:');
['DB_PASS', 'jurag139_adminDB', 'darwinganteng'].forEach(function (n) {
  console.log('   ' + (teks.includes(n) ? 'DITEMUKAN' : 'aman     ') + '  ' + n);
});
