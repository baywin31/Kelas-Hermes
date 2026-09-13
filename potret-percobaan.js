/* potret-percobaan.js — potret halaman percobaan gaya Figma, sekaligus audit
   tata letaknya di laptop dan HP.

   Halaman percobaan ini berkas statis murni (tanpa PHP), jadi bisa dibuka
   langsung sebagai berkas — tidak perlu server sama sekali.
*/
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const APP = 'C:/Users/user/apps/karyawan-digital-php';
const OUT = APP + '/potret';
const BERKAS = APP + '/percobaan-figma.html';

const exe = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe',
].find((p) => fs.existsSync(p));

/* Tanam isi setiap CSS supaya halaman berdiri sendiri — nol permintaan jaringan. */
function rangkai() {
  let html = fs.readFileSync(BERKAS, 'utf8');
  return html.replace(/<link[^>]+href=["']([^"']+\.css)(?:\?v=\d+)?["'][^>]*>/gi, (m, href) => {
    const j = APP + '/' + href.split('/').pop();
    return fs.existsSync(j) ? '<style>\n' + fs.readFileSync(j, 'utf8') + '\n</style>' : '<!-- ' + href + ' -->';
  });
}

const LEBAR = [
  { nama: 'laptop', w: 1280, h: 1100 },
  { nama: 'HP', w: 390, h: 900 },
];

(async () => {
  if (!exe) { console.log('Chrome tidak ada'); process.exit(0); }
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: exe });
  const html = rangkai();

  for (const l of LEBAR) {
    const page = await browser.newPage({ viewport: { width: l.w, height: l.h } });
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.addStyleTag({ content: '*{animation:none !important; transition:none !important}' });
    await page.waitForTimeout(150);

    await page.screenshot({ path: `${OUT}/percobaan-figma-${l.nama}.png`, fullPage: l.nama === 'laptop' });
    console.log('potret ' + l.nama + ' dibuat');

    const hasil = await page.evaluate(() => {
      const cacat = [];
      const de = document.documentElement;

      const luber = de.scrollWidth - de.clientWidth;
      if (luber > 2) cacat.push('luber mendatar ' + luber + 'px');

      // Teks yang tak terbaca: warna hasil hitungan, dicari latar efektifnya.
      function keRGB(s) { const m = s.match(/[\d.]+/g); return m ? m.slice(0, 3).map(Number) : null; }
      function lum(c) {
        const f = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
        return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
      }
      const rendah = [];
      document.querySelectorAll('h1,h2,h3,p,td,th,b,i,span,a.btn,button').forEach((el) => {
        if (!el.textContent.trim() || el.getBoundingClientRect().height === 0) return;
        const s = getComputedStyle(el);
        if (parseFloat(s.opacity) < 0.5) return;
        const fg = keRGB(s.color);
        let bg = null, e = el;
        while (e && e !== document.documentElement) {
          const bs = getComputedStyle(e).backgroundColor;
          const b = keRGB(bs);
          const al = bs.startsWith('rgba') ? parseFloat(bs.split(',').pop()) : 1;
          if (b && al > 0.5) { bg = b; break; }
          e = e.parentElement;
        }
        if (!fg || !bg) return;
        const L1 = lum(fg), L2 = lum(bg);
        const r = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        const px = parseFloat(s.fontSize), tebal = parseInt(s.fontWeight) >= 700;
        const amb = (px >= 24 || (px >= 18.66 && tebal)) ? 3 : 4.5;
        if (r < amb) rendah.push(`${r.toFixed(2)} (${el.tagName.toLowerCase()}: ${el.textContent.trim().slice(0, 18)})`);
      });
      if (rendah.length) cacat.push('kontras rendah: ' + rendah.slice(0, 4).join(' | '));

      // Tombol kekecilan untuk jari
      const kecil = [...document.querySelectorAll('a.btn,button')]
        .filter((el) => el.getBoundingClientRect().height > 0)
        .filter((el) => el.getBoundingClientRect().height < 36).length;
      if (kecil) cacat.push(kecil + ' tombol di bawah 36px');

      return cacat;
    });

    if (hasil.length) hasil.forEach((c) => console.log('  CACAT ' + l.nama + ': ' + c));
    else console.log('  bersih ' + l.nama);
    await page.close();
  }

  await browser.close();
})();
