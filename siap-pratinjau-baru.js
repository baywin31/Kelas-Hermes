/* siap-pratinjau-baru.js — jadikan halaman percobaan dashboard bisa dibuka
   dengan klik dua kali, tanpa server dan tanpa PHP.

   Kenapa perlu: halaman percobaan memakai <link> ke dashboard-baru.css. Kalau
   berkas itu dipisah, membukanya lewat klik dua kali (protokol file://) masih
   bisa gagal karena batasan keamanan browser. Jadi isi CSS-nya disisipkan
   langsung ke dalam halaman.

   Hasil: pratinjau/dashboard-baru.html — satu berkas, bisa dikirim lewat
   WhatsApp/email dan dibuka di HP mana pun.
*/
'use strict';
const fs = require('fs');

const html = fs.readFileSync('percobaan-dashboard.html', 'utf8');
const css = fs.readFileSync('dashboard-baru.css', 'utf8');

if (!html.includes('<link rel="stylesheet" href="dashboard-baru.css">')) {
  console.error('Penanda <link> tidak ditemukan — berkas sumber berubah?');
  process.exit(1);
}

const utuh = html.replace(
  '<link rel="stylesheet" href="dashboard-baru.css">',
  '<!-- CSS disisipkan supaya berkas ini bisa dibuka tanpa server -->\n<style>\n' + css + '\n</style>'
);

fs.mkdirSync('pratinjau', { recursive: true });
fs.writeFileSync('pratinjau/dashboard-baru.html', utuh);

/* Pastikan tidak ada sisa rujukan ke berkas luar. */
const sisa = [...utuh.matchAll(/<link[^>]*href="(?!data:|https?:)[^"]+"/g)].map(m => m[0]);
console.log('pratinjau/dashboard-baru.html  ' + (utuh.length / 1024).toFixed(1) + ' KB');
console.log('rujukan ke berkas luar tersisa: ' + (sisa.length ? sisa.join(' | ') : 'tidak ada'));
console.log('CSS tertanam: ' + (utuh.includes('<style>') ? 'ya' : 'TIDAK'));
console.log('siap dibuka dengan klik dua kali: ' +
  'C:\\Users\\user\\apps\\karyawan-digital-php\\pratinjau\\dashboard-baru.html');
process.exit(sisa.length ? 1 : 0);
