/* potret-member.js — potret halaman MEMBER (di balik login) sebelum vs sesudah.

   Kenapa halaman ini yang paling penting: inilah yang dilihat pembeli setiap
   hari setelah membayar. Halaman depan hanya dilewati sekali; dashboard dan
   halaman materi dibuka berulang kali. Kalau ada satu tempat yang harus rapi,
   itu di sini.

   Alurnya: login ke server lokal (akun uji), ambil HTML dashboard & materi
   memakai cookie sesi, lalu potret dua versi — dengan dan tanpa lapisan v2. */
const fs = require('fs');
const http = require('http');
const { chromium } = require('playwright-core');

const APP = 'C:/Users/user/apps/karyawan-digital-php';
const OUT = APP + '/potret';
const AKUN = { email: 'budi@demo.id', password: 'demo12345' };

const exe = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe',
].find((p) => fs.existsSync(p));

function minta(jalur, metode, isi, cookie) {
  return new Promise((r) => {
    const h = { Host: '127.0.0.1:8813', 'User-Agent': 'potret/1' };
    if (cookie) h.Cookie = cookie;
    if (isi) { h['Content-Type'] = 'application/x-www-form-urlencoded'; h['Content-Length'] = Buffer.byteLength(isi); }
    const req = http.request({ host: '127.0.0.1', port: 8813, path: jalur, method: metode, headers: h }, (res) => {
      let d = ''; res.on('data', (c) => (d += c));
      res.on('end', () => r({ kode: res.statusCode, html: d, set: res.headers['set-cookie'] || [] }));
    });
    req.on('error', () => r({ kode: 0, html: '', set: [] }));
    req.setTimeout(10000, () => { req.destroy(); r({ kode: 0, html: '', set: [] }); });
    if (isi) req.write(isi);
    req.end();
  });
}

function rangkai(html, pakaiV2) {
  return html.replace(/<link[^>]+href=["']([^"']+\.css)(?:\?v=\d+)?["'][^>]*>/gi, (m, href) => {
    const b = href.split('/').pop();
    if (b === 'tampilan-v2.css' && !pakaiV2) return '';
    const j = APP + '/' + b;
    return fs.existsSync(j) ? '<style>\n' + fs.readFileSync(j, 'utf8') + '\n</style>' : '';
  });
}

(async () => {
  if (!exe) { console.log('DILEWATI (Chrome tidak ada)'); process.exit(0); }

  // --- 1. Ambil kunci CSRF dari halaman masuk ---
  // WAJIB sekaligus simpan cookie sesi dari GET ini: kunci CSRF terikat pada
  // sesi, jadi mengirim token tanpa cookie sesinya dijawab 403 — bukan 419 —
  // dan tampak seperti "sandi salah" padahal bukan.
  const masuk = await minta('/login.php', 'GET');
  const cocok = masuk.html.match(/name="csrf" value="([^"]+)"/) || masuk.html.match(/value="([^"]+)"[^>]*name="csrf"/);
  if (!cocok) { console.log('tidak bisa membaca kunci CSRF dari login.php'); process.exit(0); }
  const csrf = cocok[1];
  const kueAwal = masuk.set.map((s) => s.split(';')[0]).join('; ');

  // --- 2. Masuk ---
  const isi = 'csrf=' + encodeURIComponent(csrf) +
              '&email=' + encodeURIComponent(AKUN.email) +
              '&password=' + encodeURIComponent(AKUN.password);
  const jawab = await minta('/login.php', 'POST', isi, kueAwal);
  // Sesi DIPERBARUI saat masuk (kdsess diganti ID baru demi keamanan), jadi
  // cookie lama harus DIBUANG. Menggabung keduanya membuat dua kdsess terkirim
  // sekaligus — server memakai yang pertama (yang lama) dan menolak sesinya.
  const kue = jawab.set.map((s) => s.split(';')[0]).join('; ') || kueAwal;
  if (jawab.kode !== 302) {
    console.log('masuk gagal (kode ' + jawab.kode + ') — coba reset akun uji: curl http://127.0.0.1:8813/_uji_akun.php');
    process.exit(0);
  }
  console.log('masuk sebagai ' + AKUN.email + ' (kode ' + jawab.kode + ')');

  const browser = await chromium.launch({ executablePath: exe });
  fs.mkdirSync(OUT, { recursive: true });
  let jml = 0;

  const HAL = [
    { nama: 'member-dashboard', jalur: '/dashboard.php', judul: 'Dashboard member' },
    { nama: 'member-materi', jalur: '/materi.php?b=1', judul: 'Halaman materi' },
    { nama: 'member-skill', jalur: '/skill.php', judul: 'Modul Skill' },
  ];

  for (const h of HAL) {
    const g = await minta(h.jalur, 'GET', null, kue);
    if (!g.html || g.html.length < 500) { console.log('luput: ' + h.judul + ' (kode ' + g.kode + ')'); continue; }

    for (const pakaiV2 of [false, true]) {
      const page = await browser.newPage({ viewport: { width: 1240, height: 1500 } });
      await page.setContent(rangkai(g.html, pakaiV2), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.addStyleTag({ content: '*{animation:none !important; transition:none !important}' });
      await page.waitForTimeout(150);
      const tag = pakaiV2 ? 'sesudah' : 'sebelum';
      await page.screenshot({ path: `${OUT}/${h.nama}-${tag}.png`, fullPage: true });
      console.log('  ' + h.judul + ' (' + tag + ')');
      jml++;
      await page.close();
    }
  }

  await browser.close();
  console.log('\n' + jml + ' potret member siap di ' + OUT);
})();
