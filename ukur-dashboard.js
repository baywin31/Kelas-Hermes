/* ukur-dashboard.js — ukur halaman percobaan dashboard di browser sungguhan.

   Kenapa perlu: alat kontras hanya memeriksa angka di berkas CSS. Yang
   menentukan halaman benar-benar bagus atau tidak adalah hasil hitungan
   browser: apakah tokennya benar-benar terpakai, apakah ada yang meluber,
   apakah ada tulisan yang tertimpa, apakah ukuran hurufnya masuk akal.

   Halaman diambil dari server statis lokal (sajikan.py) supaya CSS-nya
   benar-benar dimuat seperti di hosting.

   Cara pakai:  python sajikan.py 8818 .   lalu   node ukur-dashboard.js
*/
'use strict';

const { chromium } = require('playwright-core');

const BASE = 'http://127.0.0.1:8818/percobaan-dashboard.html';

/* Chromium dicari, bukan ditulis mati: nomor versinya berubah setiap kali
   playwright diperbarui, dan jalur yang salah membuat alat ini gagal jalan. */
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
const CHROME = cariChrome();

let lulus = 0, gagal = 0;
const pesan = [];

function cek(ok, judul, info) {
  if (ok) { lulus++; console.log('  OK    ' + judul + (info ? '   ' + info : '')); }
  else { gagal++; pesan.push(judul + (info ? ' — ' + info : '')); console.log(' GAGAL  ' + judul + (info ? '   ' + info : '')); }
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });

  for (const [nama, lebar, tinggi] of [['laptop', 1440, 900], ['HP', 390, 844]]) {
    console.log('\n=== ' + nama.toUpperCase() + ' (' + lebar + 'px) ===');
    const page = await browser.newPage({ viewport: { width: lebar, height: tinggi } });
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });

    /* --- 1. Token benar-benar terpakai? --- */
    const token = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      const kartu = document.querySelector('.kartu');
      const csKartu = kartu ? getComputedStyle(kartu) : null;
      return {
        biru: cs.getPropertyValue('--fbiru').trim(),
        biruIsi: cs.getPropertyValue('--fbiru-isi').trim(),
        teks: cs.getPropertyValue('--fteks').trim(),
        teks3: cs.getPropertyValue('--fteks3').trim(),
        permukaanKartu: csKartu ? csKartu.backgroundColor : '',
        radiusKartu: csKartu ? csKartu.borderRadius : '',
        paddingKartu: csKartu ? csKartu.paddingTop : ''
      };
    });
    cek(token.biru === '#00B8F8', 'aksen biru Figma terpakai', token.biru);
    cek(token.biruIsi === '#0E86C4', 'biru isi grafik (diturunkan)', token.biruIsi);
    cek(token.teks3 === '#66666E', 'abu keterangan (diturunkan)', token.teks3);
    cek(/rgb\(255,\s*255,\s*255\)/.test(token.permukaanKartu), 'permukaan kartu putih', token.permukaanKartu);
    cek(token.radiusKartu === '16px', 'sudut kartu 16px', token.radiusKartu);

    /* --- 2. Tidak ada luber mendatar --- */
    const luber = await page.evaluate(() => ({
      dokumen: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      jendela: window.innerWidth
    }));
    cek(luber.dokumen <= 1, 'tidak meluber mendatar', 'kelebihan ' + luber.dokumen + 'px');

    /* --- 3. Cari elemen yang melewati tepi --- */
    const nakal = await page.evaluate(() => {
      const w = document.documentElement.clientWidth;
      const hasil = [];
      document.querySelectorAll('body *').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        const cs = getComputedStyle(el);
        if (cs.position === 'fixed') return;
        if (r.right > w + 1 || r.left < -1) {
          hasil.push(el.className + ' kiri=' + Math.round(r.left) + ' kanan=' + Math.round(r.right));
        }
      });
      return hasil.slice(0, 8);
    });
    cek(nakal.length === 0, 'tidak ada elemen keluar tepi', nakal.join(' | '));

    /* --- 4. Ukuran huruf masuk akal (min 11px) --- */
    const kecil = await page.evaluate(() => {
      const hasil = [];
      document.querySelectorAll('body *').forEach(el => {
        if (!el.textContent || !el.textContent.trim()) return;
        if (el.children.length) return;
        const px = parseFloat(getComputedStyle(el).fontSize);
        if (px && px < 11) hasil.push(el.className + '=' + px + 'px');
      });
      return hasil.slice(0, 8);
    });
    cek(kecil.length === 0, 'tidak ada huruf di bawah 11px', kecil.join(' | '));

    /* --- 5. Tinggi sasaran sentuh --- */
    const tombolKecil = await page.evaluate(() => {
      const hasil = [];
      document.querySelectorAll('a, button').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.height > 0 && r.height < 32) {
          hasil.push((el.className || el.tagName) + '=' + Math.round(r.height) + 'px');
        }
      });
      return hasil.slice(0, 8);
    });
    cek(tombolKecil.length === 0, 'sasaran klik tidak kekecilan', tombolKecil.join(' | '));

    /* --- 6. Semua bagian pokok ada --- */
    const bagian = await page.evaluate(() => ({
      kartuAngka: document.querySelectorAll('.angka-kartu').length,
      materi: document.querySelectorAll('.materi').length,
      batang: document.querySelectorAll('.batang-kolom').length,
      hari: document.querySelectorAll('.hari').length,
      aktivitas: document.querySelectorAll('.akt-item').length,
      cincin: document.querySelectorAll('.cincin-gambar svg').length
    }));
    cek(bagian.kartuAngka === 4, 'kartu angka 4', String(bagian.kartuAngka));
    cek(bagian.materi === 4, 'daftar materi 4', String(bagian.materi));
    cek(bagian.batang === 4, 'batang grafik 4', String(bagian.batang));
    cek(bagian.hari === 7, 'rentetan 7 hari', String(bagian.hari));
    cek(bagian.cincin === 1, 'cincin progres ada', String(bagian.cincin));

    /* --- 7. Isi tidak terpotong --- */
    const terpotong = await page.evaluate(() => {
      const hasil = [];
      document.querySelectorAll('.materi-isi b, .angka-nilai, .lanjut h3, .akt-teks').forEach(el => {
        if (el.scrollHeight > el.clientHeight + 2) hasil.push(el.className + ' terpotong');
      });
      return hasil.slice(0, 6);
    });
    cek(terpotong.length === 0, 'tidak ada tulisan terpotong', terpotong.join(' | '));

    /* --- 8. Tukar ke tema gelap lalu periksa lagi yang pokok --- */
    await page.click('#tombol-tema');
    await page.waitForTimeout(250);
    const gelap = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      const kartu = document.querySelector('.kartu');
      return {
        aktif: document.documentElement.classList.contains('gelap'),
        label: document.getElementById('nama-tema').textContent,
        permukaan: getComputedStyle(kartu).backgroundColor,
        teks: cs.getPropertyValue('--fteks').trim(),
        luber: document.documentElement.scrollWidth - document.documentElement.clientWidth
      };
    });
    cek(gelap.aktif, 'tema gelap bisa dinyalakan', gelap.label);
    cek(/rgb\(37,\s*40,\s*43\)/.test(gelap.permukaan), 'permukaan gelap terpakai', gelap.permukaan);
    cek(gelap.luber <= 1, 'tema gelap tidak meluber', 'kelebihan ' + gelap.luber + 'px');

    await page.screenshot({ path: 'potret/dashboard-baru-' + nama + '.png', fullPage: true });
    await page.close();
  }

  await browser.close();

  console.log('\n' + '='.repeat(64));
  console.log('LULUS: ' + lulus + '   GAGAL: ' + gagal);
  if (gagal) { console.log('\nYang perlu dibetulkan:'); pesan.forEach(x => console.log('  - ' + x)); }
  console.log('='.repeat(64));
  process.exit(gagal ? 1 : 0);
})().catch(e => {
  console.error('Alat ukur berhenti:', e.message);
  process.exit(2);
});
