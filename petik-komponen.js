/* petik-komponen.js — ambil nama komponen + situs sumber dari ringkasan riset,
   supaya keputusan "apa yang belum kepakai" tidak ditebak dari ingatan.

   Kenapa Node, bukan grep: ringkasan itu JSON dengan blok Tailwind panjang
   yang mengandung tanda kutip dan baris baru — grep memberi potongan tanpa
   struktur, jadi tidak jelas nama komponen mana milik resep mana. */
const fs = require('fs');

const F = process.argv[2];
const teks = fs.readFileSync(F, 'utf8');

// Ringkasan diawali beberapa baris pengantar sebelum JSON-nya.
const mulai = teks.indexOf('{');
const akhir = teks.lastIndexOf('}');
let data = null;
try { data = JSON.parse(teks.slice(mulai, akhir + 1)); }
catch (e) { console.log('JSON tidak utuh (task gagal di tengah?): ' + e.message); }

if (data && Array.isArray(data.components)) {
  console.log('KOMPONEN DARI RISET (' + data.components.length + '):');
  data.components.forEach((k, i) => {
    const nama = k.name || '(tanpa nama)';
    const situs = k.used_by || k.site || k.product || '';
    console.log('  ' + String(i + 1).padStart(2) + '. ' + nama + (situs ? '   [' + situs + ']' : ''));
  });
} else if (data) {
  console.log('KUNCI TINGKAT ATAS: ' + Object.keys(data).join(', '));
  Object.entries(data).forEach(([k, v]) => {
    const n = Array.isArray(v) ? v.length + ' item' : typeof v;
    console.log('  ' + k + ' -> ' + n);
  });
}
