// hitung-kontras-wa.js — pastikan tombol WhatsApp hijau tetap terbaca.
// Warna TIDAK ditulis ulang di sini: dibaca langsung dari style.css dan
// parts/00-head.html, supaya uji ini tidak pernah bohong kalau CSS diubah.
const fs = require('fs');

function lum(hex) {
  const c = hex.replace('#', '');
  const v = [0, 2, 4].map(i => {
    const s = parseInt(c.substr(i, 2), 16) / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
function rasio(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

// Ambil `background:#xxx; color:#yyy` dari blok .wa-apung (dan :hover-nya).
function bacaBlok(teks, pemilih) {
  const i = teks.indexOf(pemilih + '{');
  if (i < 0) return null;
  const blok = teks.slice(i, teks.indexOf('}', i));
  const bg = /background:\s*(#[0-9a-fA-F]{6})/.exec(blok);
  const fg = /color:\s*(#[0-9a-fA-F]{6})/.exec(blok);
  return { bg: bg && bg[1], fg: fg && fg[1] };
}

const sumber = [
  ['mode PHP  (style.css)', 'C:/Users/user/apps/karyawan-digital-php/style.css'],
  ['mode HTML (00-head)   ', 'C:/Users/user/apps/karyawan-digital-html/parts/00-head.html'],
];

let gagal = 0, dicek = 0;
console.log('  pasangan                              rasio  ambang  hasil');

for (const [label, path] of sumber) {
  const css = fs.readFileSync(path, 'utf8');
  const dasar = bacaBlok(css, '.wa-apung');
  const hover = bacaBlok(css, '.wa-apung:hover');
  const latar = (/--bg:\s*(#[0-9a-fA-F]{6})/.exec(css) || [])[1];

  if (!dasar || !dasar.bg || !dasar.fg) { console.log('  GAGAL tidak bisa baca .wa-apung di ' + label); gagal++; continue; }

  // Ikon di dalam tombol = elemen non-teks besar -> ambang 3.0
  const pasangan = [
    ['ikon di tombol WA · ' + label.trim(), dasar.fg, dasar.bg, 3.0],
    ['tombol WA di latar app · ' + label.trim(), dasar.bg, latar, 3.0],
  ];
  if (hover && hover.bg && hover.fg) {
    pasangan.push(['ikon saat hover · ' + label.trim(), hover.fg, hover.bg, 3.0]);
  }

  for (const [nama, a, b, ambang] of pasangan) {
    if (!a || !b) { console.log('  GAGAL warna kosong: ' + nama); gagal++; continue; }
    const r = rasio(a, b);
    const lolos = r >= ambang;
    if (!lolos) gagal++;
    dicek++;
    console.log('  ' + nama.padEnd(36) + r.toFixed(2).padStart(6) + String(ambang).padStart(8) + '  ' + (lolos ? 'lolos' : 'GAGAL'));
  }
}

// Jaga-jaga: ikon putih di hijau WhatsApp hanya 1.98 — pastikan tidak dipakai.
for (const [label, path] of sumber) {
  const d = bacaBlok(fs.readFileSync(path, 'utf8'), '.wa-apung');
  if (d && d.fg && ['#ffffff', '#fff'].includes(d.fg.toLowerCase())) {
    console.log('  GAGAL ikon putih di hijau WA hanya 1.98:1 — ' + label);
    gagal++;
  }
}

console.log(gagal === 0
  ? `\nOK   ${dicek} pasangan tombol WhatsApp lolos ambang`
  : '\nGAGAL kontras tombol WhatsApp');
process.exit(gagal === 0 ? 0 : 1);
