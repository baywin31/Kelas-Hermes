/* kontras-lazy.js — periksa rasio kontras warna di gaya-lazy.css, dua tema.

   Kenapa penting: gaya-lazy.css MENIMPA nilai variabel milik style.css.
   Warna yang tadinya aman bisa jadi tidak terbaca begitu nilainya diganti —
   dan itu tidak kelihatan sampai ada member yang mengeluh. Ambang: 4.5:1
   untuk huruf, 3:1 untuk garis/ikon/bidang.

   Cara pakai: node kontras-lazy.js
*/
'use strict';

function srgb(c){c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);}
function terang(h){
  h=h.replace('#','');
  const n=parseInt(h.length===3?h.split('').map(x=>x+x).join(''):h,16);
  return 0.2126*srgb((n>>16)&255)+0.7152*srgb((n>>8)&255)+0.0722*srgb(n&255);
}
function rasio(a,b){const l1=terang(a),l2=terang(b);
  return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);}

/* Nilai harus SAMA dengan gaya-lazy.css */
const TEMA = {
  terang: {
    bg:'#EDEDEF', panel:'#FFFFFF', panel2:'#F4F4F7', panel3:'#EAEAEF',
    bgSoft:'#F8F8F8', line:'#DEDEE3',
    fg:'#1A1A1F', fg2:'#3E434A', muted:'#66666E', muted2:'#6A727C',
    accent:'#00B8F8', accent2:'#33C6FA', accent3:'#0050A0', onAccent:'#062A38',
    ok:'#1F7A5A', danger:'#B3121A', warn:'#8A5E00',
    isi:'#0E86C4', kotak:'#E8E8E8',
    okBg:'#1F7A5A', errBg:'#B3121A', infoBg:'#0050A0', warnBg:'#8A5E00',
    topbar:'#FFFFFF'
  },
  gelap: {
    bg:'#25282b', panel:'#2b2f32', panel2:'#32373b', panel3:'#383d42',
    bgSoft:'#2b2f32', line:'#424A50',
    fg:'#f2f7fc', fg2:'#cfdae5', muted:'#94a3af', muted2:'#8C98A3',
    accent:'#A4D8FF', accent2:'#BFE4FF', accent3:'#8CCBFA', onAccent:'#22262a',
    ok:'#7fd8b5', danger:'#ff9b9e', warn:'#f5c97a',
    isi:'#00B8F8', kotak:'#383d42',
    okBg:'#7fd8b5', errBg:'#ff9b9e', infoBg:'#BFE4FF', warnBg:'#f5c97a',
    topbar:'#0e0f11'
  }
};

function daftar(t){
  return [
    ['judul di kartu',              t.fg,      t.panel,   4.5],
    ['isi teks di kartu',           t.fg2,     t.panel,   4.5],
    ['keterangan abu di kartu',     t.muted,   t.panel,   4.5],
    ['keterangan abu di permukaan 2', t.muted, t.panel2,  4.5],
    ['keterangan abu di latar',     t.muted,   t.bg,      4.5],
    ['label kecil di kartu',        t.muted,   t.panel,   4.5],
    ['nomor/angka besar',           t.fg,      t.panel,   3.0],
    ['tautan (accent3)',            t.accent3, t.panel,   4.5],
    ['tautan di latar',             t.accent3, t.bg,      4.5],
    ['abu-abu2 di kartu',           t.muted2,  t.panel,   4.5],
    ['hijau (ok) sbg teks',         t.ok,      t.panel,   4.5],
    ['merah (danger) sbg teks',     t.danger,  t.panel,   4.5],
    ['kuning (warn) sbg teks',      t.warn,    t.panel,   4.5],
    ['lencana selesai',             t.okBg,    t.panel,   4.5],
    ['lencana baru',                t.warnBg,  t.panel,   4.5],
    ['pesan galat',                 t.errBg,   t.panel,   4.5],
    ['pesan info',                  t.infoBg,  t.panel,   4.5],
    ['huruf di tombol utama',       t.onAccent, t.accent, 4.5],
    ['huruf di tombol utama (hover)', t.onAccent, t.accent2, 4.5],
    ['isi grafik di kartu',         t.isi,     t.panel,   3.0],
    ['isi grafik di kotak',         t.isi,     t.kotak,   3.0],
    ['cincin di kartu',             t.isi,     t.panel,   3.0],
    ['garis pemisah di kartu',      t.line,    t.panel,   1.3],
    ['bilah atas: isi vs latar',    t.fg,      t.topbar,  4.5]
  ];
}

let lulus=0, gagal=0; const temuan=[];
for (const [nama, t] of Object.entries(TEMA)) {
  console.log('\n=== TEMA ' + nama.toUpperCase() + ' ===');
  for (const [apa, depan, dasar, ambang] of daftar(t)) {
    const r = rasio(depan, dasar);
    const ok = r >= ambang;
    if (ok) lulus++; else { gagal++; temuan.push(`${nama}: ${apa} = ${r.toFixed(2)} (butuh ${ambang})`); }
    console.log((ok?'  OK  ':' GAGAL') + '  ' + apa.padEnd(32) +
      depan.padEnd(9) + ' di ' + dasar.padEnd(9) + r.toFixed(2).padStart(6) + '  (min ' + ambang + ')');
  }
}

console.log('\n' + '='.repeat(70));
console.log(`LULUS: ${lulus}   GAGAL: ${gagal}`);
if (gagal) { console.log('\nPerlu dibetulkan:'); temuan.forEach(x=>console.log('  - '+x)); }
console.log('='.repeat(70));
process.exit(gagal ? 1 : 0);
