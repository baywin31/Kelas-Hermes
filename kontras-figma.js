/* kontras-figma.js — periksa rasio kontras SEMUA pasangan warna di figma-coba.css.
   Dijalankan sebelum halaman diperlihatkan ke pemilik: kartu warna terang yang
   dipasangkan dengan teks putih adalah kesalahan yang paling sering terjadi dan
   paling mudah diperiksa dengan angka.
*/
const fs = require('fs');

function keRGB(hex) {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
}
function lum(c) {
  const f = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
}
function rasio(a, b) {
  const L1 = lum(keRGB(a)), L2 = lum(keRGB(b));
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
}

// Semua pasangan teks/latar yang benar-benar dipakai di figma-coba.css.
const PASANGAN = [
  ['judul di kartu putih',        '#24242A', '#FCFCFC', 4.5],
  ['teks isi di kartu putih',     '#5A5A62', '#FCFCFC', 4.5],
  ['label statistik',             '#6A6A74', '#FCFCFC', 4.5],
  ['angka besar',                 '#24242A', '#FCFCFC', 4.5],
  ['naik (hijau)',                '#17703A', '#FCFCFC', 4.5],
  ['turun (merah gelap)',         '#9A1420', '#FCFCFC', 4.5],
  ['ikon di bidang biru',         '#24242A', '#00B0F6', 4.5],
  ['ikon di bidang merah',        '#FFFFFF', '#B00020', 4.5],
  ['ikon di bidang teal',         '#FFFFFF', '#2E8080', 4.5],
  ['ikon di bidang oranye',       '#FFFFFF', '#C24A1E', 4.5],
  ['pil biru',                    '#24242A', '#00B0F6', 4.5],
  ['pil merah',                   '#FFFFFF', '#B00020', 4.5],
  ['pil teal',                    '#FFFFFF', '#2E8080', 4.5],
  ['pil abu (netral)',            '#40404A', '#E8E8EC', 4.5],
  ['tombol biru',                 '#24242A', '#00B0F6', 4.5],
  ['tombol biru saat disentuh',   '#24242A', '#33C2F8', 4.5],
  ['tombol merah',                '#FFFFFF', '#B00020', 4.5],
  ['tombol merah disentuh',       '#FFFFFF', '#C41435', 4.5],
  ['nomor daftar (biru muda)',    '#06556F', '#D9EEFA', 4.5],
  ['nomor daftar VIP',            '#8A0018', '#F4DCDE', 4.5],
  ['keterangan daftar',           '#5A5A62', '#FCFCFC', 4.5],
  ['panah daftar',                '#8A8A94', '#FCFCFC', 3.0],
  ['kepala tabel',                '#5A5A62', '#E4E4E8', 4.5],
  ['isi tabel',                   '#303036', '#FCFCFC', 4.5],
  ['teks di atas latar gelap',    '#A4D8FF', '#25282B', 4.5],
];

let lulus = 0, gagal = 0;
console.log('pasangan warna diperiksa: ' + PASANGAN.length + '\n');
for (const [nama, fg, bg, ambang] of PASANGAN) {
  const r = rasio(fg, bg);
  const ok = r >= ambang;
  ok ? lulus++ : gagal++;
  console.log(
    `${ok ? 'LULUS' : 'GAGAL'}  ${nama.padEnd(28)} ${fg} di ${bg}  ` +
    `${r.toFixed(2)}  (ambang ${ambang})` + (ok ? '' : '   <-- TIDAK TERBACA'));
}
console.log('\n-----');
console.log(`LULUS=${lulus} GAGAL=${gagal}`);
process.exit(gagal === 0 ? 0 : 1);
