// cek-wa-html.js — uji tombol WhatsApp di mode HTML lewat jsdom (bukan grep):
// normalisasi nomor, tombol apung muncul/hilang, footer ikut, pesan terisi,
// setelan admin menolak nomor ngawur, dan tombol tetap ada pindah halaman.
const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('C:/Users/user/apps/karyawan-digital-html/index.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
const { window } = dom;
const tunggu = (ms) => new Promise(r => setTimeout(r, ms));

let lulus = 0, gagal = 0;
const ok  = (n) => { console.log('  ok    ' + n); lulus++; };
const bad = (n, x) => { console.log('  GAGAL ' + n + (x ? ' — ' + x : '')); gagal++; };
const cek = (n, syarat, x) => syarat ? ok(n) : bad(n, x);

(async () => {
  await tunggu(800);
  const doc = window.document;
  const K = window.KD, S = window.KD_STORE_1, S2 = window.KD_STORE_2;

  console.log('### 1. Normalisasi nomor (fungsi murni)');
  cek('0812-3456-7890 -> 6281234567890', K.waNormal('0812-3456-7890') === '6281234567890', K.waNormal('0812-3456-7890'));
  cek('spasi & +62 dirapikan',           K.waNormal('+62 812 3456 7890') === '6281234567890', K.waNormal('+62 812 3456 7890'));
  cek('62xx diterima apa adanya',        K.waNormal('6289900112233') === '6289900112233');
  cek("'abc' ditolak jadi ''",           K.waNormal('abc') === '');
  cek('terlalu pendek ditolak',          K.waNormal('0812') === '');
  cek('kosong ditolak',                  K.waNormal('') === '');
  cek('waLink kosong kalau nomor invalid', K.waLink('abc', 'hai') === '');

  console.log('\n### 2. Nomor belum diisi -> tidak ada tombol WA');
  S2.setelanSimpan({ wa_nomor: '', wa_pesan: '' });
  window.location.hash = '#/redeem';
  await tunggu(250);
  cek('tombol apung tidak ada', !doc.getElementById('wa-apung'));
  cek('footer WA tersembunyi', doc.getElementById('footer-wa').hidden);
  cek('tautan redeem tidak menyebut wa.me', !/wa\.me/.test(doc.getElementById('view').innerHTML));

  console.log('\n### 3. Nomor diisi -> tombol muncul di mana-mana');
  S2.setelanSimpan({ wa_nomor: '081234567890' });
  window.location.hash = '#/masuk';
  await tunggu(250);
  const apung = doc.getElementById('wa-apung');
  cek('tombol apung muncul', !!apung);
  cek('href pakai wa.me/62...', apung && /^https:\/\/wa\.me\/6281234567890\?text=/.test(apung.href), apung && apung.href);
  cek('punya label aksesibilitas', apung && apung.getAttribute('aria-label') === 'Chat WhatsApp dengan admin');
  cek('buka tab baru dgn rel noopener', apung && apung.target === '_blank' && apung.rel === 'noopener');
  cek('footer WA terlihat', !doc.getElementById('footer-wa').hidden);

  console.log('\n### 4. Tombol selamat pindah halaman');
  const idAwal = apung;
  for (const h of ['#/redeem', '#/faq', '#/masuk']) {
    window.location.hash = h;
    await tunggu(180);
  }
  cek('elemen yang sama dipakai ulang (tidak dobel)', doc.getElementById('wa-apung') === idAwal);
  cek('hanya ada satu tombol apung', doc.querySelectorAll('.wa-apung').length === 1);

  console.log('\n### 5. Halaman redeem punya jalan keluar WA');
  window.location.hash = '#/redeem';
  await tunggu(250);
  cek('tautan WA di halaman redeem', /wa\.me\/6281234567890/.test(doc.getElementById('view').innerHTML));

  console.log('\n### 6. Pesan pembuka bisa diatur');
  S2.setelanSimpan({ wa_pesan: 'Halo bro, saya mau tanya kelas' });
  window.location.hash = '#/faq';
  await tunggu(220);
  cek('pesan khusus terpakai di tombol apung',
    decodeURIComponent(doc.getElementById('wa-apung').href).includes('Halo bro, saya mau tanya kelas'));

  console.log('\n### 7. Tanya Admin menyertakan identitas member');
  S2.setelanSimpan({ wa_pesan: '' });
  // Tanpa admin, app selalu mengalihkan ke #/setup — jadi buat admin + member
  // langsung di store, sama seperti yang dilakukan alur setup sungguhan.
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
  window.location.hash = '#/tanya';
  await tunggu(320);
  const isiTanya = doc.getElementById('view').innerHTML;
  cek('ada tombol Chat admin di WhatsApp', /Chat admin di WhatsApp/.test(isiTanya));
  cek('email member ikut di pesan', isiTanya.includes(encodeURIComponent(member.email)),
      'email=' + member.email);
  cek('nama member ikut di pesan', isiTanya.includes(encodeURIComponent(member.nama).replace(/%20/g, '%20')),
      'nama=' + member.nama);

  console.log('\n### 8. Nomor dihapus -> tombol ikut hilang');
  S2.setelanSimpan({ wa_nomor: '' });
  window.location.hash = '#/faq';
  await tunggu(250);
  cek('tombol apung dicabut', !doc.getElementById('wa-apung'));
  cek('footer WA tersembunyi lagi', doc.getElementById('footer-wa').hidden);

  console.log('\n### 9. CSS cetak menyembunyikan tombol');
  const css = [...doc.querySelectorAll('style')].map(s => s.textContent).join('');
  const blokPrint = css.slice(css.indexOf('@media print'));
  cek('wa-apung ada di daftar display:none saat cetak', /wa-apung/.test(blokPrint.slice(0, 400)));

  console.log(`\n-----\nLULUS=${lulus} GAGAL=${gagal}`);
  process.exit(gagal === 0 ? 0 : 1);
})().catch(e => { console.error('ERROR', e); process.exit(1); });
