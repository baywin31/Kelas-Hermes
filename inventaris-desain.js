/* inventaris-desain.js — daftar isi VISUAL halaman materi yang sudah dirender.

   Kenapa ada: pertanyaan "desainnya sudah berubah?" tidak boleh dijawab dengan
   perasaan. Skrip ini membaca HTML hasil render (bukan kode sumber PHP) dan
   melaporkan apa yang benar-benar ada di halaman: bilah kepala, rel kurikulum,
   kartu section, kartu warna per jenis, tabel, checklist, blok kode.

   Pemakaian: node inventaris-desain.js b1 */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const DIR = 'C:/Users/user/apps/karyawan-digital-php/pratinjau';
const b = process.argv[2] || 'b1';
const p = DIR + '/' + b + '.html';
if (!fs.existsSync(p)) {
  console.log('Belum ada ' + p + '. Jalankan: bash uji-isi.sh && node siap-pratinjau.js');
  process.exit(1);
}

const doc = new JSDOM(fs.readFileSync(p, 'utf8')).window.document;
const t = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
const n = (sel) => doc.querySelectorAll(sel).length;

console.log('=== ' + b.toUpperCase() + ' — ' + t(doc.querySelector('title')) + ' ===');

console.log('\n-- Bilah kepala Bagian --');
console.log('  eyebrow/pill   : ' + (t(doc.querySelector('.kd-eyebrow, [class*="uppercase"][class*="tracking"]')) || '(tidak ada)'));
console.log('  judul (H1/H2)  : ' + t(doc.querySelector('h1')));
// Keping metrik dikenali dari kelas .kd-meta / bentuk pill monospace-nya.
// Bukan dari 'tabular-nums': komponen ini memakai font-mono, dan mencari kelas
// yang salah membuat laporan bilang "tidak ada" padahal ada — laporan yang
// salah lebih buruk daripada tidak ada laporan.
const metrik = [...doc.querySelectorAll('.kd-meta, [class*="font-mono"][class*="rounded-full"]')].map(t).filter(Boolean);
console.log('  keping metrik  : ' + (metrik.length ? metrik.join('  |  ') : '(tidak ada)'));
console.log('  bilah kemajuan : ' + (doc.querySelector('[data-baca-maju], .kd-baca-maju') ? 'ADA' : 'tidak ada'));

console.log('\n-- Rel kurikulum (panel kiri) --');
const rel = [...doc.querySelectorAll('.kd-rel-item')];
if (!rel.length) console.log('  (tidak ada)');
rel.forEach((el) => {
  const kini = el.className.includes('kd-rel-kini') ? '  <= SEDANG DIBACA' : '';
  console.log('  - ' + t(el).slice(0, 60) + kini);
});

console.log('\n-- Daftar isi Bagian ini --');
const toc = [...doc.querySelectorAll('.kd-toc a, .toc a')];
console.log('  ' + toc.length + ' tautan' + (doc.querySelector('.kd-toc-gulir') ? ' (digulir sendiri, tepi memudar)' : ''));
toc.slice(0, 6).forEach((a) => console.log('    · ' + t(a).slice(0, 58)));
if (toc.length > 6) console.log('    · … +' + (toc.length - 6) + ' lagi');

console.log('\n-- Kartu isi --');
console.log('  kartu section  : ' + n('.kd-sec-isi'));
console.log('  sub-kartu      : ' + n('.kd-sub-isi'));

console.log('\n-- Kartu warna (callout) --');
// Pencocokan kelas harus tepat, bukan awalan: 'text-kd-accent' juga cocok
// dengan 'text-kd-accent3', jadi kartu 'waktu' ikut terhitung sebagai 'tips'.
// Dicocokkan sebagai kata utuh di dalam atribut class.
const cocok = (el, kls) => {
  const p = el.querySelector('p');
  if (!p) return false;
  return (p.getAttribute('class') || '').split(/\s+/).includes(kls);
};
const jenis = {
  'cerita (putih)': 'text-kd-fg2', 'salah (rose)': 'text-rose-300',
  'tips (aksen)': 'text-kd-accent', 'awas (merah)': 'text-red-300',
  'insight (ungu)': 'text-violet-300', 'hasil (hijau)': 'text-emerald-300',
  'catat (sky)': 'text-sky-300', 'waktu (aksen3)': 'text-kd-accent3',
  'aman (teal)': 'text-teal-300', 'periksa (lime)': 'text-lime-300',
  'opsional (redup)': 'text-kd-muted',
};
Object.entries(jenis).forEach(([nama, kls]) => {
  const hit = [...doc.querySelectorAll('.kd-callout')].filter((el) => cocok(el, kls));
  if (hit.length) {
    console.log('  ' + nama.padEnd(18) + ': ' + hit.length + '  — "' + t(hit[0].querySelector('p')) + '"');
  }
});

console.log('\n-- Elemen markdown --');
console.log('  checklist item : ' + n('.kd-ceklis li'));
console.log('  tabel          : ' + n('.kd-tabel, table'));
console.log('  blok kode      : ' + n('.kd-kode'));
// Tombol salin di blok kode memakai kelas .kd-salin (dirender komp_kode()),
// bukan atribut data-salin — itu milik tombol salin di panel admin.
console.log('  tombol salin   : ' + n('.kd-salin, [data-salin]'));
console.log('  video (iframe) : ' + n('iframe'));
console.log('  gambar/figure  : ' + n('figure'));
console.log('  ikon SVG       : ' + n('svg'));
