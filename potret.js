/* potret.js — potret (screenshot) halaman SEBELUM vs SESUDAH polesan, supaya
   hasilnya bisa dinilai sendiri tanpa harus menyalakan server.

   Kenapa begini: yang sedang dinilai adalah TAMPILAN. Angka dan daftar kelas
   tidak bisa menunjukkan "lebih keren atau tidak". Potret bisa.

   Cara kerja: HTML pratinjau dibaca dari disk, lalu setiap <link> CSS diganti
   isi berkasnya (CSS inline) — jadi nol permintaan jaringan. Untuk versi
   "sebelum", tautan tampilan-v2.css sengaja dibuang; untuk "sesudah", ikut. */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const APP = 'C:/Users/user/apps/karyawan-digital-php';
const DIR = APP + '/pratinjau';
const OUT = APP + '/potret';
const LAPIS = 'tampilan-v2.css';

const exe = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe',
].find((p) => fs.existsSync(p));

/* Ambil HTML dan tanam isi CSS-nya. `pakaiV2` menentukan apakah lapisan
   tampilan-v2 ikut ditanam atau dibuang (untuk versi "sebelum"). */
function rangkai(namaBerkas, pakaiV2) {
  let html = fs.readFileSync(namaBerkas, 'utf8');
  return html.replace(/<link[^>]+href=["']([^"']+\.css)(?:\?v=\d+)?["'][^>]*>/gi, (m, href) => {
    const bersih = href.split('/').pop();
    if (bersih === LAPIS && !pakaiV2) return '';           // versi sebelum
    const jalur = DIR + '/' + bersih;
    if (!fs.existsSync(jalur)) return '';
    return '<style>\n' + fs.readFileSync(jalur, 'utf8') + '\n</style>';
  });
}

const DAFTAR = [
  { berkas: 'b1.html', judul: 'Materi', sempit: false },
  { berkas: 'dashboard.html', judul: 'Dashboard', sempit: false },
  { berkas: 'index.html', judul: 'Halaman Depan', sempit: false },
];

(async () => {
  if (!exe) { console.log('Chrome tidak ditemukan.'); process.exit(1); }
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: exe });

  for (const d of DAFTAR) {
    const jalur = DIR + '/' + d.berkas;
    if (!fs.existsSync(jalur)) { console.log('luput: ' + d.berkas); continue; }

    for (const pakaiV2 of [false, true]) {
      const page = await browser.newPage({
        viewport: { width: 1180, height: 1000 },
        deviceScaleFactor: 1,
      });
      await page.setContent(rangkai(jalur, pakaiV2), { waitUntil: 'domcontentloaded' });
      // Matikan animasi masuk supaya potret tidak menangkap elemen separuh muncul.
      await page.addStyleTag({ content: '*{animation:none !important}' });
      await page.waitForTimeout(120);

      const tag = pakaiV2 ? 'sesudah' : 'sebelum';
      const keluar = `${OUT}/${d.berkas.replace('.html', '')}-${tag}.png`;
      await page.screenshot({ path: keluar, clip: { x: 0, y: 0, width: 1180, height: 1000 } });
      console.log('potret ' + d.judul + ' (' + tag + ') -> ' + path.basename(keluar));
      await page.close();
    }
  }

  await browser.close();
  console.log('\nsemua potret siap di: ' + OUT);
})();
