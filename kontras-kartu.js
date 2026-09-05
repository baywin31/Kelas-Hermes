/* kontras-kartu.js — ukur kontras warna kartu baru terhadap latarnya.

   Kenapa dihitung, bukan dikira-kira:
   warna-warna callout (kuning, hijau, merah, ungu) dipilih karena artinya,
   bukan karena keterbacaannya. Kalau salah satu jatuh di bawah ambang WCAG,
   pembaca di layar HP yang redup tidak bisa membacanya — dan itu tidak akan
   pernah kelihatan dari layar kita sendiri yang terang.

   Ambang WCAG AA: 4.5 untuk teks biasa, 3.0 untuk teks besar & non-teks.
   Nilai hex diambil dari tw.css yang SUDAH dikompilasi, bukan ditulis ulang
   di sini — supaya angka ini tidak pernah bohong soal apa yang dikirim ke
   browser. */
const fs = require('fs');

const DIR = 'C:/Users/user/apps/karyawan-digital-php';
const tw  = fs.readFileSync(DIR + '/tw.css', 'utf8');

/* --- ambil nilai rgb dari tw.css untuk satu kelas teks --- */
function warnaKelas(kelas) {
  const esc = kelas.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  const re  = new RegExp('\\.' + esc.replace(/\\\//g, '\\\\/') + '\\s*\\{[^}]*color:\\s*rgb\\(([^)]+)\\)', 'i');
  const m   = tw.match(re);
  if (!m) return null;
  const n = m[1].split(/[\s,/]+/).slice(0, 3).map(Number);
  return n.length === 3 && n.every(function (x) { return !isNaN(x); }) ? n : null;
}

function hexRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
  return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); });
}

function lum(rgb) {
  const a = rgb.map(function (v) {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

/* Campur warna semi-transparan di atas latar — inilah yang sebenarnya dilihat
   mata. Menghitung kontras tanpa langkah ini memberi angka yang terlalu
   optimistis untuk latar ber-alpha rendah seperti bg-amber-400/[.06]. */
function campur(atas, alpha, bawah) {
  return atas.map(function (v, i) { return Math.round(v * alpha + bawah[i] * (1 - alpha)); });
}

function rasio(a, b) {
  const l1 = lum(a), l2 = lum(b);
  return ((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05));
}

/* Latar halaman dari style.css (--bg), lalu latar kartu di atasnya. */
const BG      = hexRgb('#25282b');            // --bg
const SOFT    = hexRgb('#2b2f32');            // --bg-soft
const KARTU   = campur(SOFT, 0.60, BG);       // bg-kd-soft/60

/* Tiap baris: nama, kelas teks di tw.css, warna latar callout + alpha-nya. */
const UJI = [
  ['judul callout tips',    'text-kd-accent',   hexRgb('#A4D8FF'), 0.06],
  ['judul callout awas',    'text-amber-300',   hexRgb('#fbbf24'), 0.06],
  ['judul callout insight', 'text-violet-300',  hexRgb('#a78bfa'), 0.06],
  ['judul callout hasil',   'text-emerald-300', hexRgb('#34d399'), 0.06],
  ['judul callout salah',   'text-rose-300',    hexRgb('#fb7185'), 0.06],
  ['judul callout catat',   'text-sky-300',     hexRgb('#38bdf8'), 0.06],
  ['judul callout waktu',   'text-kd-accent3',  hexRgb('#A4D8FF'), 0.05],
  // Tiga jenis kartu penenang (aman/periksa/opsional). Ditambahkan ke uji
  // karena teal & lime adalah dua warna paling gampang jatuh di bawah ambang
  // di tema gelap — persis dua warna yang dipilih karena artinya.
  ['judul callout aman',    'text-teal-300',    hexRgb('#2dd4bf'), 0.06],
  ['judul callout periksa', 'text-lime-300',    hexRgb('#a3e635'), 0.06],
  ['judul callout opsional','text-kd-muted',    hexRgb('#ffffff'), 0.02],
  ['isi kartu (fg2)',       'text-kd-fg2',      hexRgb('#ffffff'), 0.03],
  ['teks redup (muted)',    'text-kd-muted',    hexRgb('#ffffff'), 0.03],
];

let lulus = 0, gagal = 0;
console.log('Latar kartu efektif: rgb(' + KARTU.join(', ') + ')');
console.log('');

UJI.forEach(function (row) {
  const [nama, kelas, latarWarna, alpha] = row;
  const teks = warnaKelas(kelas);
  if (!teks) { console.log('LEWAT  ' + nama + ' — kelas ' + kelas + ' tidak ada di tw.css'); gagal++; return; }
  const latar = campur(latarWarna, alpha, KARTU);
  const r = rasio(teks, latar);
  /* Judul callout dicetak uppercase 12.5px semibold — masuk kategori teks
     biasa, jadi ambangnya 4.5. Tidak dilonggarkan walau kecil. */
  const ambang = 4.5;
  const status = r >= ambang ? 'LOLOS' : 'GAGAL';
  if (r >= ambang) lulus++; else gagal++;
  console.log(status + '  ' + nama.padEnd(24) + r.toFixed(2) + '  (ambang ' + ambang + ')');
});

console.log('');
console.log('-----');
console.log('LULUS=' + lulus + ' GAGAL=' + gagal);
if (gagal) process.exit(1);
