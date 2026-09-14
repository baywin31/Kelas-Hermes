/* ukur-sejajar.js — ukur posisi kartu di dashboard untuk menemukan yang TIDAK
   sejajar (atas kartu, garis dasar judul, dan tinggi kartu).

   Kenapa: "ga sejajar" bisa berarti tiga hal berbeda — tepi atas kartunya,
   letak judulnya, atau tingginya. Mengukurnya memisahkan yang mana.
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
    const h = { 'User-Agent': 'ukur', ...(cookie ? { Cookie: cookie } : {}) };
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

const UKUR = () => {
  const hasil = [];
  document.querySelectorAll('.lz-grid').forEach((g, gi) => {
    const kartu = [...g.children];
    const kolom = getComputedStyle(g).gridTemplateColumns.split(' ').length;
    hasil.push({ grup: gi + 1, kolom, isi: kartu.map((k) => {
      const r = k.getBoundingClientRect();
      const h2 = k.querySelector('h2');
      const hr = h2 ? h2.getBoundingClientRect() : null;
      return {
        nama: (h2 ? h2.textContent.trim() : '(tanpa judul)').slice(0, 24),
        atas: Math.round(r.top),
        bawah: Math.round(r.bottom),
        tinggi: Math.round(r.height),
        judulAtas: hr ? Math.round(hr.top) : null,
        judulBawah: hr ? Math.round(hr.bottom) : null,
        judulPx: h2 ? getComputedStyle(h2).fontSize : '-',
      };
    }) });
  });
  return hasil;
};

(async () => {
  const exe = cariChrome();
  if (!exe) { console.log('DILEWATI'); process.exit(0); }
  const cookie = await masuk();
  const browser = await chromium.launch({ executablePath: exe });
  let cacat = 0;
  for (const l of [{ n: 'laptop', w: 1440 }, { n: 'HP', w: 390 }]) {
    const ctx = await browser.newContext({ viewport: { width: l.w, height: 900 }, colorScheme: 'light' });
    await ctx.addCookies(cookie.split('; ').map(c => {
      const i = c.indexOf('=');
      return { name: c.slice(0, i), value: c.slice(i + 1), domain: HOST, path: '/' };
    }));
    const page = await ctx.newPage();
    await page.goto(`http://${HOST}:${PORT}/dashboard.php`, { waitUntil: 'networkidle' });
    const data = await page.evaluate(UKUR);
    console.log(`\n############ ${l.n} (${l.w}px) ############`);
    for (const g of data) {
      // Sejajar = semua tepi atas SAMA dan semua tinggi SAMA (dalam 1px).
      const atas = g.isi.map(k => k.atas);
      const tinggi = g.isi.map(k => k.tinggi);
      const jAtas = g.isi.map(k => k.judulAtas).filter(v => v !== null);
      const jPx = g.isi.map(k => k.judulPx).filter(v => v !== '-');
      const samaAtas = Math.max(...atas) - Math.min(...atas) <= 1;
      const samaTinggi = Math.max(...tinggi) - Math.min(...tinggi) <= 1;
      const samaJudul = jAtas.length < 2 || (Math.max(...jAtas) - Math.min(...jAtas) <= 1);
      const samaUkuran = jPx.length < 2 || new Set(jPx).size === 1;
      console.log(`\nGRUP ${g.grup} — ${g.kolom} kolom`);
      for (const k of g.isi) {
        console.log(`  ${k.nama.padEnd(26)} atas=${String(k.atas).padStart(5)} tinggi=${String(k.tinggi).padStart(4)} ` +
                    `judul ${k.judulAtas}..${k.judulBawah} (${k.judulPx})`);
      }
      console.log(`  -> tepi atas ${samaAtas ? 'SEJAJAR' : 'BEDA ' + (Math.max(...atas) - Math.min(...atas)) + 'px'}` +
                  ` | tinggi ${samaTinggi ? 'SAMA' : 'BEDA ' + (Math.max(...tinggi) - Math.min(...tinggi)) + 'px'}` +
                  ` | judul ${samaJudul ? 'SEJAJAR' : 'BEDA ' + (Math.max(...jAtas) - Math.min(...jAtas)) + 'px'}` +
                  ` | ukuran ${samaUkuran ? 'SAMA' : 'BEDA ' + jPx.join('/')}`);
      // Kartu dalam satu baris grid WAJIB rata atas, sama tinggi, judul sebaris,
      // dan berukuran huruf sama. Kalau tidak, hasilnya terlihat sebagai cacat.
      if (g.kolom > 1 && !(samaAtas && samaTinggi && samaJudul && samaUkuran)) cacat++;
    }
    await ctx.close();
  }
  await browser.close();
  console.log('\n===================================================');
  console.log(`cacat keselarasan: ${cacat}`);
  console.log('===================================================');
  process.exit(cacat === 0 ? 0 : 1);
})().catch(e => { console.error('berhenti: ' + e.message); process.exit(2); });
