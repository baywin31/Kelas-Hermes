/* dokter-kontras.js — cari SEBAB kontras rendah, bukan cuma gejalanya.
   Memuat index.php persis seperti audit-tata-letak.js, lalu mencetak warna
   nyata tiap elemen yang dilaporkan, termasuk latar yang diwarisi.

   Kenapa perlu: "kontras 1.21" tidak memberi tahu warna mana yang salah.
   Yang dibutuhkan: nilai color dan background-color sesungguhnya, plus
   variabel mana yang belum ditimpa. */
const fs = require('fs');
const http = require('http');
const { chromium } = require('playwright-core');

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
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.setContent(rangkai(await ambil('/index.php')), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);

  const info = await page.evaluate(() => {
    const G = (el) => {
      const s = getComputedStyle(el);
      return { warna: s.color, latarSendiri: s.backgroundColor, gambar: s.backgroundImage.slice(0, 70) };
    };
    // Latar efektif: telusuri ke atas sampai ada yang tidak transparan.
    const latarEfektif = (el) => {
      let n = el;
      while (n && n !== document.documentElement.parentNode) {
        const b = getComputedStyle(n).backgroundColor;
        const m = b.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
        if (m && (m[4] === undefined || parseFloat(m[4]) > 0.95)) return { dari: n.tagName + '.' + (n.className || '').toString().split(' ')[0], nilai: b };
        n = n.parentElement;
      }
      return { dari: 'tidak ketemu', nilai: 'transparan' };
    };
    const out = [];
    for (const sel of ['body', '.hero h1', '.hero .sub', '.eyebrow', '.card.penting h2', '.bagian h3', '.fitur-item p', 'h2', 'h3']) {
      const el = document.querySelector(sel);
      if (!el) continue;
      out.push({ sel, ...G(el), latarEfektif: latarEfektif(el) });
    }
    // Nilai variabel yang sedang aktif
    const rs = getComputedStyle(document.documentElement);
    const tok = {};
    for (const t of ['--bg', '--fg', '--fg2', '--muted', '--muted2', '--panel', '--panel2', '--accent', '--accent3', '--line']) {
      tok[t] = rs.getPropertyValue(t).trim();
    }
    return { out, tok, mode: matchMedia('(prefers-color-scheme: dark)').matches ? 'gelap' : 'terang' };
  });

  console.log('mode prefers-color-scheme : ' + info.mode);
  console.log('\nNILAI VARIABEL AKTIF:');
  for (const [k, v] of Object.entries(info.tok)) console.log('  ' + k.padEnd(10) + ' ' + (v || '(kosong)'));
  console.log('\nWARNA NYATA TIAP ELEMEN:');
  for (const r of info.out) {
    console.log('  ' + r.sel);
    console.log('      color       : ' + r.warna);
    console.log('      latar sendiri: ' + r.latarSendiri + (r.gambar ? '  gambar=' + r.gambar : ''));
    console.log('      latar efektif: ' + r.latarEfektif.nilai + '   (dari ' + r.latarEfektif.dari + ')');
  }
  await browser.close();
})();
