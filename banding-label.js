/* banding-label.js — buktikan label LAMA ("Bagian 1".."Bagian 9") menabrak di
   layar sempit, dan label BARU ("B1".."B9") tidak.

   Kenapa perlu pembanding: tanpa angka pembanding, "sudah diperbaiki" cuma
   klaim. Basis data uji lokal hanya punya 4 Bagian, padahal hosting punya 9 —
   jadi 9 batang dibuat di sini supaya kasus terburuknya benar-benar terukur.
*/
'use strict';
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path'), http = require('http');

function cariChrome() {
  const akar = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  if (!fs.existsSync(akar)) return null;
  const c = fs.readdirSync(akar).filter(n => /^chromium-\d+$/.test(n))
    .sort((a, b) => parseInt(b.split('-')[1]) - parseInt(a.split('-')[1]));
  for (const x of c) { const p = path.join(akar, x, 'chrome-win64', 'chrome.exe'); if (fs.existsSync(p)) return p; }
  return null;
}
const HOST = '127.0.0.1', PORT = 8813;

function minta(jalur, opsi = {}) {
  const { metode = 'GET', cookie = '', body = null } = opsi;
  return new Promise((s, g) => {
    const h = { 'User-Agent': 'banding', ...(cookie ? { Cookie: cookie } : {}) };
    if (body) { h['Content-Type'] = 'application/x-www-form-urlencoded'; h['Content-Length'] = Buffer.byteLength(body); }
    const req = http.request({ host: HOST, port: PORT, path: jalur, method: metode, headers: h }, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => s({ status: r.statusCode, isi: d, setCookie: r.headers['set-cookie'] || [] }));
    });
    req.on('error', g); req.end(body || undefined);
  });
}
async function masuk() {
  const a = await minta('/login.php');
  const ck = a.setCookie.map(c => c.split(';')[0]).join('; ');
  const csrf = (a.isi.match(/name="csrf"[^>]*value="([^"]+)"/) || [])[1];
  const r = await minta('/login.php', { metode: 'POST', cookie: ck,
    body: 'email=budi%40demo.id&password=demo12345&csrf=' + encodeURIComponent(csrf) });
  return r.setCookie.map(c => c.split(';')[0]).join('; ');
}

// Ukur tabrakan untuk satu gaya label. Batang digandakan jadi 9 dulu.
const UKUR = (pola) => {
  const wadah = document.querySelector('.lz-batang');
  const asli = [...wadah.querySelectorAll('i')];
  const sudah = asli.length;
  if (!window.__SUDAH_DIGANDA) {
    for (let n = sudah; n < 9; n++) {
      const k = asli[n % sudah].cloneNode(true);
      k.setAttribute('data-n', 'B' + (n + 1));
      wadah.appendChild(k);
    }
    window.__SUDAH_DIGANDA = true;
  }
  const btg = [...wadah.querySelectorAll('i')];
  const kotak = btg.map((b) => {
    const st = getComputedStyle(b, '::after');
    const cv = document.createElement('canvas').getContext('2d');
    cv.font = `${st.fontStyle} ${st.fontWeight} ${st.fontSize} ${st.fontFamily}`;
    const teks = pola.replace('{n}', b.getAttribute('data-n').replace(/\D/g, ''));
    const lebar = cv.measureText(teks).width;
    const r = b.getBoundingClientRect();
    const t = r.left + r.width / 2;
    return { teks, kiri: t - lebar / 2, kanan: t + lebar / 2, lebarTeks: lebar };
  });
  let tabrak = 0, maks = 0;
  for (let i = 0; i < kotak.length - 1; i++) {
    const lebih = kotak[i].kanan - kotak[i + 1].kiri;
    if (lebih > 0.5) { tabrak++; maks = Math.max(maks, lebih); }
  }
  const luar = wadah.getBoundingClientRect();
  const luber = kotak.filter(k => k.kiri < luar.left - 1 || k.kanan > luar.right + 1).length;
  return { jumlah: kotak.length, tabrak, luber, maks: Math.round(maks * 10) / 10,
           contoh: kotak.map(k => k.teks).join(' '),
           lebarBatang: Math.round(btg[0].getBoundingClientRect().width) };
};

(async () => {
  const exe = cariChrome();
  if (!exe) { console.log('DILEWATI'); process.exit(0); }
  const cookie = await masuk();
  const browser = await chromium.launch({ executablePath: exe });

  for (const l of [{ n: 'HP-kecil 320px', w: 320 }, { n: 'HP 390px', w: 390 }, { n: 'laptop', w: 1440 }]) {
    const ctx = await browser.newContext({ viewport: { width: l.w, height: 900 }, colorScheme: 'light' });
    await ctx.addCookies(cookie.split('; ').map(c => {
      const i = c.indexOf('='); return { name: c.slice(0, i), value: c.slice(i + 1), domain: HOST, path: '/' };
    }));
    const page = await ctx.newPage();
    await page.goto(`http://${HOST}:${PORT}/dashboard.php`, { waitUntil: 'networkidle' });

    const lama = await page.evaluate(UKUR, 'Bagian {n}');
    const baru = await page.evaluate(UKUR, 'B{n}');
    console.log(`\n${l.n}  (${lama.jumlah} batang a ${lama.lebarBatang}px)`);
    console.log(`  LAMA "Bagian 1" : ${lama.tabrak} tabrakan, ${lama.luber} luber, parah ${lama.maks}px`);
    console.log(`                    "${lama.contoh}"`);
    console.log(`  BARU "B1"       : ${baru.tabrak} tabrakan, ${baru.luber} luber, parah ${baru.maks}px`);
    console.log(`                    "${baru.contoh}"`);
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error('berhenti: ' + e.message); process.exit(2); });
