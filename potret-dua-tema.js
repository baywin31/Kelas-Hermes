/* potret-dua-tema.js — potret halaman percobaan dashboard dalam DUA tema
   (terang & gelap) pada dua ukuran layar.

   Kenapa perlu: referensi dari file Figma bertema TERANG, sedangkan aplikasi
   sekarang bertema GELAP. Supaya bisa dinilai dengan mata, keduanya harus
   terlihat berdampingan — bukan hanya salah satu.
*/
'use strict';

const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

function cariChrome() {
  const akar = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  if (!fs.existsSync(akar)) return null;
  const calon = fs.readdirSync(akar)
    .filter(n => /^chromium-\d+$/.test(n))
    .sort((a, b) => parseInt(b.split('-')[1]) - parseInt(a.split('-')[1]));
  for (const c of calon) {
    const p = path.join(akar, c, 'chrome-win64', 'chrome.exe');
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const HALAMAN = 'file:///' + path.resolve('pratinjau/dashboard-baru.html').replace(/\\/g, '/');

(async () => {
  const browser = await chromium.launch({ executablePath: cariChrome() });
  fs.mkdirSync('potret', { recursive: true });

  const dibuat = [];
  for (const [nama, lebar, tinggi] of [['laptop', 1440, 900], ['HP', 390, 844]]) {
    for (const tema of ['terang', 'gelap']) {
      const page = await browser.newPage({ viewport: { width: lebar, height: tinggi } });
      await page.goto(HALAMAN, { waitUntil: 'load', timeout: 30000 });

      // Tukar ke tema yang diminta (halaman mulai dari tema terang).
      if (tema === 'gelap') {
        await page.click('#tombol-tema');
        await page.waitForTimeout(200);
      }
      const label = await page.textContent('#nama-tema');

      const berkas = `potret/dashboard-${nama}-${tema}.png`;
      await page.screenshot({ path: berkas, fullPage: true });
      const ukuran = (fs.statSync(berkas).size / 1024).toFixed(0);
      console.log(`${berkas}  ${ukuran} KB  (label halaman: "${label}")`);
      dibuat.push(berkas);
      await page.close();
    }
  }

  await browser.close();
  console.log('\nselesai: ' + dibuat.length + ' potret');
})().catch(e => { console.error('gagal: ' + e.message); process.exit(1); });
