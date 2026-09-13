/* kontras-baru.js — periksa rasio kontras SEMUA pasangan warna di halaman
   percobaan dashboard, di tema terang DAN gelap.

   Kenapa dibuat: warnanya diambil dari file referensi (Figma), bukan dipilih
   manual. Warna bidang pada referensi belum tentu aman untuk HURUF — dan teks
   yang gagal kontras adalah cacat yang tidak kelihatan sampai ada yang
   mengeluh. Ambang: 4.5:1 (WCAG AA teks normal), 3:1 (teks besar / ikon).

   Cara pakai: node kontras-baru.js   → keluar dengan kode 1 kalau ada gagal.
*/
'use strict';

function srgb(c) {
  c = c / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function terang(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h, 16);
  return 0.2126 * srgb((n >> 16) & 255) + 0.7152 * srgb((n >> 8) & 255) + 0.0722 * srgb(n & 255);
}

function rasio(a, b) {
  const l1 = terang(a), l2 = terang(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/* Nilai harus SAMA dengan dashboard-baru.css (:root dan html.gelap). */
const TEMA = {
  terang: {
    bg: '#EDEDEF', surf: '#FFFFFF', surf2: '#F8F8F8', surf3: '#E8E8E8',
    biru: '#00B8F8', biruIsi: '#0E86C4', biruTua: '#1870B8', biruGelap: '#0050A0',
    merah: '#B00020', merahIsi: '#B00020', teal: '#2A7070', tealIsi: '#2A7070',
    kuning: '#8A5E00', grd1: '#1870B8', grd2: '#0050A0',
    fonBiru: '#062A38', fonTeal: '#FFFFFF',
    teks: '#1A1A1F', teks2: '#54545C', teks3: '#66666E'
  },
  gelap: {
    bg: '#1B1E21', surf: '#25282B', surf2: '#2B2F32', surf3: '#313539',
    biru: '#00B8F8', biruIsi: '#00B8F8', biruTua: '#5FB8F0', biruGelap: '#8FD0FF',
    merah: '#FFA0B4', merahIsi: '#E8556E', teal: '#5FB8B0', tealIsi: '#5FB8B0',
    kuning: '#E0B24A', grd1: '#0F5C8C', grd2: '#0A3F63',
    fonBiru: '#062A38', fonTeal: '#062A38',
    teks: '#F2F7FC', teks2: '#C3CEDA', teks3: '#94A3AF'
  }
};

/* [apa, warna depan, warna dasar, ambang] */
function daftar(t) {
  return [
    /* --- teks di permukaan --- */
    ['judul di kartu',                 t.teks,    t.surf,    4.5],
    ['isi teks di kartu',              t.teks2,   t.surf,    4.5],
    ['keterangan abu di kartu',        t.teks3,   t.surf,    4.5],
    ['keterangan abu di latar',        t.teks3,   t.bg,      4.5],
    ['judul di permukaan 2',           t.teks,    t.surf2,   4.5],
    ['keterangan di permukaan 2',      t.teks3,   t.surf2,   4.5],
    ['keterangan di permukaan 3',      t.teks3,   t.surf3,   4.5],
    ['angka besar (teks besar)',       t.teks,    t.surf,    3.0],
    ['nama hari abu',                  t.teks3,   t.surf,    4.5],
    ['label huruf kapital kecil',      t.teks3,   t.surf,    4.5],

    /* --- tautan & aksen sebagai HURUF/IKON --- */
    ['biru gelap sbg teks tautan',     t.biruGelap, t.surf,  4.5],
    ['biru gelap di latar',            t.biruGelap, t.bg,    4.5],
    ['teal sbg teks',                  t.teal,    t.surf,    4.5],
    ['teal sbg teks di permukaan 2',   t.teal,    t.surf2,   4.5],
    ['merah sbg teks',                 t.merah,   t.surf,    4.5],
    ['merah sbg teks di permukaan 2',  t.merah,   t.surf2,   4.5],
    ['kuning sbg teks',                t.kuning,  t.surf,    4.5],
    ['ikon aktivitas (biru tua)',      t.biruGelap, t.surf,  3.0],
    ['teal sbg ikon',                  t.teal,    t.surf,    3.0],

    /* --- isi grafik & cincin (bukan huruf → ambang 3.0) --- */
    ['isi batang biru di tabung',      t.biruIsi, t.surf3,   3.0],
    ['isi batang teal di tabung',      t.tealIsi, t.surf3,   3.0],
    ['isi batang biru di kartu',       t.biruIsi, t.surf,    3.0],
    ['isi batang teal di kartu',       t.tealIsi, t.surf,    3.0],
    ['cincin biru di kartu',           t.biruIsi, t.surf,    3.0],
    ['cincin teal di kartu',           t.tealIsi, t.surf,    3.0],

    /* --- huruf di atas bidang berwarna --- */
    ['teks di tombol biru',            t.fonBiru, t.biru,    4.5],
    ['teks di kotak hari (biru)',      t.fonBiru, t.biru,    4.5],
    ['teks di kotak hari (teal)',      t.fonTeal, t.tealIsi, 4.5],
    ['teks di tombol putih',           '#0A5A78', '#FFFFFF', 4.5],

    /* --- kartu gradasi "lanjutkan belajar" (huruf putih) --- */
    ['huruf putih di ujung gradasi 1', '#FFFFFF', t.grd1,   4.5],
    ['huruf putih di ujung gradasi 2', '#FFFFFF', t.grd2,   4.5],

    /* --- lain-lain --- */
    ['teks penukar tema',              t.teks2,   t.surf,    4.5]
  ];
}

let gagal = 0, lulus = 0;
const temuan = [];

for (const [namaTema, t] of Object.entries(TEMA)) {
  console.log('\n=== TEMA ' + namaTema.toUpperCase() + ' ===');
  for (const [apa, depan, dasar, ambang] of daftar(t)) {
    const r = rasio(depan, dasar);
    const ok = r >= ambang;
    if (ok) lulus++; else { gagal++; temuan.push(`${namaTema}: ${apa} = ${r.toFixed(2)} (butuh ${ambang})`); }
    console.log(
      (ok ? '  OK  ' : ' GAGAL') +
      '  ' + apa.padEnd(32) + depan.padEnd(9) + ' di ' + dasar.padEnd(9) +
      r.toFixed(2).padStart(6) + '  (min ' + ambang + ')'
    );
  }
}

console.log('\n' + '='.repeat(70));
console.log(`LULUS: ${lulus}   GAGAL: ${gagal}`);
if (gagal) {
  console.log('\nYang perlu dibetulkan:');
  temuan.forEach(x => console.log('  - ' + x));
}
console.log('='.repeat(70));
process.exit(gagal ? 1 : 0);
