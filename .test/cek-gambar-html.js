// cek-gambar-html.js — uji sintaks gambar ![...](...) di mode HTML lewat jsdom.
// Yang dipastikan: URL berbahaya ditolak, elemen <img> benar-benar ada di DOM
// dengan src/alt yang tepat, gambar di baris sendiri jadi <figure>, gambar di
// tengah kalimat tetap inline, sintaks gambar tidak berubah jadi tautan biasa.
const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('C:/Users/user/apps/karyawan-digital-html/index.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
const { window } = dom;
const tunggu = (ms) => new Promise(r => setTimeout(r, ms));

let lulus = 0, gagal = 0;
const ok = (n) => { console.log('  ok    ' + n); lulus++; };
const bad = (n, x) => { console.log('  GAGAL ' + n + (x ? ' — ' + x : '')); gagal++; };
const cek = (n, s, x) => s ? ok(n) : bad(n, x);

(async () => {
  await tunggu(800);
  const doc = window.document;
  const K = window.KD, S = window.KD_STORE_1;

  console.log('### 1. Saringan URL gambar');
  const kasus = [
    ['https biasa',      'https://i.imgur.com/abc.png', 'https://i.imgur.com/abc.png'],
    ['http biasa',       'http://situs.com/a.jpg',      'http://situs.com/a.jpg'],
    ['jalur relatif',    'gambar/langkah-1.png',        'gambar/langkah-1.png'],
    ['jalur absolut',    '/member/gambar/x.webp',       '/member/gambar/x.webp'],
    ['javascript:',      'javascript:alert(1)',         ''],
    ['JavaScript: besar','JavaScript:alert(1)',         ''],
    ['data: ditolak',    'data:image/svg+xml;base64,x', ''],
    ['vbscript:',        'vbscript:msgbox',             ''],
    ['//host',           '//jahat.com/a.png',           ''],
    ['ada kutip',        'a.png" onerror="alert(1)',    ''],
    ['ada kurung sudut', 'a.png><script>',              ''],
    ['kosong',           '',                            ''],
  ];
  for (const [nama, masuk, harap] of kasus) {
    const dapat = K.imgUrlOk(masuk);
    cek(nama, dapat === harap, "dapat '" + dapat + "'");
  }

  console.log('\n### 2. imgHtml membangun tag yang benar');
  const blok = K.imgHtml('https://i.imgur.com/abc.png', 'Tangkapan layar setup', true);
  cek('baris sendiri jadi figure', blok.includes('<figure class="gambar">'));
  cek('figcaption terisi', blok.includes('<figcaption class="small muted">Tangkapan layar setup</figcaption>'));
  cek('alt terisi', blok.includes('alt="Tangkapan layar setup"'));
  cek('lazy-load aktif', blok.includes('loading="lazy"'));
  const tanpaKet = K.imgHtml('gambar/x.png', '', true);
  cek('tanpa keterangan: alt tetap ditulis', tanpaKet.includes('alt=""'));
  cek('tanpa keterangan: tanpa figcaption', !tanpaKet.includes('<figcaption'));
  const inline = K.imgHtml('gambar/gir.png', 'ikon gir', false);
  cek('inline tanpa figure', inline.startsWith('<img') && !inline.includes('<figure'));
  cek('URL jahat -> string kosong', K.imgHtml('javascript:alert(1)', 'x', true) === '');
  const altJahat = K.imgHtml('gambar/a.png', '<script>alert(1)</script>', true);
  cek('alt berisi HTML di-escape', !altJahat.includes('<script>'), altJahat.slice(0, 90));

  console.log('\n### 3. md() memasang gambar, bukan tautan');
  const h = K.md('Teks.\n\n![Tangkapan layar](https://i.imgur.com/abc.png)\n\nLanjut.');
  cek('figure terbentuk', h.includes('<figure class="gambar">'));
  cek('TIDAK jadi tautan biasa', !h.includes('<a href="https://i.imgur.com/abc.png"'));
  const hIn = K.md('Klik ikon ![ikon gir](gambar/gir.png) lalu simpan.');
  cek('gambar inline tetap di dalam paragraf', /<p>Klik ikon <img/.test(hIn), hIn.slice(0, 90));
  const hBad = K.md('![x](javascript:alert(1))');
  cek('URL jahat tidak jadi img', !hBad.includes('<img'));
  cek('barisnya tetap terlihat', hBad.includes('javascript:alert'), hBad.slice(0, 80));
  cek('tautan biasa masih jalan', K.md('[situs](https://contoh.com)').includes('<a href="https://contoh.com"'));

  console.log('\n### 4. Elemen <img> nyata di DOM halaman materi');
  const st = S._get();
  if (!st.users.length) {
    st.users.push({ id: K.uid(), nama: 'Darwin', email: 'admin@uji.id',
      pass: K.pwBuat('rahasia12345'), role: 'admin', kode: null, dibuat: K.now() });
  }
  let member = st.users.find(u => u.role !== 'admin');
  if (!member) {
    member = { id: K.uid(), nama: 'Budi Uji', email: 'budi@uji.id',
      pass: K.pwBuat('rahasia12345'), role: 'member', kode: null, dibuat: K.now() };
    st.users.push(member);
  }
  st.sesi = member.id;
  const b3 = st.bagian.find(b => b.urutan === 3) || st.bagian[2];
  b3.isi_md = b3.isi_md + '\n\n![Tangkapan layar dashboard](https://i.imgur.com/abc.png)\n';
  S.simpan();
  window.location.hash = '#/materi/3';
  await tunggu(350);
  const view = doc.getElementById('view');
  const img = view.querySelector('figure.gambar img');
  cek('elemen img ada di DOM', !!img);
  cek('src tepat', img && img.src === 'https://i.imgur.com/abc.png', img && img.src);
  cek('alt tepat', img && img.alt === 'Tangkapan layar dashboard', img && img.alt);
  cek('loading=lazy di DOM', img && img.getAttribute('loading') === 'lazy');
  const cap = view.querySelector('figure.gambar figcaption');
  cek('figcaption tampil', cap && /Tangkapan layar dashboard/.test(cap.textContent));
  cek('sintaks ![ tidak terlihat pengunjung', !view.textContent.includes('!['));

  console.log('\n### 5. Pencarian tidak menampilkan URL gambar');
  const kut = K.mdExcerpt('Awal. ![Tangkapan layar setup](https://i.imgur.com/panjang-sekali.png) Akhir.');
  cek('kutipan bersih dari URL', !kut.includes('imgur'), kut);
  cek('kutipan memuat keterangan', kut.includes('Tangkapan layar setup'), kut);

  console.log('\n### 6. CSS gambar');
  const css = [...doc.querySelectorAll('style')].map(s => s.textContent).join('');
  cek('aturan figure.gambar ada', /figure\.gambar/.test(css));
  cek('height:auto (tidak gepeng)', /height:auto/.test(css));
  const print = css.slice(css.indexOf('@media print'));
  cek('gambar diatur saat cetak', /figure\.gambar/.test(print));
  cek('gambar TIDAK disembunyikan saat cetak',
    !/figure\.gambar\{display:none/.test(print.replace(/\s/g, '')));

  console.log(`\n-----\nLULUS=${lulus} GAGAL=${gagal}`);
  process.exit(gagal === 0 ? 0 : 1);
})().catch(e => { console.error('ERROR', e); process.exit(1); });
