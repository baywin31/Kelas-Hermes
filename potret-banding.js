/* potret-banding.js — potret baris widget dashboard dalam dua keadaan:
   SEBELUM (margin bawaan tampilan-v2.css masih menimpa) dan SESUDAH (gaya baru).

   Cara: muat dashboard sungguhan, potret, lalu suntik `margin-top:18px` untuk
   memutar balik cacatnya dan potret lagi. Hasilnya dipotong ke baris widget
   supaya bedanya kelihatan jelas — bukan cuma dipercaya dari angka.

   Kenapa: pengguna melihat cacat ini dengan mata, sementara alat ukur kami
   sempat salah baca. Bukti visual menutup celah itu.
*/
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright-core');

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
  return new Promise((res, rej) => {
    const q = http.request({ host: HOST, port: PORT, path: jalur, method: opsi.metode || 'GET',
      headers: { ...(opsi.cookie ? { Cookie: opsi.cookie } : {}),
                 ...(opsi.body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) } },
      r => { let s = ''; r.on('data', d => s += d);
        r.on('end', () => res({ status: r.statusCode, isi: s,
          setCookie: r.headers['set-cookie'] || [] })); });
    q.on('error', rej); if (opsi.body) q.write(opsi.body); q.end();
  });
}

async function masuk() {
  await minta('/_uji_akun.php');
  const a = await minta('/login.php');
  const ck = a.setCookie.map(c => c.split(';')[0]).join('; ');
  const csrf = (a.isi.match(/name="csrf"[^>]*value="([^"]+)"/) || [])[1];
  const r = await minta('/login.php', { metode: 'POST', cookie: ck,
    body: 'email=budi%40demo.id&password=demo12345&csrf=' + encodeURIComponent(csrf) });
  if (!r.setCookie.join(';').includes('kdsess')) throw new Error('login gagal: ' + r.status);
  return r.setCookie.map(c => c.split(';')[0]).join('; ');
}

/* Baris widget yang dipermasalahkan: ambil dari tepi atas kartu pertama sampai
   tepi bawah kartu terakhir, plus sedikit margin supaya judulnya ikut.
   Sengaja TANPA window.scrollY: viewport dibuat cukup tinggi (lihat bawah)
   supaya seluruh halaman muat, jadi koordinat viewport = koordinat halaman.
   Kalau ditambah scrollY, klip baris kedua jatuh di luar viewport dan
   hasilnya gambar kosong 0 KB. */
const BARIS = () => {
  const out = [];
  for (const g of document.querySelectorAll('.lz-grid')) {
    const k = [...g.querySelectorAll('.card')];
    if (k.length < 2) continue;
    const r = k.map(x => x.getBoundingClientRect());
    const atas = Math.min(...r.map(x => x.top));
    const bawah = Math.max(...r.map(x => x.bottom));
    const kiri = Math.min(...r.map(x => x.left));
    const kanan = Math.max(...r.map(x => x.right));
    out.push({ atas: Math.floor(atas) - 14, bawah: Math.ceil(bawah) + 14,
               kiri: Math.floor(kiri) - 14, kanan: Math.ceil(kanan) + 14 });
  }
  return out;
};

(async () => {
  const exe = cariChrome();
  if (!exe) { console.log('DILEWATI'); process.exit(0); }
  const cookie = await masuk();
  fs.mkdirSync('potret', { recursive: true });
  const browser = await chromium.launch({ executablePath: exe });

  for (const tema of ['light', 'dark']) {
    /* Viewport tinggi supaya SELURUH halaman muat tanpa menggulir — dengan
       begitu klip baris mana pun tetap berada di dalam viewport. */
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 2400 }, colorScheme: tema });
    await ctx.addCookies(cookie.split('; ').map(c => {
      const i = c.indexOf('='); return { name: c.slice(0, i), value: c.slice(i + 1), domain: HOST, path: '/' };
    }));
    const page = await ctx.newPage();
    await page.goto(`http://${HOST}:${PORT}/dashboard.php`, { waitUntil: 'networkidle' });

    const baris = await page.evaluate(BARIS);
    for (const [keadaan, css] of [
      ['sesudah', ''],
      /* Memutar balik cacatnya: aturan ini yang dulu mendorong kartu kedua turun. */
      ['sebelum', '.lz-grid .card + .card{margin-top:18px !important} .lz-grid{align-items:start !important}'],
    ]) {
      if (css) {
        await page.addStyleTag({ content: css });
        await page.waitForTimeout(120);
      }
      for (let i = 0; i < baris.length; i++) {
        const b = baris[i];
        const nama = `potret/sejajar-${keadaan}-${tema}-baris${i + 1}.png`;
        await page.screenshot({ path: nama,
          clip: { x: Math.max(0, b.kiri), y: Math.max(0, b.atas),
                  width: Math.min(1280, b.kanan) - Math.max(0, b.kiri),
                  height: Math.min(600, b.bawah - b.atas) } });
        console.log(`  ${nama}`);
      }
    }
    await ctx.close();
  }
  await browser.close();
  console.log('\nselesai — bandingkan "sebelum" dan "sesudah"');
})().catch(e => { console.error('berhenti: ' + e.message); process.exit(2); });