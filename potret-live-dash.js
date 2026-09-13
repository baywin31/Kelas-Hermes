/* potret-live-dash.js — potret halaman yang BENAR-BENAR dari hosting
   (juraganprompt.biz.id), bukan dari server lokal.

   Kenapa: server lokal bisa berbeda dari hosting (urutan berkas, cache,
   aturan LiteSpeed). Hanya potret dari hosting yang membuktikan apa yang
   dilihat pembeli.
*/
const fs = require('fs');
const { chromium } = require('playwright-core');
const OUT = 'potret';
fs.mkdirSync(OUT, { recursive: true });

const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));

const B = 'https://juraganprompt.biz.id/member';
// Halaman yang terbuka untuk umum (tanpa login). Dashboard butuh masuk, jadi
// potretnya diambil dari app lokal oleh potret-dashboard.js.
const HAL = [
  { nama: 'live-depan', jalur: '/index.php' },
  { nama: 'live-login', jalur: '/login.php' },
  { nama: 'live-redeem', jalur: '/redeem.php' },
];

(async () => {
  const browser = await chromium.launch({ executablePath: exe });
  for (const h of HAL) {
    for (const t of [['light', 'light'], ['dark', 'dark']]) {
      for (const v of [['laptop', 1280, 900], ['HP', 390, 844]]) {
        const page = await browser.newPage({ viewport: { width: v[1], height: v[2] }, colorScheme: t[1] });
        try {
          await page.goto(B + h.jalur, { waitUntil: 'networkidle', timeout: 45000 });
          await page.waitForTimeout(500);
          const f = `${OUT}/${h.nama}-${v[0]}-${t[0]}.png`;
          await page.screenshot({ path: f, fullPage: v[0] === 'laptop' });
          const info = await page.evaluate(() => ({
            latar: getComputedStyle(document.body).backgroundColor,
            hero: (() => { const e = document.querySelector('.hero h1') || document.querySelector('h1');
              return e ? getComputedStyle(e).color : '-'; })(),
            judul: (document.querySelector('h1') || {}).textContent?.trim().slice(0, 24) || '-',
          }));
          console.log(`${h.nama.padEnd(14)} ${v[0].padEnd(7)} ${t[0].padEnd(5)} latar=${info.latar}  judul="${info.judul}" warna=${info.hero}`);
        } catch (e) {
          console.log(`${h.nama} ${v[0]} ${t[0]} GAGAL: ${String(e).slice(0, 70)}`);
        }
        await page.close();
      }
    }
  }
  await browser.close();
  console.log('\npotret tersimpan di ' + OUT + '/');
})();
