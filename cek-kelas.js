/* cek-kelas.js — pastikan SETIAP kelas Tailwind yang benar-benar sampai ke
   halaman punya aturan di tw.css / style.css.

   Kenapa uji ini perlu:
   Tailwind hanya membangun kelas yang dia TEMUKAN saat memindai berkas sumber.
   Kalau ada kelas salah tulis, atau dirangkai dari potongan string sehingga
   tidak terbaca pemindai, kelas itu tidak akan ada di tw.css — halaman tetap
   tampil tanpa error, cuma jelek. Persis jenis kerusakan yang tidak terlihat
   sampai pembeli membukanya.

   Sumbernya HTML HASIL RENDER (yang disimpan uji-isi.sh), bukan berkas PHP:
   di PHP kelas masih bercampur potongan kode, sedangkan di HTML hasil render
   yang ada persis apa yang diterima browser. */
const fs = require('fs');

const DIR  = 'C:/Users/user/apps/karyawan-digital-php';
const TMP  = process.env.LOCALAPPDATA + '/Temp/kd-uji-isi';
const css  = fs.readFileSync(DIR + '/tw.css', 'utf8')
           + fs.readFileSync(DIR + '/style.css', 'utf8');

const halaman = ['b1.html', 'b2.html', 'b3.html', 'b4.html']
  .map(function (f) { return TMP + '/' + f; })
  .filter(function (p) { return fs.existsSync(p); });

if (!halaman.length) {
  console.log('HTML hasil render belum ada. Jalankan dulu: bash uji-isi.sh');
  process.exit(1);
}

/* Kelas penanda milik kita sendiri: dipakai uji & JS, tidak semuanya wajib
   punya gaya. Kelas struktural lama dari style.css juga dilewati. */
const LEWATI = /^(kd-(sec|sub|cek|kartu|callout|kode|salin|tabel|ceklis)(-[a-z]+)?|group|mono|hint|sub|card|btn|ghost|danger|wrap|topbar|footer|nav|toc|flash|err|ok|skip|badge|row|isi-materi|video-embed|gambar|wa-apung|subnav)$/;

function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/* Tailwind melolosi karakter khusus dengan garis miring terbalik:
   "bg-white/[.02]" ditulis ".bg-white\/\[\.02\]" di CSS. Jadi pencocokan
   mengizinkan garis miring terbalik opsional di depan tiap karakter. */
function adaDiCss(k) {
  const pola = new RegExp('\\.' + k.split('').map(function (c) {
    return '\\\\?' + escRe(c);
  }).join('') + '(?![-\\w])');
  return pola.test(css);
}

const semua = new Map(); // kelas -> halaman pertama yang memakainya
halaman.forEach(function (p) {
  const isi = fs.readFileSync(p, 'utf8');
  const nama = p.split('/').pop();
  let m;
  const re = /class="([^"]*)"/g;
  while ((m = re.exec(isi)) !== null) {
    m[1].split(/\s+/).forEach(function (k) {
      if (k && !semua.has(k)) semua.set(k, nama);
    });
  }
});

let cek = 0;
const hilang = [];
semua.forEach(function (asal, k) {
  if (LEWATI.test(k)) return;
  cek++;
  if (!adaDiCss(k)) hilang.push(k + '  (' + asal + ')');
});

console.log('halaman diperiksa : ' + halaman.length);
console.log('kelas diperiksa   : ' + cek);
console.log('kelas tanpa gaya  : ' + hilang.length);
if (hilang.length) {
  hilang.slice(0, 40).forEach(function (h) { console.log('  HILANG ' + h); });
  process.exit(1);
}
console.log('-----');
console.log('SEMUA KELAS DI HALAMAN ADA GAYANYA');
