/* papan-desain.js — papan pratinjau komponen: potongan NYATA dari halaman materi
   yang sudah dirender, disusun jadi satu berkas untuk dilihat di chat.

   Kenapa potongan nyata, bukan gambar contoh: yang perlu dinilai adalah HTML +
   CSS yang benar-benar dikirim ke pembeli. Kalau papan ini digambar ulang dengan
   tangan, ia bisa terlihat bagus sementara halaman aslinya rusak.

   Pemakaian: node papan-desain.js   (hasil: pratinjau/papan-desain.html) */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const APP = 'C:/Users/user/apps/karyawan-digital-php';
const DIR = APP + '/pratinjau';
const src = DIR + '/b1.html';
if (!fs.existsSync(src)) {
  console.log('Belum ada ' + src + '. Jalankan: bash uji-isi.sh && node siap-pratinjau.js');
  process.exit(1);
}

const doc = new JSDOM(fs.readFileSync(src, 'utf8')).window.document;
const doc3 = fs.existsSync(DIR + '/b3.html')
  ? new JSDOM(fs.readFileSync(DIR + '/b3.html', 'utf8')).window.document : null;

const css = ['style.css', 'tw.css']
  .map((f) => fs.readFileSync(DIR + '/' + f, 'utf8')).join('\n');

/* Ambil satu elemen sebagai HTML apa adanya. */
const ambil = (d, sel) => { const el = d && d.querySelector(sel); return el ? el.outerHTML : ''; };

/* Kartu callout berdasarkan warna judulnya (kelas utuh, bukan awalan). */
const callout = (d, kls) => {
  if (!d) return '';
  const hit = [...d.querySelectorAll('.kd-callout')].find((el) => {
    const p = el.querySelector('p');
    return p && (p.getAttribute('class') || '').split(/\s+/).includes(kls);
  });
  return hit ? hit.outerHTML : '';
};

const bagian = (judul, catatan, isi) => !isi ? '' : `
<section class="pd-blok">
  <h2 class="pd-h2">${judul}</h2>
  <p class="pd-cat">${catatan}</p>
  <div class="pd-panggung">${isi}</div>
</section>`;

/* Kartu section pertama, dipotong isinya supaya papan tidak jadi sepanjang
   halaman aslinya — yang dinilai bentuknya, bukan panjang materinya. */
let sec = '';
const secEl = doc.querySelector('.kd-sec');
if (secEl) {
  const salinan = secEl.cloneNode(true);
  const isi = salinan.querySelector('.kd-sec-isi');
  if (isi) {
    const anak = [...isi.children];
    anak.slice(3).forEach((el) => el.remove());
  }
  sec = salinan.outerHTML;
}

const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Papan desain — halaman materi Karyawan Digital</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
${css}
/* Gaya khusus papan ini saja — tidak ikut ke produk. */
html, body { background: #25282b !important; margin: 0 !important; }
body { padding: 22px 20px 40px; font-family: Inter, system-ui, sans-serif; }
.pd-judul { margin: 0 0 4px; font-size: 15px; font-weight: 600; letter-spacing: -.2px; color: #f2f7fc; }
.pd-sub { margin: 0 0 26px; font-size: 12.5px; line-height: 1.6; color: #94a3af; max-width: 70ch; }
.pd-blok { margin: 0 0 30px; }
.pd-h2 { margin: 0 0 3px; font-family: 'JetBrains Mono', monospace; font-size: 10.5px;
  font-weight: 500; text-transform: uppercase; letter-spacing: .14em; color: #A4D8FF; }
.pd-cat { margin: 0 0 12px; font-size: 12px; line-height: 1.6; color: #6d7883; max-width: 74ch; }
.pd-panggung { max-width: 760px; }
.pd-panggung > * { margin-top: 0 !important; }
.pd-rel { max-width: 320px; }
</style>
</head>
<body>
<p class="pd-judul">Papan desain — potongan asli halaman materi</p>
<p class="pd-sub">Setiap blok di bawah ini adalah HTML &amp; CSS yang benar-benar dikirim ke pembeli, diambil dari halaman Bagian 1 dan 3 yang sudah dirender — bukan gambar contoh.</p>

${bagian('Bilah kepala Bagian', 'Dipisah dari kartu isi supaya tangkapan layar bagian mana pun tetap membawa identitas: nomor Bagian, judul, waktu baca, jumlah bagian.', ambil(doc, 'main header.kd-kartu, .isi-materi ~ header, article header.kd-kartu') || ambil(doc, 'header.kd-kartu'))}

${bagian('Rel kurikulum', 'Fungsinya bukan navigasi, tapi bukti volume: satu potongan layar ikut membuktikan kelasnya berisi banyak Bagian. Baris yang sedang dibaca ditandai.', '<div class="pd-rel">' + [...doc.querySelectorAll('.kd-rel-item')].map((el) => el.outerHTML).join('') + '</div>')}

${bagian('Kartu section (satu kartu per ##)', 'Nomor urut besar dan redup di kiri, garis cahaya 1px di tepi atas, sorot lembut di sudut. Kesan mahal di tema gelap datang dari cahaya, bukan dari bayangan hitam.', sec)}

${bagian('Kartu aman — batas kerusakan', 'Rasa takut pembaca gaptek bukan "salah perintah", tapi "merusak laptop". Kartu ini menyebut apa yang bisa berubah, apa yang tidak akan tersentuh, dan cara membatalkan.', callout(doc, 'text-teal-300'))}

${bagian('Kartu titik periksa', '"Kamu sudah benar kalau…" — pemula tidak tahu kapan boleh lanjut. Tanpa ini dia mengulang langkah yang sudah berhasil.', callout(doc, 'text-lime-300'))}

${bagian('Kartu opsional', 'Penjelasan "kenapa"-nya ditaruh di sini beserta izin melewatinya. Materi jadi berlapis tanpa membuat pemula merasa bodoh.', callout(doc3, 'text-kd-muted'))}

${bagian('Kartu cerita (pembuka storytelling)', 'Pembuka setiap Bagian. Masalah yang disebut adalah masalah alur kerja 5 menit ke depan, bukan masalah hidup — itu yang membedakan pelajaran dari iklan.', callout(doc, 'text-kd-fg2'))}

${bagian('Kartu cara yang salah', 'Menyebut kesalahan yang paling sering terjadi sebelum pembaca mengalaminya sendiri.', callout(doc, 'text-rose-300'))}

${bagian('Kartu hasil', 'Janji hasil akhir yang bisa diperiksa. Ini kartu yang paling layak masuk tangkapan layar untuk landing page.', callout(doc, 'text-emerald-300'))}

${bagian('Tabel error — tulisan persis seperti di layar', 'Pembaca gaptek mencocokkan tulisan, bukan membaca penjelasan. Kolom kanan berisi satu tindakan, bukan teori.', ambil(doc, '.kd-tabel-geser') || ambil(doc, '.kd-tabel'))}

${bagian('Checklist', 'Kotak centang digambar sendiri, bukan input formulir: ini bacaan, tidak ada yang perlu dikirim ke server.', ambil(doc, '.kd-ceklis'))}

${bagian('Blok kode + tombol salin', 'Pembaca yang belum lancar mengetik perintah panjang paling sering gagal karena salah ketik. Satu tombol ini menghapus seluruh kelas kesalahan itu.', ambil(doc, '.kd-kode'))}
</body>
</html>`;

fs.writeFileSync(DIR + '/papan-desain.html', html);
console.log('papan siap: ' + DIR + '/papan-desain.html  (' + Math.round(html.length / 1024) + ' KB)');
