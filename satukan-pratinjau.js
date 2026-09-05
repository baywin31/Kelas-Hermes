/* satukan-pratinjau.js — jadikan satu halaman materi menjadi SATU berkas HTML
   yang berdiri sendiri (CSS ditempel ke dalamnya, tidak ada tautan aset).

   Kenapa perlu: pratinjau/ masih mengandalkan berkas CSS di sebelahnya. Begitu
   halaman itu dibuka dari tempat lain — pratinjau di dalam chat, atau dikirim ke
   orang lain — tautan itu putus dan halaman tampil tanpa gaya sama sekali.
   Halaman tanpa gaya bukan cuma jelek: ia MENYESATKAN, karena terlihat seperti
   desainnya gagal padahal cuma berkasnya tidak ketemu.

   Pemakaian: node satukan-pratinjau.js b1   (hasil: pratinjau/utuh-b1.html) */
const fs = require('fs');

const APP = 'C:/Users/user/apps/karyawan-digital-php';
const DIR = APP + '/pratinjau';
const b = process.argv[2] || 'b1';

const src = DIR + '/' + b + '.html';
if (!fs.existsSync(src)) {
  console.log('Belum ada ' + src + '. Jalankan dulu: bash uji-isi.sh && node siap-pratinjau.js');
  process.exit(1);
}

let html = fs.readFileSync(src, 'utf8');
const css = ['style.css', 'tw.css']
  .map(function (f) { return '/* ==== ' + f + ' ==== */\n' + fs.readFileSync(DIR + '/' + f, 'utf8'); })
  .join('\n');

// Semua tautan stylesheet dibuang, lalu satu blok <style> disisipkan di
// posisinya. Urutan style.css lalu tw.css dijaga: itu yang membuat kelas
// utility menang saat menimpa gaya lama.
// Tautan stylesheet LOKAL dibuang (diganti blok <style>), tapi yang jarak jauh
// dibiarkan: Google Fonts harus tetap dimuat, kalau tidak hurufnya jatuh ke font
// bawaan sistem dan pratinjau ini jadi menilai desain yang salah — tipografi
// justru salah satu yang paling menentukan kesan mahal.
html = html.replace(/<link(?![^>]*href="https?:)[^>]+rel="stylesheet"[^>]*>\s*/g, '');
html = html.replace('</head>', '<style>\n' + css + '\n</style>\n</head>');

// Skrip luar dibuang: pratinjau ini untuk melihat TATA LETAK, dan app.js butuh
// interaksi gulir yang tidak ada artinya di dalam bingkai statis.
html = html.replace(/<script[^>]+src="[^"]*"[^>]*>\s*<\/script>\s*/g, '');

const out = DIR + '/utuh-' + b + '.html';
fs.writeFileSync(out, html);
console.log('satu berkas siap: ' + out + '  (' + Math.round(html.length / 1024) + ' KB, tanpa tautan luar)');
