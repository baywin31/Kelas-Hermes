/* uji-editor-dom.js — uji logika sisi-klien editor-materi.js tanpa browser.
 *
 * Kenapa perlu, padahal sudah ada uji-editor.js dan uji-tinymce.sh:
 *   - uji-editor.js  : hanya konversi markdown <-> html (KDMD)
 *   - uji-tinymce.sh : hanya sisi server (berkas terkirim, POST tersimpan)
 *   Yang belum teruji adalah PERANTARANYA: apakah isi editor visual benar-benar
 *   dipindahkan ke <textarea name="isi_md"> saat form dikirim. Kalau bagian ini
 *   salah, semua uji lain tetap hijau tapi setiap penyimpanan admin
 *   mengembalikan teks lama — kehilangan kerja tanpa pesan error.
 *
 * browser_exec di mesin ini mati dan menolak alamat localhost, jadi TinyMCE
 * diganti tiruan seminimal mungkin: yang diuji memang kode app, bukan TinyMCE.
 *
 * Jalankan: NODE_PATH='C:\Users\user\apps\dompetku\.test\node_modules' node uji-editor-dom.js
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const APP = __dirname;
let lulus = 0, gagal = 0;
const ok = (n, b, x) => {
  if (b) { lulus++; console.log('OK   ' + n); }
  else { gagal++; console.log('BAD  ' + n + (x ? '\n     ' + x : '')); }
};

/* ---------- halaman tiruan: bentuknya sama dengan admin_materi.php ---------- */

const MD_AWAL = [
  '## Judul awal',
  '',
  'Paragraf awal.',
  '',
  ':::tips Judul tips',
  'Isi tips.',
  ':::',
  '',
  '- [x] sudah',
  '- [ ] belum'
].join('\n');

const dom = new JSDOM(`<!doctype html><html><body>
  <form method="post">
    <textarea id="isi_md" name="isi_md"></textarea>
    <p class="hint" data-hint-md>petunjuk markdown</p>
    <p class="hint" data-hint-visual hidden>petunjuk visual</p>
    <button name="aksi" value="simpan" type="submit">Simpan</button>
    <button name="aksi" value="pratinjau" type="submit">Pratinjau</button>
    <textarea id="kerangka-modul">## Kerangka\n\n:::cerita Pembuka\nCerita.\n:::</textarea>
  </form>
</body></html>`, { url: 'http://localhost/', pretendToBeVisual: true, runScripts: 'outside-only' });

const win = dom.window;
const doc = win.document;
doc.getElementById('isi_md').value = MD_AWAL;

// localStorage tiruan: jsdom punya, tapi dipastikan bersih.
try { win.localStorage.clear(); } catch (e) {}

/* ---------- TinyMCE tiruan ----------
   Hanya API yang dipakai editor-materi.js. Isi editor disimpan di sebuah div
   nyata di dalam jsdom, sehingga getContent() mengembalikan HTML sungguhan
   dan konversi ke markdown teruji apa adanya. */

const kotakIsi = doc.createElement('div');
doc.body.appendChild(kotakIsi);

const tombolTerdaftar = [];
const menuTerdaftar = [];
let cfg = null;

function buatEditor() {
  const ed = {
    getContent: (o) => (o && o.format === 'text' ? kotakIsi.textContent : kotakIsi.innerHTML),
    setContent: (h) => { kotakIsi.innerHTML = h; },
    insertContent: (h) => { kotakIsi.insertAdjacentHTML('beforeend', h); },
    execCommand: () => {},
    nodeChanged: () => {},
    on: () => {}, off: () => {},
    undoManager: { add: () => {} },
    windowManager: { open: (c) => { ed._dialog = c; return c; } },
    formatter: { formatChanged: () => ({ unbind: () => {} }) },
    selection: {
      getNode: () => kotakIsi,
      getContent: () => ''
    },
    dom: {
      getParent: (el, sel) => (el && el.closest ? el.closest(sel) : null),
      hasClass: (el, c) => !!el && el.classList.contains(c),
      addClass: (el, c) => el && el.classList.add(c),
      removeClass: (el, c) => el && el.classList.remove(c),
      select: (sel, root) => Array.from((root || kotakIsi).querySelectorAll(sel)),
      setAttrib: (el, a, v) => { if (v === null) el.removeAttribute(a); else el.setAttribute(a, v); },
      encode: (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    },
    ui: {
      registry: {
        addButton: (n, s) => tombolTerdaftar.push([n, s]),
        addToggleButton: (n, s) => tombolTerdaftar.push([n, s]),
        addMenuButton: (n, s) => { tombolTerdaftar.push([n, s]); menuTerdaftar.push([n, s]); }
      }
    }
  };
  return ed;
}

win.tinymce = {
  init: (c) => {
    cfg = c;
    const ed = buatEditor();
    if (c.setup) c.setup(ed);
    // TinyMCE memanggil ini setelah iframe siap; tiruannya langsung.
    if (c.init_instance_callback) c.init_instance_callback(ed);
  },
  on: () => {}
};

/* ---------- muat kode app apa adanya ---------- */

global.window = win;
global.document = doc;
global.DOMParser = win.DOMParser;
global.tinymce = win.tinymce;

const muat = (f) => {
  const kode = fs.readFileSync(path.join(APP, f), 'utf8');
  win.eval(kode);
};
muat('md-editor.js');
muat('editor-materi.js');

/* ---------- 1. pemasangan ---------- */

console.log('=== 1. pemasangan ===');
ok('tinymce.init dipanggil', !!cfg);
ok('selector menunjuk elemen visual, bukan isi_md',
  cfg && cfg.selector === '#isi_wysiwyg', cfg && cfg.selector);
ok('base_url lokal (bukan CDN)', cfg && cfg.base_url === 'tinymce', cfg && cfg.base_url);
ok('license_key diisi (tanpa ini muncul spanduk peringatan)', cfg && !!cfg.license_key);
ok('bahasa Indonesia', cfg && cfg.language === 'id');
ok('elemen visual dibuat', !!doc.getElementById('isi_wysiwyg'));
ok('elemen visual TIDAK punya name (tidak boleh ikut terkirim)',
  !doc.getElementById('isi_wysiwyg').getAttribute('name'));
ok('bar mode dibuat', !!doc.querySelector('.kd-ed-bar'));
ok('ada 2 tab mode', doc.querySelectorAll('.kd-ed-tab').length === 2);

/* ---------- 2. isi awal dimuat ke editor ---------- */

console.log('\n=== 2. isi awal ===');
ok('markdown awal jadi HTML di editor', /<h3>Judul awal<\/h3>/.test(kotakIsi.innerHTML),
  kotakIsi.innerHTML.slice(0, 120));
ok('kartu :::tips jadi elemen kartu',
  /data-jenis="tips"/.test(kotakIsi.innerHTML));
ok('checklist jadi ul.kd-ceklis', /class="kd-ceklis"/.test(kotakIsi.innerHTML));
ok('status centang terbawa', /data-cek="1"/.test(kotakIsi.innerHTML));

/* ---------- 3. tombol khusus terdaftar ---------- */

console.log('\n=== 3. tombol khusus ===');
const namaTombol = tombolTerdaftar.map((t) => t[0]);
['kdkode', 'kdceklis', 'kdkartu', 'kdvideo', 'kdgambar', 'kdkodeblok', 'kdkerangka']
  .forEach((n) => ok('tombol ' + n + ' terdaftar', namaTombol.indexOf(n) !== -1));

// Setiap nama di toolbar harus ada: entah tombol bawaan TinyMCE, entah tombol
// kita. Nama yang salah tidak error — tombolnya hanya tidak muncul.
const BAWAAN = ['undo', 'redo', 'blocks', 'bold', 'italic', 'bullist', 'numlist',
  'link', 'table', 'removeformat', 'searchreplace', 'fullscreen', '|'];
const dipakai = String(cfg.toolbar).split(/\s+/).filter(Boolean);
const asing = dipakai.filter((n) => BAWAAN.indexOf(n) === -1 && namaTombol.indexOf(n) === -1);
ok('semua nama di toolbar dikenal', asing.length === 0, 'tidak dikenal: ' + asing.join(', '));

// Ikon: dicocokkan dengan berkas ikon TinyMCE yang benar-benar ada.
const ikonIsi = fs.readFileSync(path.join(APP, 'tinymce/icons/default/icons.min.js'), 'utf8');
const mulai = ikonIsi.indexOf('icons:{');
const daftarIkon = new Set([...ikonIsi.slice(mulai).matchAll(/["']?([a-z][a-z0-9-]{2,})["']?\s*:/g)]
  .map((m) => m[1]));
tombolTerdaftar.forEach(([n, s]) => {
  if (!s.icon) return;
  ok('ikon "' + s.icon + '" (tombol ' + n + ') ada di paket', daftarIkon.has(s.icon));
});

/* ---------- 4. menu kartu berisi 11 jenis ---------- */

console.log('\n=== 4. menu kartu ===');
const menuKartu = menuTerdaftar.find((m) => m[0] === 'kdkartu');
ok('kdkartu adalah menu', !!menuKartu);
let itemKartu = [];
if (menuKartu) menuKartu[1].fetch((items) => { itemKartu = items; });
ok('menu kartu berisi 11 jenis', itemKartu.length === 11, 'jumlah=' + itemKartu.length);
const KDMD = win.KDMD;
const jenisMenu = itemKartu.map((i) => (i.text.match(/\(([a-z]+)\)/) || [])[1]);
ok('jenis di menu sama dengan yang didukung _markdown.php',
  JSON.stringify(jenisMenu.slice().sort()) === JSON.stringify(KDMD.JENIS.slice().sort()),
  jenisMenu.join(','));

/* ---------- 5. TITIK PALING RAWAN: submit ---------- */

console.log('\n=== 5. submit memindahkan isi editor ke textarea ===');
const ta = doc.getElementById('isi_md');

// Admin mengedit di editor visual: ubah judul dan centang item kedua.
kotakIsi.querySelector('h3').textContent = 'Judul sudah diubah';
kotakIsi.querySelectorAll('.kd-ceklis li')[1].setAttribute('data-cek', '1');

// Kosongkan textarea dulu supaya kalau submit TIDAK memindahkan apa pun,
// ujinya gagal — bukan lolos karena kebetulan isinya masih sama.
ta.value = 'NILAI LAMA YANG HARUS TERTIMPA';

const form = doc.querySelector('form');
let terkirim = false;
form.addEventListener('submit', (ev) => { terkirim = true; ev.preventDefault(); });
form.dispatchEvent(new win.Event('submit', { bubbles: true, cancelable: true }));

ok('event submit berjalan', terkirim);
ok('textarea tidak lagi berisi nilai lama', ta.value.indexOf('NILAI LAMA') === -1,
  ta.value.slice(0, 80));
ok('judul hasil edit tersimpan', /^## Judul sudah diubah/m.test(ta.value), ta.value.slice(0, 120));
ok('pagar kartu ::: terbentuk kembali', /^:::tips Judul tips$/m.test(ta.value));
ok('centang baru ikut tersimpan', /^- \[x\] belum$/m.test(ta.value), ta.value);
ok('tidak ada tag HTML nyasar di markdown tersimpan',
  !/<(div|p|h3|ul|li|span)\b/i.test(ta.value), ta.value.slice(0, 200));

/* ---------- 6. ganti mode tidak menghilangkan tulisan ---------- */

console.log('\n=== 6. ganti mode ===');
const tabMd = doc.querySelector('.kd-ed-tab[data-mode="markdown"]');
const tabVis = doc.querySelector('.kd-ed-tab[data-mode="visual"]');

kotakIsi.innerHTML = '<h3>Ditulis di mode visual</h3><p>Isi baru.</p>';
tabMd.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
ok('pindah ke markdown: isi editor masuk textarea',
  /^## Ditulis di mode visual$/m.test(ta.value), ta.value.slice(0, 90));
ok('pindah ke markdown: textarea terlihat', ta.style.display !== 'none');
ok('petunjuk markdown tampil', !doc.querySelector('[data-hint-md]').hidden);
ok('petunjuk visual disembunyikan', doc.querySelector('[data-hint-visual]').hidden);

ta.value = '## Diubah manual di markdown\n\nParagraf manual.';
tabVis.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
ok('pindah ke visual: markdown masuk editor',
  /Diubah manual di markdown/.test(kotakIsi.innerHTML), kotakIsi.innerHTML.slice(0, 90));
ok('pindah ke visual: textarea disembunyikan', ta.style.display === 'none');
ok('petunjuk visual tampil', !doc.querySelector('[data-hint-visual]').hidden);
ok('mode tersimpan di localStorage', win.localStorage.getItem('kd_mode_editor') === 'visual');

/* ---------- 7. tombol kerangka lewat konversi, bukan teks mentah ---------- */

console.log('\n=== 7. tombol kerangka modul ===');
const btnKerangka = tombolTerdaftar.find((t) => t[0] === 'kdkerangka');
kotakIsi.innerHTML = '';
btnKerangka[1].onAction();
ok('kerangka masuk sebagai elemen, bukan pagar teks',
  /data-jenis="cerita"/.test(kotakIsi.innerHTML), kotakIsi.innerHTML.slice(0, 140));
ok('pagar ::: tidak muncul sebagai teks di editor',
  kotakIsi.textContent.indexOf(':::') === -1, kotakIsi.textContent.slice(0, 90));

/* ---------- 8. dialog video menghasilkan @video ---------- */

console.log('\n=== 8. dialog video & gambar ===');
const edAktif = win.KD_ED;
const btnVideo = tombolTerdaftar.find((t) => t[0] === 'kdvideo');
kotakIsi.innerHTML = '';
btnVideo[1].onAction();
const dlgV = edAktif._dialog;
ok('dialog video terbuka', !!dlgV && /video/i.test(dlgV.title));
if (dlgV) {
  dlgV.onSubmit({
    getData: () => ({ url: 'https://youtu.be/3on5-_oqsGs', judul: 'Judul uji' }),
    close: () => {}
  });
  ok('elemen video tersisip', /data-url="https:\/\/youtu.be\/3on5-_oqsGs"/.test(kotakIsi.innerHTML));
  const md = KDMD.htmlKeMd(kotakIsi.innerHTML);
  ok('jadi @video saat disimpan', /^@video https:\/\/youtu\.be\/3on5-_oqsGs Judul uji$/m.test(md), md);
}

const btnGambar = tombolTerdaftar.find((t) => t[0] === 'kdgambar');
kotakIsi.innerHTML = '';
btnGambar[1].onAction();
const dlgG = edAktif._dialog;
ok('dialog gambar terbuka', !!dlgG && /gambar/i.test(dlgG.title));
if (dlgG) {
  dlgG.onSubmit({
    getData: () => ({ src: 'gambar/langkah-1.png', alt: 'Langkah pertama' }),
    close: () => {}
  });
  const md = KDMD.htmlKeMd(kotakIsi.innerHTML);
  ok('jadi ![alt](url) saat disimpan',
    /^!\[Langkah pertama\]\(gambar\/langkah-1\.png\)$/m.test(md), md);
}

/* ---------- 9. tombol checklist ---------- */

console.log('\n=== 9. tombol checklist ===');
const btnCek = tombolTerdaftar.find((t) => t[0] === 'kdceklis');
kotakIsi.innerHTML = '<ul><li>satu</li><li>dua</li></ul>';
// selection.getNode() menunjuk ke li supaya tombol menemukan daftarnya.
edAktif.selection.getNode = () => kotakIsi.querySelector('li');
btnCek[1].onAction();
ok('daftar biasa jadi checklist', /class="kd-ceklis"/.test(kotakIsi.innerHTML));
ok('setiap item dapat data-cek', kotakIsi.querySelectorAll('li[data-cek]').length === 2);
const mdCek = KDMD.htmlKeMd(kotakIsi.innerHTML);
ok('tersimpan sebagai - [ ]', /^- \[ \] satu$/m.test(mdCek), mdCek);
btnCek[1].onAction();
ok('ditekan lagi jadi daftar biasa', !/kd-ceklis/.test(kotakIsi.innerHTML));

console.log('\n-----');
console.log('LULUS=' + lulus + ' GAGAL=' + gagal);
process.exit(gagal ? 1 : 0);
