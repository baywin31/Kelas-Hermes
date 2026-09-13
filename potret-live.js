/* potret-live.js — potret halaman LIVE (hosting) dalam dua versi:
   "sebelum" = lapisan tampilan-v2 dilepas dari HTML,
   "sesudah" = apa adanya seperti yang dilihat pengunjung.

   Kenapa dari halaman live, bukan berkas lokal: yang mau dibuktikan adalah
   APA YANG DILIHAT PEMBELI. Halaman live juga memuat komponen yang tidak ada
   di berkas statis (sidebar, badge tier, bilah kemajuan), jadi ini potret
   yang paling dekat dengan kenyataan.

   Kenapa "sebelum" dibuat dengan cara melepas <link>: berkas lama tidak
   disimpan, dan menebak-nebak gaya lama hanya akan menghasilkan gambaran
   palsu. Melepas satu baris itu persis keadaan sebelum perubahan. */
const fs = require('fs');
const http = require('http');
const https = require('https');
const { chromium } = require('playwright-core');

const APP = 'C:/Users/user/apps/karyawan-digital-php';
const OUT = APP + '/potret';
const LOKAL = 'http://127.0.0.1:8813';
const LIVE = 'https://juraganprompt.biz.id/member';

const exe = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe',
].find((p) => fs.existsSync(p));

const HALAMAN = [
  { nama: 'depan', judul: 'Halaman Depan', jalur: '/index.php' },
  { nama: 'login', judul: 'Halaman Masuk', jalur: '/login.php' },
  { nama: 'redeem', judul: 'Redeem Kode', jalur: '/redeem.php' },
];

/* Ambil HTML dari server lokal (boleh lintas host, tidak perlu TLS). */
function ambil(jalur) {
  return new Promise((r) => {
    const req = http.get({ host: '127.0.0.1', port: 8813, path: jalur }, (res) => {
      let d = ''; res.on('data', (c) => (d += c)); res.on('end', () => r(d));
    });
    req.on('error', () => r(''));
    req.setTimeout(7000, () => { req.destroy(); r(''); });
    req.end();
  });
}

/* Ganti <link> CSS dengan isi berkas lokal; kalau `pakaiV2` salah, lapisan
   tampilan-v2 dibuang (itulah versi "sebelum"). */
function rangkai(html, pakaiV2) {
  return html
    .replace(/<link[^>]+href=["']([^"']+\.css)(?:\?v=\d+)?["'][^>]*>/gi, (m, href) => {
      const b = href.split('/').pop();
      if (b === 'tampilan-v2.css' && !pakaiV2) return '';
      const j = APP + '/' + b;
      return fs.existsSync(j) ? '<style>\n' + fs.readFileSync(j, 'utf8') + '\n</style>' : '';
    })
    /* Gambar & video diarahkan ke alamat lengkap hosting supaya potret tidak
       kosong melompong hanya karena asetnya relatif. */
    .replace(/(src|href)=["'](?!https?:|\/\/|data:|#)([^"']+)["']/gi,
      (m, a, u) => a + '="' + LIVE + '/' + u.replace(/^\.?\//, '') + '"');
}

(async () => {
  if (!exe) { console.log('Chrome tidak ditemukan.'); process.exit(1); }
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: exe });
  let jml = 0;

  for (const h of HALAMAN) {
    const html = await ambil(h.jalur);
    if (!html || html.length < 400) { console.log('luput (tidak terambil): ' + h.judul); continue; }

    for (const pakaiV2 of [false, true]) {
      const page = await browser.newPage({
        viewport: { width: 1240, height: 1400 },
        deviceScaleFactor: 1,
      });
      await page.setContent(rangkai(html, pakaiV2), { waitUntil: 'domcontentloaded', timeout: 40000 });
      // Tidak menunggu gambar: yang dinilai di sini tata letak & warna, dan
      // gambar dari hosting bisa lambat sampai potretnya gagal total.
      await page.addStyleTag({ content: '*{animation:none !important; transition:none !important}' });
      await page.waitForTimeout(150);

      const tag = pakaiV2 ? 'sesudah' : 'sebelum';
      const keluar = `${OUT}/${h.nama}-${tag}.png`;
      await page.screenshot({ path: keluar, fullPage: true });
      console.log('  ' + h.judul + ' (' + tag + ')');
      jml++;
      await page.close();
    }
  }

  await browser.close();
  console.log('\n' + jml + ' potret siap di ' + OUT);
})();
