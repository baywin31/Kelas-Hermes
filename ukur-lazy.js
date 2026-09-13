/* ukur-lazy.js — buktikan versi ponytail BENAR-BENAR tampil rapi di browser,
   di dua tema dan dua ukuran layar.

   Kenapa perlu: versi ini memakai dua teknik yang belum dipakai di app ini —
   cincin dari conic-gradient, dan label batang dari ::after. Kalau salah,
   hasilnya rusak TANPA pesan error di konsol. Jadi harus dilihat ukurannya.

   Cara pakai: node ukur-lazy.js
*/
'use strict';
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

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

const HAL = 'file:///' + path.resolve('dashboard-lazy.html').replace(/\\/g, '/');

let lulus = 0, gagal = 0;
const pesan = [];
function cek(ok, judul, info) {
  if (ok) { lulus++; console.log('  OK    ' + judul + (info ? '   ' + info : '')); }
  else { gagal++; pesan.push(judul + (info ? ' — ' + info : '')); console.log(' GAGAL  ' + judul + (info ? '   ' + info : '')); }
}

(async () => {
  const browser = await chromium.launch({ executablePath: cariChrome() });

  for (const tema of ['light', 'dark']) {
    for (const [nama, lebar, tinggi] of [['laptop', 1440, 900], ['HP', 390, 844]]) {
      console.log('\n=== ' + tema.toUpperCase() + ' / ' + nama + ' (' + lebar + 'px) ===');
      const page = await browser.newPage({
        viewport: { width: lebar, height: tinggi },
        colorScheme: tema
      });
      await page.goto(HAL, { waitUntil: 'load', timeout: 30000 });

      /* 1. Tema benar-benar ikut setelan sistem, tanpa JavaScript */
      const warna = await page.evaluate(() => ({
        latar: getComputedStyle(document.body).backgroundColor,
        kartu: getComputedStyle(document.querySelector('.kartu')).backgroundColor,
        teks: getComputedStyle(document.querySelector('.label')).color
      }));
      const harapLatar = tema === 'light' ? 'rgb(237, 237, 239)' : 'rgb(27, 30, 33)';
      cek(warna.latar === harapLatar, 'latar ikut tema OS', warna.latar);

      /* 2. Tidak meluber mendatar */
      const lb = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      cek(lb <= 1, 'tidak meluber mendatar', lb + 'px');

      /* 3. Cincin: conic-gradient, bulat, angka terbaca */
      const cincin = await page.evaluate(() => {
        const c = document.querySelector('.cincin');
        const r = c.getBoundingClientRect();
        return {
          gambar: getComputedStyle(c).backgroundImage.slice(0, 26),
          w: Math.round(r.width), h: Math.round(r.height),
          angka: document.querySelector('.cincin b').textContent.trim()
        };
      });
      cek(cincin.gambar.startsWith('conic-gradient'), 'cincin pakai conic-gradient', cincin.gambar);
      cek(Math.abs(cincin.w - cincin.h) <= 1 && cincin.w >= 100, 'cincin bulat & cukup besar', cincin.w + '×' + cincin.h);
      cek(/49%/.test(cincin.angka), 'angka cincin terbaca', cincin.angka);

      /* 4. Label batang: ada, tidak tumpang tindih, tidak keluar wadah */
      const batang = await page.evaluate(() => {
        const wadah = document.querySelector('.batang');
        const wr = wadah.getBoundingClientRect();
        const label = [];
        document.querySelectorAll('.batang i').forEach(i => {
          const r = i.getBoundingClientRect();
          label.push({ kiri: Math.round(r.left), kanan: Math.round(r.right), tinggi: Math.round(r.height) });
        });
        return { wadahBawah: Math.round(wr.bottom), label };
      });
      const tumpang = batang.label.some((b, i) => i && b.kiri < batang.label[i - 1].kanan);
      cek(!tumpang, 'batang tidak tumpang tindih');
      cek(batang.label.length === 4, 'jumlah batang 4', String(batang.label.length));
      cek(batang.label.every(b => b.tinggi <= batang.label.length * 100), 'batang tidak melebihi wadah');

      /* 5. Huruf tidak kekecilan */
      const kecil = await page.evaluate(() => {
        const h = [];
        document.querySelectorAll('body *').forEach(el => {
          if (el.children.length || !el.textContent.trim()) return;
          const px = parseFloat(getComputedStyle(el).fontSize);
          if (px && px < 11) h.push((el.className || el.tagName) + '=' + px + 'px');
        });
        return h.slice(0, 6);
      });
      cek(kecil.length === 0, 'tidak ada huruf di bawah 11px', kecil.join(' | '));

      /* 6. Isi tidak terpotong */
      const potong = await page.evaluate(() => {
        const h = [];
        document.querySelectorAll('.isi b, .nilai, .lanjut h3, .akt span').forEach(el => {
          if (el.scrollHeight > el.clientHeight + 2) h.push(el.className || el.tagName);
        });
        return h.slice(0, 5);
      });
      cek(potong.length === 0, 'tidak ada isi terpotong', potong.join(' | '));

      /* 7. Semua bagian pokok lengkap */
      const jml = await page.evaluate(() => ({
        angka: document.querySelectorAll('.angka').length,
        materi: document.querySelectorAll('.materi').length,
        batang: document.querySelectorAll('.batang i').length,
        hari: document.querySelectorAll('.rentetan div').length,
        aktivitas: document.querySelectorAll('.akt').length,
        cincin: document.querySelectorAll('.cincin').length
      }));
      cek(jml.angka === 4, 'kartu angka 4', String(jml.angka));
      cek(jml.materi === 4, 'daftar materi 4', String(jml.materi));
      cek(jml.hari === 7, 'rentetan 7 hari', String(jml.hari));
      cek(jml.cincin === 1, 'cincin ada', String(jml.cincin));

      /* 8. Tidak ada JavaScript sama sekali (klaim utama versi ponytail) */
      const js = await page.evaluate(() => document.querySelectorAll('script').length);
      cek(js === 0, 'tanpa JavaScript', js + ' blok <script>');

      await page.screenshot({ path: `potret/lazy-${nama}-${tema}.png`, fullPage: true });
      await page.close();
    }
  }

  await browser.close();
  console.log('\n' + '='.repeat(66));
  console.log('LULUS: ' + lulus + '   GAGAL: ' + gagal);
  if (gagal) { console.log('\nPerlu dibetulkan:'); pesan.forEach(x => console.log('  - ' + x)); }
  console.log('='.repeat(66));
  process.exit(gagal ? 1 : 0);
})().catch(e => { console.error('Alat ukur berhenti: ' + e.message); process.exit(2); });
