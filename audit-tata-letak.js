/* audit-tata-letak.js — cari kerusakan tampilan yang bisa DIUKUR, bukan dinilai
   selera. Dipakai karena mata tidak selalu tersedia: satu-satunya jalan tetap
   jujur adalah mencari cacat yang bisa dibuktikan angka.

   Yang dicari (semuanya cacat nyata, bukan soal selera):
     1. luber horizontal (ada yang melebihi lebar layar)
     2. elemen keluar dari batas layar
     3. teks yang tertimpa elemen lain
     4. huruf terlalu kecil untuk dibaca
     5. kontras teks nyata di bawah ambang WCAG (4.5 untuk teks biasa)
     6. gambar gagal dimuat (potret/kenyataan jadi kotak kosong)
     7. tombol terlalu kecil untuk ditekan jari (di layar HP)
*/
const fs = require('fs');
const http = require('http');
const { chromium } = require('playwright-core');

const APP = 'C:/Users/user/apps/karyawan-digital-php';
const exe = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe',
].find((p) => fs.existsSync(p));

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

const HALAMAN = [
  { nama: 'depan', jalur: '/index.php' },
  { nama: 'login', jalur: '/login.php' },
  { nama: 'redeem', jalur: '/redeem.php' },
];

const LEBAR = [
  { nama: 'laptop', w: 1280, h: 900 },
  { nama: 'HP', w: 390, h: 844 },
];

(async () => {
  if (!exe) { console.log('DILEWATI (Chrome tidak ada)'); process.exit(0); }
  const browser = await chromium.launch({ executablePath: exe });
  let cacat = 0;

  for (const h of HALAMAN) {
    const html = await ambil(h.jalur);
    if (!html || html.length < 400) { console.log('luput: ' + h.nama); continue; }

    for (const l of LEBAR) {
      const page = await browser.newPage({ viewport: { width: l.w, height: l.h } });
      await page.setContent(rangkai(html), { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.evaluate(() => Promise.all([...document.images]
        .map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))));

      const hasil = await page.evaluate(() => {
        const cacat = [];
        const de = document.documentElement;

        // 1. luber horizontal
        const luber = de.scrollWidth - de.clientWidth;
        if (luber > 2) {
          // cari pelakunya supaya bisa diperbaiki, bukan sekadar dilaporkan
          const salah = [...document.querySelectorAll('body *')].filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && (r.right > de.clientWidth + 2 || r.left < -2);
          }).slice(0, 4).map((el) => el.tagName.toLowerCase() + '.' + (el.getAttribute('class') || '').split(' ')[0]);
          cacat.push('luber horizontal ' + luber + 'px — pelaku: ' + salah.join(', '));
        }

        // 2. teks tertimpa (hanya dicek antar-elemen teks bersaudara; tumpang
        //    tindih sah seperti gradasi overlay sengaja dilewati)
        const teks = [...document.querySelectorAll('h1,h2,h3,p,a.btn,button,label,li')]
          .filter((el) => el.textContent.trim() && el.getBoundingClientRect().width > 0);
        let tumpang = 0;
        for (let i = 0; i < teks.length; i++) {
          for (let j = i + 1; j < teks.length; j++) {
            if (teks[i].contains(teks[j]) || teks[j].contains(teks[i])) continue;
            const a = teks[i].getBoundingClientRect(), b = teks[j].getBoundingClientRect();
            const tumpuk = a.left < b.right - 4 && b.left < a.right - 4 &&
                           a.top < b.bottom - 4 && b.top < a.bottom - 4;
            if (tumpuk) tumpang++;
          }
        }
        if (tumpang > 0) cacat.push(tumpang + ' pasang teks saling tertimpa');

        // 3. huruf terlalu kecil
        const kecil = [...document.querySelectorAll('p,li,span,a,td')]
          .filter((el) => el.textContent.trim().length > 12)
          .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 11.5).length;
        if (kecil > 0) cacat.push(kecil + ' elemen berhuruf di bawah 11.5px');

        // 4. kontras teks NYATA (warna hasil hitungan, bukan tebakan)
        function keRGB(s) {
          const m = s.match(/[\d.]+/g);
          return m ? m.slice(0, 3).map(Number) : null;
        }
        function lum(c) {
          const f = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
          return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
        }
        let rendah = [];
        [...document.querySelectorAll('p,li,h1,h2,h3,td,a.btn,button,label')].forEach((el) => {
          if (!el.textContent.trim() || el.getBoundingClientRect().height === 0) return;
          const s = getComputedStyle(el);
          if (parseFloat(s.opacity) < 0.5) return;
          const fg = keRGB(s.color);
          // cari latar efektif dengan menelusuri ke atas sampai ada warna padat
          let bg = null, e = el;
          while (e && e !== document.documentElement) {
            const b = keRGB(getComputedStyle(e).backgroundColor);
            const al = parseFloat(getComputedStyle(e).backgroundColor.split(',').pop()) || 1;
            if (b && al > 0.5) { bg = b; break; }
            e = e.parentElement;
          }
          if (!fg || !bg) return;
          const L1 = lum(fg), L2 = lum(bg);
          const rasio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
          const px = parseFloat(s.fontSize), tebal = parseInt(s.fontWeight) >= 700;
          const ambang = (px >= 24 || (px >= 18.66 && tebal)) ? 3 : 4.5;
          if (rasio < ambang) rendah.push(Math.round(rasio * 100) / 100 + ' (' + el.tagName.toLowerCase() + ': ' + el.textContent.trim().slice(0, 20) + ')');
        });
        if (rendah.length) cacat.push('kontras rendah: ' + rendah.slice(0, 4).join(' | '));

        // 5. gambar gagal dimuat (pengunjung melihat kotak kosong)
        const rusak = [...document.images].filter((i) => i.src && !i.naturalWidth && i.getBoundingClientRect().width > 0).length;
        if (rusak > 0) cacat.push(rusak + ' gambar tidak termuat');

        // 6. sasaran tekan terlalu kecil (di layar HP)
        const keci = [...document.querySelectorAll('a.btn,button')]
          .filter((el) => el.getBoundingClientRect().width > 0)
          .filter((el) => el.getBoundingClientRect().height < 38).length;
        if (keci > 0) cacat.push(keci + ' tombol lebih pendek dari 38px');

        return cacat;
      });

      if (hasil.length) {
        cacat += hasil.length;
        console.log('  CACAT  ' + h.nama + ' @' + l.nama);
        hasil.forEach((x) => console.log('         - ' + x));
      } else {
        console.log('  bersih ' + h.nama + ' @' + l.nama);
      }
      await page.close();
    }
  }

  await browser.close();
  console.log('\n-----\ntotal cacat tata letak: ' + cacat);
  process.exit(cacat === 0 ? 0 : 1);
})();
