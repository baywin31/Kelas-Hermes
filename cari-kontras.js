/* cari-kontras.js — tunjuk elemen yang kontrasnya gagal, lengkap dengan
   warna nyata dan latar yang terdeteksi.

   Kenapa perlu: audit-tata-letak.js melaporkan angkanya saja ("1.21 (h2: ...)").
   Untuk memperbaiki, yang dibutuhkan: elemen MANA, warna HURUF apa, warna
   LATAR apa, dan aturan CSS mana yang menang. */
const fs = require('fs');
const http = require('http');
const { chromium } = require('playwright-core');
const { SUMBER } = require('./alat-kontras.js');

const APP = 'C:/Users/user/apps/karyawan-digital-php';
const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));

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
function rangkai(html) {
  return html.replace(/<link[^>]+href=["']([^"']+\.css)(?:\?v=\d+)?["'][^>]*>/gi, (m, href) => {
    const j = APP + '/' + href.split('/').pop();
    return fs.existsSync(j) ? '<style>\n' + fs.readFileSync(j, 'utf8') + '\n</style>' : '';
  });
}

(async () => {
  const browser = await chromium.launch({ executablePath: exe });
  for (const jalur of ['/index.php', '/login.php']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.setContent(rangkai(await ambil(jalur)), { waitUntil: 'domcontentloaded' });
    await page.addScriptTag({ content: SUMBER });
    await page.waitForTimeout(300);
    const gagal = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('p,li,h1,h2,h3,td,a.btn,button,label,span').forEach((el) => {
        if (!el.textContent.trim() || el.getBoundingClientRect().height === 0) return;
        const s = getComputedStyle(el);
        if (parseFloat(s.opacity) < 0.5) return;
        const fg = rgbTeks(s.color);
        if (!fg || fg.a < 0.5) return;
        const bg = latarEfektif(el);
        const rasio = rasioKontras(fg, bg);
        const px = parseFloat(s.fontSize), tebal = parseInt(s.fontWeight) >= 700;
        if (rasio < ambangKontras(px, tebal)) {
          out.push({ jalur: jalurElemen(el), teks: el.textContent.trim().slice(0, 26),
                     color: s.color, latar: 'rgb(' + Math.round(bg.r) + ', ' + Math.round(bg.g) + ', ' + Math.round(bg.b) + ')',
                     rasio: Math.round(rasio * 100) / 100, px });
        }
      });
      // buang duplikat
      const lihat = new Set();
      return out.filter((o) => { const k = o.jalur + o.rasio; if (lihat.has(k)) return false; lihat.add(k); return true; });
    });
    console.log('\n=== ' + jalur + ' === (' + gagal.length + ' gagal)');
    gagal.slice(0, 8).forEach((g) => {
      console.log('  ' + g.rasio + '  ' + g.px + 'px  ' + g.jalur);
      console.log('        teks  : "' + g.teks + '"');
      console.log('        huruf : ' + g.color + '   latar: ' + g.latar + '  (dari ' + g.dari + ')');
    });
    await page.close();
  }
  await browser.close();
})();
