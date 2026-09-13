/* potret-dashboard.js — potret dashboard ASLI (bukan contoh) langsung dari
   server lokal, masuk sebagai member sungguhan.

   Kenapa perlu: halaman contoh hanya membuktikan gayanya. Yang menentukan
   berhasil atau tidak adalah dashboard sungguhan dengan data sungguhan,
   lengkap dengan semua tombolnya.

   Cara pakai:
     1. C:/Users/user/tools/php83/php.exe -S 127.0.0.1:8813 -t .   (latar)
     2. node potret-dashboard.js
*/
'use strict';
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const http = require('http');

function cariChrome() {
  const akar = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  if (!fs.existsSync(akar)) return null;
  const calon = fs.readdirSync(akar).filter(n => /^chromium-\d+$/.test(n))
    .sort((a, b) => parseInt(b.split('-')[1]) - parseInt(a.split('-')[1]));
  for (const c of calon) {
    const p = path.join(akar, c, 'chrome-win64', 'chrome.exe');
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const HOST = '127.0.0.1', PORT = 8813;
const EMAIL = 'budi@demo.id', SANDI = 'demo12345';

/* Permintaan HTTP mentah: cookie dipegang sendiri supaya bisa dikendalikan. */
function minta(jalur, opsi = {}) {
  const { metode = 'GET', cookie = '', body = null, ikutiRedirect = false } = opsi;
  return new Promise((selesai, gagal) => {
    const h = { 'User-Agent': 'ukur-dashboard', ...(cookie ? { Cookie: cookie } : {}) };
    if (body) { h['Content-Type'] = 'application/x-www-form-urlencoded'; h['Content-Length'] = Buffer.byteLength(body); }
    const req = http.request({ host: HOST, port: PORT, path: jalur, method: metode, headers: h }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => selesai({ status: res.statusCode, isi: d, setCookie: res.headers['set-cookie'] || [] }));
    });
    req.on('error', gagal);
    req.end(body || undefined);
  });
}

async function masuk() {
  const awal = await minta('/login.php');
  const cookieAwal = awal.setCookie.map(c => c.split(';')[0]).join('; ');
  const csrf = (awal.isi.match(/name="csrf"[^>]*value="([^"]+)"/) || [])[1];
  if (!csrf) throw new Error('token csrf tidak ditemukan di login.php');
  const body = 'email=' + encodeURIComponent(EMAIL) +
               '&password=' + encodeURIComponent(SANDI) +
               '&csrf=' + encodeURIComponent(csrf);
  const masukRes = await minta('/login.php', { metode: 'POST', cookie: cookieAwal, body });
  /* Sesi DIPERBARUI saat login (id sesi baru), jadi cookie lama dibuang. */
  const cookieBaru = masukRes.setCookie.map(c => c.split(';')[0]).join('; ');
  if (!cookieBaru.includes('kdsess')) throw new Error('login gagal: ' + masukRes.status);
  return cookieBaru;
}

(async () => {
  const cookie = await masuk();
  console.log('login ok, cookie diperoleh');

  const browser = await chromium.launch({ executablePath: cariChrome() });
  fs.mkdirSync('potret', { recursive: true });
  const hasil = [];

  for (const tema of ['light', 'dark']) {
    for (const [nama, lebar, tinggi] of [['laptop', 1440, 900], ['HP', 390, 844]]) {
      const ctx = await browser.newContext({
        viewport: { width: lebar, height: tinggi },
        colorScheme: tema
      });
      // Pindahkan cookie sesi ke browser.
      await ctx.addCookies(cookie.split('; ').map(c => {
        const [n, v] = c.split('=');
        return { name: n, value: v, domain: HOST, path: '/' };
      }));
      const page = await ctx.newPage();
      await page.goto(`http://${HOST}:${PORT}/dashboard.php`, { waitUntil: 'networkidle', timeout: 30000 });

      const info = await page.evaluate(() => ({
        judul: document.title,
        sapa: document.querySelector('h1') ? document.querySelector('h1').textContent.trim() : '',
        bagian: document.querySelectorAll('.bagian').length,
        tombol: document.querySelectorAll('.btn').length,
        form: document.querySelectorAll('form').length,
        cincin: document.querySelectorAll('.lz-cincin').length,
        batang: document.querySelectorAll('.lz-batang i').length,
        luber: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        latar: getComputedStyle(document.body).backgroundColor,
        bilahLatar: getComputedStyle(document.querySelector('.topbar')).backgroundColor
      }));
      console.log(`  ${tema}/${nama}: bagian=${info.bagian} tombol=${info.tombol} form=${info.form} ` +
                  `cincin=${info.cincin} batang=${info.batang} luber=${info.luber}px latar=${info.latar} bilah=${info.bilahLatar}`);

      await page.screenshot({ path: `potret/asli-${nama}-${tema}.png`, fullPage: true });
      hasil.push({ tema, nama, ...info });
      await ctx.close();
    }
  }

  await browser.close();
  const gagalCek = hasil.filter(h => h.bagian === 0 || h.tombol === 0 || h.luber > 1 || h.cincin === 0);
  console.log('\nyang perlu diperhatikan: ' + (gagalCek.length ? JSON.stringify(gagalCek) : 'tidak ada'));
  process.exit(gagalCek.length ? 1 : 0);
})().catch(e => { console.error('berhenti: ' + e.message); process.exit(2); });
