/* banding-versi.js — bandingkan versi biasa vs versi ponytail secara TERUKUR.

   Kenapa perlu: klaim "lebih sederhana" gampang diucapkan. Angka tidak bisa
   dibantah: jumlah baris, jumlah berkas, jumlah aturan CSS, jumlah JS, jumlah
   media query. Alat ini menghitungnya dari berkas aslinya.

   Cara pakai: node banding-versi.js
*/
'use strict';
const fs = require('fs');

function baca(f) { return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null; }

/* Hitung aturan CSS: satu '{' yang bukan bagian @media bersarang dianggap aturan. */
function aturanCss(css) {
  return (css.match(/\{/g) || []).length;
}

function ukur(nama, berkasCss, berkasHtml) {
  const html = baca(berkasHtml);
  if (!html) return { nama, ada: false };

  // CSS: dari berkas terpisah ATAU blok <style> di dalam halaman.
  let css = '';
  const m = html.match(/<style>([\s\S]*?)<\/style>/);
  if (m) css = m[1];
  else if (berkasCss) css = baca(berkasCss) || '';

  const isiHtmlSaja = html.replace(/<style>[\s\S]*?<\/style>/, '');

  return {
    nama,
    ada: true,
    berkas: 1 + (berkasCss ? 1 : 0),
    barisHtml: html.split('\n').length,
    barisCss: css ? css.split('\n').length : 0,
    byteHtml: Buffer.byteLength(html),
    byteCss: css ? Buffer.byteLength(css) : 0,
    aturanCss: aturanCss(css),
    token: new Set((css.match(/--[a-z0-9-]+(?=\s*:)/g) || [])).size,
    mediaQuery: (css.match(/@media/g) || []).length,
    barisJs: (isiHtmlSaja.match(/<script>[\s\S]*?<\/script>/g) || [])
              .join('').split('\n').length - 1,
    svg: (html.match(/<svg/g) || []).length,
    angkaSihir: (css.match(/\d+\.\d+/g) || []).length,
    kelasDipakai: new Set((html.match(/class="([^"]+)"/g) || [])
                    .flatMap(x => x.slice(7, -1).split(/\s+/))).size,
    kelasDiCss: new Set((css.match(/\.([a-zA-Z][\w-]*)/g) || [])
                    .map(x => x.slice(1))).size
  };
}

const a = ukur('versi-biasa  (Figma + JS tema)', 'dashboard-baru.css', 'percobaan-dashboard.html');
const b = ukur('versi-ponytail (tema dari OS)', null, 'dashboard-lazy.html');

/* Penjagaan: halaman harus benar-benar ada. */
if (!a.ada || !b.ada) { console.error('Berkas tidak lengkap'); process.exit(1); }

const BARIS = [
  ['jumlah berkas',              a.berkas,            b.berkas],
  ['baris HTML',                 a.barisHtml,         b.barisHtml],
  ['baris CSS',                  a.barisCss,          b.barisCss],
  ['TOTAL baris',                a.barisHtml + a.barisCss, b.barisHtml + b.barisCss],
  ['TOTAL byte',                 a.byteHtml + a.byteCss, b.byteHtml + b.byteCss],
  ['aturan CSS',                 a.aturanCss,         b.aturanCss],
  ['token warna (--x)',          a.token,             b.token],
  ['@media (tata letak+tema)',   a.mediaQuery,        b.mediaQuery],
  ['baris JavaScript',           a.barisJs,           b.barisJs],
  ['elemen <svg>',               a.svg,               b.svg],
  ['angka desimal sihir',        a.angkaSihir,        b.angkaSihir],
  ['kelas dipakai di HTML',      a.kelasDipakai,      b.kelasDipakai],
  ['kelas didefinisikan di CSS', a.kelasDiCss,        b.kelasDiCss]
];

console.log('='.repeat(74));
console.log('PERBANDINGAN TERUKUR');
console.log('='.repeat(74));
console.log('  ' + 'ukuran'.padEnd(30) + 'biasa'.padStart(10) + 'ponytail'.padStart(12) + 'selisih'.padStart(12));
console.log('-'.repeat(74));

let turunBaris = 0, turunByte = 0;
for (const [nama, va, vb] of BARIS) {
  const d = vb - va;
  const tanda = d > 0 ? '+' : '';
  const persen = va ? '  (' + (d / va * 100).toFixed(0) + '%)' : '';
  console.log('  ' + nama.padEnd(30) + String(va).padStart(10) + String(vb).padStart(12) +
              (tanda + d + persen).padStart(12));
  if (nama === 'TOTAL baris') turunBaris = d;
  if (nama === 'TOTAL byte') turunByte = d;
}

console.log('='.repeat(74));
const persenBaris = (turunBaris / (a.barisHtml + a.barisCss) * 100).toFixed(1);
const persenByte = (turunByte / (a.byteHtml + a.byteCss) * 100).toFixed(1);
console.log(`Hemat: ${Math.abs(turunBaris)} baris (${persenBaris}%)  dan  ` +
            `${Math.abs(turunByte)} byte (${persenByte}%)`);
console.log('='.repeat(74));

/* Ponytail: kode sederhana tanpa pemeriksa = belum selesai. */
const salah = [];
if (b.barisJs !== 0) salah.push('versi ponytail masih punya JavaScript');
if (b.svg !== 0) salah.push('versi ponytail masih punya SVG');
if (b.berkas !== 1) salah.push('versi ponytail masih lebih dari satu berkas');
if (b.barisHtml + b.barisCss >= a.barisHtml + a.barisCss) salah.push('versi ponytail tidak lebih pendek');

console.log(salah.length ? 'PERIKSA GAGAL:\n  - ' + salah.join('\n  - ') : 'PERIKSA LULUS: lebih sedikit berkas, tanpa JS, tanpa SVG, lebih pendek.');
process.exit(salah.length ? 1 : 0);
