/* uji-label-batang.js — buktikan label di bawah grafik "Progres per Bagian"
   tidak saling menabrak, di laptop MAUPUN HP.

   Kenapa perlu: cacatnya HANYA muncul di layar sempit (tiap batang jadi
   selebar ~30px). Diuji di laptop saja, ketabrakannya lolos. Diukur dengan
   membandingkan kotak nyata label, bukan dinilai dengan mata.

   Catatan: label dibuat lewat ::after, yang TIDAK muncul di querySelectorAll.
   Jadi lebarnya dihitung dari ukuran teks memakai font yang sedang aktif.

   Cara pakai:
     1. php.exe -S 127.0.0.1:8813 -t .        (latar)
     2. node uji-label-batang.js
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
const LEBAR = [
  { nama: 'laptop', w: 1440, h: 900 },
  { nama: 'HP-kecil', w: 320, h: 700 },   // iPhone SE / Android kecil
  { nama: 'HP', w: 390, h: 844 },
];

function minta(jalur, opsi = {}) {
  const { metode = 'GET', cookie = '', body = null } = opsi;
  return new Promise((selesai, gagal) => {
    const h = { 'User-Agent': 'uji-label', ...(cookie ? { Cookie: cookie } : {}) };
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
  if (!csrf) throw new Error('token csrf tidak ditemukan');
  const body = 'email=' + encodeURIComponent(EMAIL) + '&password=' + encodeURIComponent(SANDI) +
               '&csrf=' + encodeURIComponent(csrf);
  const r = await minta('/login.php', { metode: 'POST', cookie: cookieAwal, body });
  const baru = r.setCookie.map(c => c.split(';')[0]).join('; ');
  if (!baru.includes('kdsess')) throw new Error('login gagal: ' + r.status);
  return baru;
}

(async () => {
  const exe = cariChrome();
  if (!exe) { console.log('DILEWATI (Chromium tidak ada)'); process.exit(0); }
  const cookie = await masuk();
  const browser = await chromium.launch({ executablePath: exe });
  fs.mkdirSync('potret', { recursive: true });

  let gagal = 0, lulus = 0;
  const ringkas = [];

  for (const tema of ['light', 'dark']) {
    for (const l of LEBAR) {
      const ctx = await browser.newContext({ viewport: { width: l.w, height: l.h }, colorScheme: tema });
      await ctx.addCookies(cookie.split('; ').map(c => {
        const i = c.indexOf('=');
        return { name: c.slice(0, i), value: c.slice(i + 1), domain: HOST, path: '/' };
      }));
      const page = await ctx.newPage();
      await page.goto(`http://${HOST}:${PORT}/dashboard.php`, { waitUntil: 'networkidle', timeout: 30000 });

      const hasil = await page.evaluate(() => {
        // Jumlah Bagian di hosting bisa sampai 9, sedangkan basis data uji
        // lokal hanya 4. Jadi batangnya DIGANDAKAN di sini supaya kasus
        // terburuk (9 batang di layar sempit) benar-benar teruji.
        const wadah = document.querySelector('.lz-batang');
        if (!wadah) return { ada: false };
        const asli = [...wadah.querySelectorAll('i')];
        if (!asli.length) return { ada: false };
        for (let n = asli.length; n < 9; n++) {
          const klon = asli[n % asli.length].cloneNode(true);
          klon.setAttribute('data-n', 'B' + (n + 1));
          wadah.appendChild(klon);
        }
        const btg = [...wadah.querySelectorAll('i')];
        // Gaya label: bisa dipaksa lewat window.__POLA_LABEL supaya versi lama
        // ("Bagian 1") bisa diukur sebagai pembanding.
        const pola = window.__POLA_LABEL || '{n}';
        const kotak = btg.map((b) => {
          const st = getComputedStyle(b, '::after');
          const cv = document.createElement('canvas').getContext('2d');
          cv.font = `${st.fontStyle} ${st.fontWeight} ${st.fontSize} ${st.fontFamily}`;
          const teks = pola.replace('{n}', b.getAttribute('data-n') || '');
          const lebar = cv.measureText(teks).width;
          const r = b.getBoundingClientRect();
          const tengah = r.left + r.width / 2;
          return { teks, kiri: tengah - lebar / 2, kanan: tengah + lebar / 2,
                   lebarBatang: r.width, lebarTeks: lebar };
        });
        const tabrak = [];
        for (let i = 0; i < kotak.length - 1; i++) {
          const a = kotak[i], b = kotak[i + 1];
          if (a.kanan > b.kiri + 0.5) {
            tabrak.push(`${a.teks}↔${b.teks} lebih ${(a.kanan - b.kiri).toFixed(1)}px`);
          }
        }
        const luar = document.querySelector('.lz-batang').getBoundingClientRect();
        const luber = kotak.filter(k => k.kiri < luar.left - 1 || k.kanan > luar.right + 1).map(k => k.teks);
        return { ada: true, jumlah: kotak.length, lebarBatang: kotak[0].lebarBatang,
                 lebarTeks: kotak[0].lebarTeks, tabrak, luber };
      });

      if (!hasil.ada) { console.log(`  luput  ${tema}/${l.nama}: batang tidak ketemu`); await ctx.close(); continue; }
      const tanda = (hasil.tabrak.length === 0 && hasil.luber.length === 0) ? 'OK    ' : 'GAGAL ';
      if (tanda.trim() === 'OK') lulus++; else gagal++;
      console.log(`  ${tanda} ${tema}/${l.nama.padEnd(9)} ${hasil.jumlah} label, batang ${hasil.lebarBatang.toFixed(0)}px, ` +
                  `label ${hasil.lebarTeks.toFixed(0)}px  ${hasil.tabrak.length ? 'TABRAK ' + hasil.tabrak.join(', ') : ''}` +
                  `${hasil.luber.length ? ' LUBER ' + hasil.luber.join(',') : ''}`);
      ringkas.push({ tema, layar: l.nama, ...hasil });

      if (l.nama === 'HP-kecil' && tema === 'light') {
        await page.locator('.lz-batang').screenshot({ path: 'potret/batang-HP-kecil.png' });
      }
      await ctx.close();
    }
  }

  await browser.close();
  console.log('\n===================================================');
  console.log(`LULUS: ${lulus}   GAGAL: ${gagal}`);
  console.log('===================================================');
  process.exit(gagal === 0 ? 0 : 1);
})().catch(e => { console.error('berhenti: ' + e.message); process.exit(2); });
