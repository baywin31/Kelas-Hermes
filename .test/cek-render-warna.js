// cek-render-warna.js — buktikan warna baru benar-benar dipakai saat halaman
// dirender (bukan cuma ada di file CSS). jsdom + getComputedStyle.
const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('C:/Users/user/apps/karyawan-digital-html/index.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
const { window } = dom;

setTimeout(() => {
  const doc = window.document;
  const cs = (el) => window.getComputedStyle(el);
  let lulus = 0, gagal = 0;
  const cek = (nama, dapat, harap) => {
    const ok = String(dapat).toLowerCase().replace(/\s/g, '') === harap.toLowerCase().replace(/\s/g, '');
    console.log(`  ${ok ? 'ok  ' : 'GAGAL'} ${nama}: ${dapat}`);
    ok ? lulus++ : gagal++;
  };

  const akar = doc.documentElement;
  const v = (n) => cs(akar).getPropertyValue(n).trim();
  cek('--bg', v('--bg'), '#25282b');
  cek('--accent', v('--accent'), '#A4D8FF');
  cek('--on-accent', v('--on-accent'), '#22262a');

  // jsdom tidak menyelesaikan var() di properti biasa (nilainya jadi
  // transparan), jadi periksa dulu batas itu supaya hasil uji tidak menyesatkan.
  const uji = doc.createElement('div');
  uji.style.cssText = 'background:var(--accent)';
  doc.body.appendChild(uji);
  const varJalan = cs(uji).backgroundColor === 'rgb(164, 216, 255)';
  console.log(`  info  jsdom menyelesaikan var(): ${varJalan ? 'ya' : 'tidak'}`);
  uji.remove();

  if (varJalan) {
    cek('body background', cs(doc.body).backgroundColor, 'rgb(37, 40, 43)');
  } else {
    // Verifikasi lewat aturan CSS: body harus merujuk var(--bg), dan --bg
    // sudah dipastikan #25282b di atas.
    const teksCss = [...doc.querySelectorAll('style')].map(s => s.textContent).join('\n');
    const bodyRujukBg = /body\{[^}]*background:\s*var\(--bg\)/.test(teksCss.replace(/\s*\n\s*/g, ''));
    cek('body merujuk var(--bg)', bodyRujukBg, 'true');
  }

  // tombol utama: latar biru langit, teks gelap
  window.location.hash = '#/redeem';
  setTimeout(() => {
    const btn = doc.querySelector('.btn');
    if (btn) {
      const s = cs(btn);
      if (varJalan) cek('tombol .btn latar', s.backgroundColor, 'rgb(164, 216, 255)');
      else {
        const teksCss = [...doc.querySelectorAll('style')].map(x => x.textContent).join('');
        cek('.btn merujuk var(--accent)', /\.btn\{[^}]*background:var\(--accent\)/.test(teksCss.replace(/\s*\n\s*/g, '')), 'true');
      }
      cek('tombol .btn teks gelap', s.color, 'rgb(34, 38, 42)');
    } else { console.log('  GAGAL tombol .btn tidak ditemukan'); gagal++; }
    console.log(`\n=== render: ${lulus} lulus, ${gagal} gagal ===`);
    process.exit(gagal === 0 ? 0 : 1);
  }, 400);
}, 700);
