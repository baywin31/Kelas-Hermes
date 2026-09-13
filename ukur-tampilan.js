/* ukur-tampilan.js — ukur gaya yang BENAR-BENAR dihitung browser untuk halaman
   pratinjau, TANPA perlu server.

   Kenapa tanpa server: halaman pratinjau ada sebagai berkas di disk, dan
   Playwright bisa memuatnya langsung lewat setContent(). Sebelumnya diukur
   lewat `php -S`, tapi server bawaan PHP melayani satu permintaan sekaligus —
   browser membuka beberapa koneksi untuk CSS/JS, server tersangkut menunggu
   dirinya sendiri, dan browser menyerah dengan "timeout" padahal halamannya
   sehat. Itu kegagalan alat, bukan kegagalan halaman.

   Kenapa diukur sama sekali: CSS yang gagal dimuat atau kalah kekhususan
   tidak memunculkan error apa pun — halaman cuma tampil polos. Satu-satunya
   bukti yang bisa dipercaya adalah nilai hasil hitungan browser. */
const fs = require('fs');
const { chromium } = require('playwright-core');

const APP = 'C:/Users/user/apps/karyawan-digital-php';
const DIR = APP + '/pratinjau';
const HAL = ['b1', 'b2', 'b3', 'b4'];

function cariBrowser() {
  const kandidat = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    process.env.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  ];
  const pw = process.env.LOCALAPPDATA + '/ms-playwright';
  if (fs.existsSync(pw)) {
    fs.readdirSync(pw).filter((d) => d.startsWith('chromium-')).forEach((d) => {
      ['chrome-win/chrome.exe', 'chrome-win64/chrome.exe'].forEach((x) =>
        kandidat.push(pw + '/' + d + '/' + x));
    });
  }
  return kandidat.find((p) => fs.existsSync(p));
}

/* Ganti setiap <link rel=stylesheet> dengan isi berkasnya, supaya halaman
   berdiri sendiri: nol permintaan jaringan, nol risiko aset gagal dimuat. */
function inlineCss(html) {
  return html.replace(/<link[^>]+href=["']([^"']+\.css)(?:\?v=\d+)?["'][^>]*>/gi, (m, href) => {
    const jalur = DIR + '/' + href.split('/').pop();
    if (!fs.existsSync(jalur)) return '<!-- ' + href + ' tidak ada -->';
    return '<style data-dari="' + href + '">\n' + fs.readFileSync(jalur, 'utf8') + '\n</style>';
  });
}

let lulus = 0, gagal = 0;
const ok = (n, x) => { lulus++; console.log('  LULUS  ' + n + (x ? '  ' + x : '')); };
const no = (n, x) => { gagal++; console.log('  GAGAL  ' + n + (x ? '  ' + x : '')); };

(async () => {
  const exe = cariBrowser();
  if (!exe) {
    // Dilewati, bukan gagal: mesin tanpa Chromium tetap bisa menjalankan
    // rangkaian uji lainnya. Yang tidak boleh adalah melaporkan "gagal"
    // padahal alatnya saja yang tidak ada.
    console.log('DILEWATI (Chromium/Chrome tidak ada di mesin ini)');
    process.exit(0);
  }
  console.log('browser: ' + exe + '\n');

  const browser = await chromium.launch({ executablePath: exe });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  for (const nama of HAL) {
    const berkas = DIR + '/' + nama + '.html';
    if (!fs.existsSync(berkas)) continue;
    const html = inlineCss(fs.readFileSync(berkas, 'utf8'));
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    console.log('### ' + nama + '.html');

    /* 1. Lapisan v2 termuat? Ditandai latar body berlapis banyak gradien. */
    const latar = await page.evaluate(() => getComputedStyle(document.body).backgroundImage);
    const jml = (latar.match(/radial-gradient/g) || []).length;
    jml >= 3 ? ok('latar berlapis aktif', jml + ' lapis cahaya') : no('latar berlapis TIDAK aktif', jml + ' lapis');

    /* 2. Tepi bercahaya di kartu (inset highlight). */
    const bayang = await page.evaluate(() => {
      const c = document.querySelector('.card');
      return c ? getComputedStyle(c).boxShadow : '';
    });
    /inset/.test(bayang) ? ok('kartu punya tepi bercahaya') : no('kartu tanpa tepi bercahaya');

    /* 3. Ruang dalam kartu lega (gaya lama 22px). */
    const pad = await page.evaluate(() => {
      const c = document.querySelector('.card');
      return c ? parseInt(getComputedStyle(c).paddingTop) : 0;
    });
    pad >= 24 ? ok('ruang dalam kartu lega', pad + 'px') : no('padding kartu masih sempit', pad + 'px');

    /* 4. Isi materi TIDAK berubah ukuran hurufnya (janji: isi tidak disentuh).
          Yang diukur `.isi-materi` — itulah isi materi (15.5px dari
          style.css). JANGAN pakai `.card p`: kartu bisa saja hanya memuat
          teks kecil seperti label "Bagian 1 dari 4" (12px), sehingga alat ukur
          melaporkan "isi berubah" padahal isi materi tidak tersentuh. */
    const isi = await page.evaluate(() => {
      const m = document.querySelector('.isi-materi');
      if (!m) return null;
      const p = m.querySelector('p');
      const s = getComputedStyle(m);
      return { px: s.fontSize, lh: s.lineHeight, paragraf: p ? getComputedStyle(p).fontSize : '-' };
    });
    if (!isi) console.log('  (tidak ada isi materi di halaman ini — dilewati)');
    else if (isi.px === '15.5px') ok('ukuran huruf isi materi tetap', isi.px + ' / baris ' + isi.lh);
    else no('ukuran huruf isi materi BERUBAH', isi.px + ' (harus 15.5px)');

    /* 5. Gerak masuk aktif. Diperiksa di seluruh dokumen: struktur tiap
          halaman berbeda, yang penting animasinya benar-benar terpasang. */
    const anim = await page.evaluate(() =>
      [...document.querySelectorAll('*')]
        .filter((el) => getComputedStyle(el).animationName.includes('kd-masuk')).length);
    anim > 0 ? ok('gerak masuk halus aktif', anim + ' elemen') : no('gerak masuk tidak aktif');

    /* 6. Tidak ada batang gulir horizontal (kerusakan tata letak paling umum). */
    const luber = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    luber <= 1 ? ok('tidak ada luber horizontal', luber + 'px') : no('LEBAR LUBER', luber + 'px');
    console.log('');
  }

  /* --- Halaman depan: hero (perlu server aplikasi karena ini berkas PHP) --- */
  console.log('### halaman depan (hero + menu aktif)');
  const http = require('http');
  const ambil = (j) => new Promise((r) => {
    const req = http.get({ host: '127.0.0.1', port: 8813, path: j }, (res) => {
      let d = ''; res.on('data', (c) => (d += c)); res.on('end', () => r({ kode: res.statusCode, html: d }));
    });
    req.on('error', () => r({ kode: 0, html: '' }));
    req.setTimeout(6000, () => { req.destroy(); r({ kode: 0, html: '' }); });
  });

  const depan = await ambil('/index.php');
  if (!depan.html) {
    console.log('  (server 8813 mati — halaman depan dilewati)');
  } else {
    await page.setContent(inlineCss(depan.html), { waitUntil: 'domcontentloaded' });
    const judul = await page.evaluate(() => {
      const h = document.querySelector('.hero h1');
      if (!h) return null;
      const s = getComputedStyle(h);
      return { px: s.fontSize, clip: s.webkitBackgroundClip || s.backgroundClip, latar: s.backgroundImage.slice(0, 60) };
    });
    if (!judul) no('judul hero tidak ketemu');
    else {
      parseInt(judul.px) >= 46 ? ok('judul hero lebih besar', judul.px) : no('judul hero belum dinaikkan', judul.px);
      /text/.test(judul.clip) ? ok('judul hero bergradasi') : no('judul hero tanpa gradasi', judul.clip);
    }
    const glow = await page.evaluate(() => {
      const h = document.querySelector('.hero');
      if (!h) return '';
      return getComputedStyle(h, '::before').backgroundImage || '';
    });
    /gradient/.test(glow) ? ok('cahaya di belakang hero aktif') : no('cahaya hero tidak aktif');
  }

  await browser.close();
  console.log('-----');
  console.log('LULUS=' + lulus + ' GAGAL=' + gagal);
  process.exit(gagal === 0 ? 0 : 1);
})();
