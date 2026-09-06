/* uji-editor.js — uji bolak-balik Markdown -> HTML -> Markdown.

   Kenapa uji ini yang paling penting dari seluruh fitur TinyMCE:
   editornya boleh cantik, tapi kalau menyimpan sekali saja merusak sintaks
   materi (kartu :::, tabel, checklist, @video), seluruh isi kelas rusak dan
   pemiliknya baru sadar setelah member mengeluh. Yang diuji: buka materi di
   editor lalu simpan tanpa mengubah apa pun -> markdown-nya harus SAMA.

   Jalankan: NODE_PATH='C:\Users\user\apps\dompetku\.test\node_modules' node uji-editor.js
*/
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const APP = __dirname;

// md-editor.js dibuat untuk browser. Di Node kita sediakan window palsu dulu,
// lalu suntik pembuat dokumen supaya htmlKeMd() punya DOM.
const dom = new JSDOM('<!doctype html><html><body></body></html>');
global.window = dom.window;
global.DOMParser = dom.window.DOMParser;

require(path.join(APP, 'md-editor.js'));
const KDMD = dom.window.KDMD || global.window.KDMD;

let lulus = 0, gagal = 0;
const ok = (nama, benar, tambahan) => {
  if (benar) { lulus++; console.log('OK   ' + nama); }
  else { gagal++; console.log('GAGAL ' + nama + (tambahan ? '\n      ' + tambahan : '')); }
};

/* Normalkan untuk perbandingan: perbedaan yang tidak berarti bagi
   _markdown.php (baris kosong ganda, spasi di ujung) tidak boleh membuat
   uji ini gagal palsu. */
const norm = (s) => String(s).replace(/\r\n/g, '\n')
  .split('\n').map((b) => b.replace(/[ \t]+$/, '')).join('\n')
  .replace(/\n{3,}/g, '\n\n').replace(/^\n+|\n+$/g, '');

function bolakBalik(nama, md) {
  const html = KDMD.mdKeHtml(md);
  const balik = KDMD.htmlKeMd(html);
  const sama = norm(balik) === norm(md);
  ok(nama, sama, sama ? '' :
    '--- masuk ---\n' + norm(md) + '\n--- keluar ---\n' + norm(balik));
  return { html, balik };
}

console.log('=== 1. blok dasar ===');
bolakBalik('paragraf', 'Ini kalimat biasa yang cukup panjang untuk diuji.');
bolakBalik('tebal & miring', 'Ada **tebal**, ada *miring*, dan `kode` di tengah.');
bolakBalik('tautan', 'Buka [situsnya](https://contoh.com) sekarang.');
bolakBalik('heading 2', '## Judul Bagian');
bolakBalik('heading 3', '### Sub bagian');
bolakBalik('daftar', '- satu\n- dua\n- tiga');
bolakBalik('daftar bernomor', '1. pertama\n2. kedua');
bolakBalik('kutipan', '> Kalimat kutipan.');
bolakBalik('pemisah', '---');

console.log('\n=== 2. sintaks khusus app ===');
bolakBalik('checklist campur', '- [ ] belum\n- [x] sudah\n- [ ] belum lagi');
bolakBalik('kartu aman', ':::aman Sebelum menekan Enter\nIsi kartunya di sini.\n:::');
bolakBalik('kartu periksa', ':::periksa Kamu sudah benar kalau\n- Terlihat tulisan siap\n:::');
bolakBalik('kartu opsional', ':::opsional Kenapa begitu\nPenjelasan panjang.\n:::');
bolakBalik('video', '@video https://youtu.be/3on5-_oqsGs Kelas Hermes');
bolakBalik('gambar', '![Tangkapan layar terminal](https://contoh.com/a.png)');
bolakBalik('blok kode', '```bash\nhermes chat\necho selesai\n```');
bolakBalik('tabel', '| Yang kamu lihat | Artinya |\n| --- | --- |\n| Unknown provider | Model salah |\n| Timeout | Jaringan |');

console.log('\n=== 3. gabungan seperti materi sebenarnya ===');
const materi = [
  '## Langkah 1 — pasang Hermes',
  '',
  'Buka terminal, lalu jalankan perintah berikut.',
  '',
  '```bash',
  'hermes chat',
  '```',
  '',
  ':::aman Sebelum menekan Enter — apa yang bisa dan tidak bisa berubah',
  '**Yang bisa berubah:** isi folder proyek.',
  '',
  '**Yang TIDAK bisa disentuh:** file sistem.',
  ':::',
  '',
  '### Kesalahan yang paling sering muncul',
  '',
  '| Yang kamu lihat di layar | Sekali tindakan |',
  '| --- | --- |',
  '| Unknown provider | Pilih model lain |',
  '',
  '- [x] Hermes terpasang',
  '- [ ] Sudah pernah chat',
].join('\n');
bolakBalik('materi lengkap', materi);

console.log('\n=== 4. keamanan: HTML nyasar tidak boleh tersimpan ===');
const jahat = KDMD.htmlKeMd('<p>Aman</p><script>alert(1)</script>'
  + '<p onclick="jahat()">Klik</p><a href="javascript:jahat()">tautan</a>'
  + '<iframe src="https://jahat.com"></iframe>');
ok('tag script tidak tersimpan', !/<script/i.test(jahat), jahat);
ok('atribut onclick tidak tersimpan', !/onclick/i.test(jahat), jahat);
ok('iframe tidak tersimpan', !/<iframe/i.test(jahat), jahat);
ok('tautan javascript: jadi teks biasa', !/\]\(javascript:/i.test(jahat), jahat);
ok('teks yang sah tetap ada', jahat.indexOf('Aman') !== -1, jahat);

console.log('\n=== 5. jenis kartu tak dikenal tidak menghancurkan isi ===');
const kartuAsing = KDMD.htmlKeMd('<div class="kd-kartu" data-jenis="ngawur">'
  + '<p class="kd-kartu-judul">Judulnya</p><p>Isinya tetap ada.</p></div>');
ok('jenis asing jatuh ke catat', /^:::catat /m.test(kartuAsing), kartuAsing);
ok('isi kartu asing selamat', kartuAsing.indexOf('Isinya tetap ada.') !== -1, kartuAsing);

console.log('\n=== 6. status centang tidak hilang saat disimpan ===');
const cek = KDMD.htmlKeMd(KDMD.mdKeHtml('- [x] sudah selesai\n- [ ] belum'));
ok('centang [x] bertahan', /- \[x\] sudah selesai/.test(cek), cek);
ok('kosong [ ] bertahan', /- \[ \] belum/.test(cek), cek);

console.log('\n-----');
console.log('LULUS=' + lulus + ' GAGAL=' + gagal);
process.exit(gagal ? 1 : 0);
