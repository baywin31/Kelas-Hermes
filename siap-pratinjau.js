/* siap-pratinjau.js — siapkan salinan halaman materi yang bisa dibuka langsung
   dari berkas (file://), supaya tata letaknya bisa diperiksa di browser nyata.

   Kenapa perlu: server uji lokal ada di 127.0.0.1, dan alat browser di sini
   menolak alamat internal. Halaman hasil render sudah disimpan uji-isi.sh, jadi
   yang kurang cuma CSS-nya ikut serta dan tautan aset diubah jadi relatif. */
const fs = require('fs');
const path = require('path');

const APP = 'C:/Users/user/apps/karyawan-digital-php';
const SRC = process.env.LOCALAPPDATA + '/Temp/kd-uji-isi';
const OUT = APP + '/pratinjau';

if (!fs.existsSync(SRC + '/b1.html')) {
  console.log('HTML hasil render belum ada. Jalankan dulu: bash uji-isi.sh');
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });
['style.css', 'tw.css', 'app.js'].forEach(function (f) {
  fs.copyFileSync(APP + '/' + f, OUT + '/' + f);
});

let n = 0;
['b1', 'b2', 'b3', 'b4'].forEach(function (b) {
  const p = SRC + '/' + b + '.html';
  if (!fs.existsSync(p)) return;
  let html = fs.readFileSync(p, 'utf8');
  // Buang penanda versi dari SEMUA aset (style.css, tw.css, app.js). Lewat
  // file:// tanda tanya itu ikut jadi bagian nama berkas, jadi kalau tidak
  // dibuang CSS-nya tidak ketemu dan halaman tampil tanpa gaya sama sekali —
  // yang membuat pratinjau ini menyesatkan, bukan cuma jelek.
  html = html.replace(/\.(css|js)\?v=\d+/g, '.$1');
  fs.writeFileSync(OUT + '/' + b + '.html', html);
  n++;
});

console.log('pratinjau siap: ' + OUT + '  (' + n + ' halaman)');
