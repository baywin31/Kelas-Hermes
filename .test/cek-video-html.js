// cek-video-html.js — uji embed video di mode HTML lewat jsdom sungguhan.
// Yang dipastikan: ID diambil benar dari semua bentuk tautan, tautan
// jahat ditolak, iframe benar-benar ada di DOM saat halaman materi dibuka,
// shorts jadi tegak, penanda @video tidak bocor sebagai teks, dan
// daftar isi / pencarian tidak tercemar.
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
  const K = window.KD, S = window.KD_STORE_1, S2 = window.KD_STORE_2;

  console.log('### 1. ytId: semua bentuk tautan');
  const kasus = [
    ['shorts + query', 'https://youtube.com/shorts/3on5-_oqsGs?feature=share', '3on5-_oqsGs'],
    ['watch?v=',       'https://www.youtube.com/watch?v=3on5-_oqsGs', '3on5-_oqsGs'],
    ['youtu.be',       'https://youtu.be/3on5-_oqsGs', '3on5-_oqsGs'],
    ['embed',          'https://www.youtube.com/embed/3on5-_oqsGs', '3on5-_oqsGs'],
    ['m.youtube',      'https://m.youtube.com/watch?v=3on5-_oqsGs', '3on5-_oqsGs'],
    ['param lain dulu','https://www.youtube.com/watch?feature=x&v=3on5-_oqsGs', '3on5-_oqsGs'],
    ['ID mentah',      '3on5-_oqsGs', '3on5-_oqsGs'],
    ['vimeo ditolak',  'https://vimeo.com/12345', ''],
    ['javascript: ditolak', 'javascript:alert(1)', ''],
    ['host palsu ditolak',  'https://evil.com/youtube.com/shorts/AAAAAAAAAAA', ''],
  ];
  for (const [nama, masuk, harap] of kasus) {
    const dapat = K.ytId(masuk);
    cek(nama, dapat === harap, "dapat '" + dapat + "' harap '" + harap + "'");
  }

  console.log('\n### 2. ytEmbed aman & benar');
  const emb = K.ytEmbed('https://youtube.com/shorts/3on5-_oqsGs', 'Judul <script>');
  cek('host dipaku youtube-nocookie', emb.includes('youtube-nocookie.com/embed/3on5-_oqsGs'));
  cek('shorts dapat kelas tegak', emb.includes('video-embed tegak'));
  cek('judul di-escape (tidak ada <script>)', !emb.includes('<script>'), emb.slice(0, 120));
  cek('ada lazy-load', emb.includes('loading="lazy"'));
  cek('ada allowfullscreen', emb.includes('allowfullscreen'));
  cek('ada tautan cadangan', emb.includes('youtu.be/3on5-_oqsGs'));
  cek('tautan jahat -> string kosong', K.ytEmbed('javascript:alert(1)', 'x') === '');
  const emb169 = K.ytEmbed('https://www.youtube.com/watch?v=3on5-_oqsGs', 'x');
  cek('video biasa TIDAK dapat kelas tegak', !emb169.includes('tegak'));

  console.log('\n### 3. Buka Bagian 1 sebagai member');
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
  S.simpan();
  window.location.hash = '#/materi/1';
  await tunggu(350);
  const view = doc.getElementById('view');
  cek('halaman Bagian 1 terbuka', /Kenalan dan Setup/.test(view.innerHTML));

  console.log('\n### 4. Iframe benar-benar ada di DOM');
  const iframe = view.querySelector('iframe');
  cek('elemen iframe ada', !!iframe);
  cek('src ke youtube-nocookie + ID benar',
    iframe && iframe.src === 'https://www.youtube-nocookie.com/embed/3on5-_oqsGs?rel=0',
    iframe && iframe.src);
  cek('judul video terpasang', iframe && iframe.title === 'Tutorial Install Hermes Agent',
    iframe && iframe.title);
  const bingkai = view.querySelector('.video-embed');
  cek('bingkai .video-embed ada', !!bingkai);
  cek('bingkai dapat kelas tegak', bingkai && bingkai.classList.contains('tegak'));
  cek('tautan cadangan tampil', /Buka video ini di YouTube/.test(view.innerHTML));
  cek('hanya satu video di halaman ini', view.querySelectorAll('iframe').length === 1);

  console.log('\n### 5. Penanda @video tidak bocor');
  cek('teks "@video" tidak terlihat pengunjung', !/@video/.test(view.textContent));

  console.log('\n### 6. Daftar isi tidak tercemar');
  const toc = doc.querySelector('.toc');
  cek('daftar isi tidak memuat baris video', toc && !/@video|video tutorial/i.test(toc.textContent),
    toc && toc.textContent.slice(0, 90));

  console.log('\n### 7. Pencarian tidak menampilkan URL panjang');
  const kutipan = K.mdExcerpt('Teks awal.\n@video https://youtube.com/shorts/3on5-_oqsGs Judul\nTeks akhir.');
  cek('kutipan bersih dari URL', !kutipan.includes('youtube'), kutipan);
  cek('kutipan tetap memuat isi asli', kutipan.includes('Teks awal') && kutipan.includes('Teks akhir'), kutipan);

  console.log('\n### 8. Baris bukan-YouTube dibiarkan apa adanya');
  const h = K.md('@video https://vimeo.com/12345 Judul');
  cek('tidak memasang iframe rusak', !h.includes('<iframe'));
  cek('teksnya masih terlihat supaya admin sadar', h.includes('vimeo.com'), h.slice(0, 100));

  console.log('\n### 9. CSS cetak menyembunyikan video');
  const css = [...doc.querySelectorAll('style')].map(s => s.textContent).join('');
  const print = css.slice(css.indexOf('@media print'));
  cek('.video-embed ada di daftar display:none saat cetak', /video-embed/.test(print.slice(0, 420)));
  cek('aturan rasio tegak 9/16 ada', /aspect-ratio:9\/16/.test(css));

  console.log(`\n-----\nLULUS=${lulus} GAGAL=${gagal}`);
  process.exit(gagal === 0 ? 0 : 1);
})().catch(e => { console.error('ERROR', e); process.exit(1); });
