/* ukur-edit-tampilan.js — ukur TAMPILAN mode klik-ubah di browser nyata.
 *
 * Kenapa terpisah dari uji-edit-nyata.js: berkas itu memeriksa fungsi (klik,
 * simpan, urutan). Berkas ini memeriksa hal yang bikin fitur terasa jelek atau
 * enak: ukuran tombol untuk jempol, kontras teks, dan apakah bilah alat
 * benar-benar terlihat saat kursor di atas blok. Angka-angka ini yang biasanya
 * dilewatkan kalau hanya "kelihatannya sudah jalan".
 *
 * Jalankan: node ukur-edit-tampilan.js
 */
const { buka, tunggu } = require('./cdp-mini.js');

const B = 'http://127.0.0.1:8813';
const UJIB = 93;
let lulus = 0, gagal = 0;
const ok = (n, b, x) => {
  if (b) { lulus++; console.log('OK   ' + n); }
  else { gagal++; console.log('BAD  ' + n + (x !== undefined ? '\n     ' + x : '')); }
};

// Kontras WCAG. Dipakai untuk membuktikan teks kotak sunting terbaca, bukan
// sekadar "kelihatan gelap-gelapan".
//
// Catatan penting: warna di app ini banyak yang semi-transparan
// (rgba(164,216,255,.1)). getComputedStyle mengembalikan nilai rgba apa adanya,
// jadi kalau alpha diabaikan hasilnya salah total — bilah aksen tipis di atas
// latar gelap terbaca sebagai "biru muda di atas biru muda" (rasio 1.07)
// padahal di mata manusia itu abu-abu gelap. Karena itu warna dikomposit dulu
// di sisi browser lewat WARNA (di bawah), dan Node hanya menghitung rasio.
function lum(rgb) {
  const c = rgb.map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function rasio(a, b) {
  const l1 = lum(a), l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
/* Fungsi yang disuntikkan ke browser: cari latar EFEKTIF sebuah elemen dengan
 * menumpuk warna semi-transparan dari elemen itu ke atas sampai ketemu warna
 * yang benar-benar buram. Ini yang dilihat mata, dan ini yang harus diukur. */
const WARNA = `
const _p = (s) => { const m = String(s).match(/[\\d.]+/g) || [0,0,0];
  return { r:+m[0], g:+m[1], b:+m[2], a: m[3] !== undefined ? +m[3] : 1 }; };
const _atas = (f, b) => ({
  r: Math.round(f.r * f.a + b.r * (1 - f.a)),
  g: Math.round(f.g * f.a + b.g * (1 - f.a)),
  b: Math.round(f.b * f.a + b.b * (1 - f.a)), a: 1 });
const bgEfektif = (n) => {
  let hasil = { r:0, g:0, b:0, a:0 };
  const tumpuk = [];
  for (let e = n; e && e.nodeType === 1; e = e.parentElement) {
    const c = _p(getComputedStyle(e).backgroundColor);
    if (c.a > 0) tumpuk.push(c);
    if (c.a >= 1) break;
  }
  hasil = tumpuk.pop() || { r:37, g:40, b:43, a:1 };
  while (tumpuk.length) hasil = _atas(tumpuk.pop(), hasil);
  return [hasil.r, hasil.g, hasil.b];
};
const fgEfektif = (n) => {
  const c = _p(getComputedStyle(n).color);
  const bg = bgEfektif(n);
  const o = _atas(c, { r:bg[0], g:bg[1], b:bg[2], a:1 });
  return [o.r, o.g, o.b];
};
`;

function parse(s) {
  const m = String(s).match(/(\d+(?:\.\d+)?)/g);
  return m ? m.slice(0, 3).map(Number) : [0, 0, 0];
}

const MATERI = [
  '## Judul uji tampilan',
  '',
  'Paragraf yang akan diklik untuk mengukur tampilan kotak sunting.',
  '',
  ':::tips Kartu',
  'Isi kartu.',
  ':::'
].join('\n');

(async () => {
  try { await fetch(B + '/_uji_ratereset.php'); } catch (e) {}
  const br = await buka();
  try {
    await br.pergi(B + '/login.php');
    await br.eval(`(() => {
      document.querySelector('[name=email]').value = 'admin@demo.id';
      document.querySelector('[name=password]').value = 'demo12345';
      document.querySelector('form').submit();
    })()`);
    await tunggu(1200);

    await br.pergi(B + '/admin_materi.php?b=' + UJIB);
    await tunggu(700);
    await br.eval(`(() => {
      const form = document.querySelector('form');
      form.querySelector('[name=urutan]').value = ${UJIB};
      form.querySelector('[name=judul]').value = 'Bagian uji tampilan';
      form.querySelector('[name=ringkas]').value = 'ukur tampilan';
      const tab = document.querySelector('.kd-ed-tab[data-mode="markdown"]');
      if (tab) tab.click();
      form.querySelector('#isi_md').value = ${JSON.stringify(MATERI)};
      form.querySelector('[name=aksi][value=simpan]').click();
    })()`);
    await tunggu(1400);

    await br.pergi(B + '/materi.php?b=' + UJIB + '&edit=1');
    await tunggu(900);

    /* ---------- bilah alat: ukuran & keterlihatan ---------- */
    const alat = await br.eval(`(async () => {
      ${WARNA}
      const blok = [...document.querySelectorAll('.kd-blok')]
        .filter(b => b.querySelectorAll('.kd-blok').length === 0);
      const t = blok.find(b => /Paragraf yang akan diklik/.test(b.textContent));
      const bar = t.querySelector('.kd-blok-alat');
      // Bilah alat disembunyikan sampai kursor di atas blok. CDP tidak
      // menggerakkan mouse fisik, jadi keterlihatannya dibuktikan lewat jalur
      // yang juga dipakai pengguna keyboard: fokus ke tombol di dalamnya
      // (:focus-within). Kalau ini gagal, pengguna keyboard memang tidak bisa
      // memakai fitur ini sama sekali.
      // Bilah memakai transition opacity .12s, dan menunggu transisi selesai
      // ternyata tidak dapat diandalkan di headless (uji sempat merah-hijau
      // tanpa perubahan kode: kadang compositor tidak pernah menjalankan
      // transisinya sama sekali, jadi nilai computed tersangkut di 0).
      // Transisi dimatikan dulu supaya yang terbaca adalah nilai TUJUAN —
      // itulah yang menentukan bilahnya kelihatan atau tidak.
      bar.querySelector('button').focus();
      bar.style.transition = 'none';
      const op = getComputedStyle(bar).opacity;
      const g = getComputedStyle(bar);
      const tombol = [...bar.querySelectorAll('button')].map(b => {
        const r = b.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height),
                 judul: b.title || '', bg: bgEfektif(b), fg: fgEfektif(b) };
      });
      return {
        jumlah: tombol.length,
        tampil: op,
        fokusWithin: t.matches(':focus-within'),
        aktif: document.activeElement ? document.activeElement.className : 'null',
        indukBar: bar.parentElement === t,
        tombol: tombol,
        blokPosisi: getComputedStyle(t).position
      };
    })()`);
    ok('setiap blok punya 5 tombol alat', alat.jumlah === 5, 'jumlah=' + alat.jumlah);
    ok('bilah alat muncul saat tombolnya difokus (bisa dipakai tanpa mouse)',
       parseFloat(alat.tampil) === 1,
       'opacity=' + alat.tampil + ' focusWithin=' + alat.fokusWithin
       + ' aktif=' + alat.aktif + ' indukBar=' + alat.indukBar);
    ok('blok jadi acuan posisi bilah alat', alat.blokPosisi === 'relative', alat.blokPosisi);
    const kecil = alat.tombol.filter(t => t.w < 28 || t.h < 28);
    ok('semua tombol alat minimal 28x28 px (bisa ditekan jempol)', kecil.length === 0,
       JSON.stringify(kecil));
    const tanpaJudul = alat.tombol.filter(t => !t.judul);
    ok('setiap tombol punya keterangan title (bukan simbol misterius)',
       tanpaJudul.length === 0, JSON.stringify(tanpaJudul.length));
    const kTombol = alat.tombol.map(t => rasio(t.fg, t.bg));
    const buruk = kTombol.filter(r => r < 4.5);
    ok('ikon tombol alat kontras >= 4.5', buruk.length === 0,
       kTombol.map(r => r.toFixed(2)).join(' '));

    /* ---------- kotak sunting: ukuran & kontras ---------- */
    const kotak = await br.eval(`(() => {
      ${WARNA}
      const blok = [...document.querySelectorAll('.kd-blok')]
        .filter(b => b.querySelectorAll('.kd-blok').length === 0);
      const t = blok.find(b => /Paragraf yang akan diklik/.test(b.textContent));
      (t.querySelector('p') || t).click();
      const ta = t.querySelector('.kd-sunting textarea');
      const r = ta.getBoundingClientRect();
      const s = getComputedStyle(ta);
      const tombol = [...t.querySelectorAll('.kd-sunting button')].map(b => {
        const br2 = b.getBoundingClientRect();
        const sb = getComputedStyle(b);
        return { teks: b.textContent.trim(), w: Math.round(br2.width),
                 h: Math.round(br2.height), bg: bgEfektif(b), fg: fgEfektif(b) };
      });
      const bantu = t.querySelector('.kd-sunting .kd-sunting-nb');
      return {
        lebar: Math.round(r.width), tinggi: Math.round(r.height),
        fontPx: parseFloat(s.fontSize), mono: /mono|consol|courier/i.test(s.fontFamily),
        bg: bgEfektif(ta), fg: fgEfektif(ta),
        fokus: document.activeElement === ta,
        tombol: tombol,
        adaBantuan: !!bantu,
        teksBantuan: bantu ? bantu.textContent.trim().slice(0, 60) : ''
      };
    })()`);
    ok('kotak sunting cukup lebar (>= 300px)', kotak.lebar >= 300, 'lebar=' + kotak.lebar);
    ok('kotak sunting cukup tinggi (>= 70px)', kotak.tinggi >= 70, 'tinggi=' + kotak.tinggi);
    ok('ukuran huruf kotak sunting >= 14px (tidak bikin sipit)', kotak.fontPx >= 14,
       'font=' + kotak.fontPx);
    ok('kotak sunting pakai huruf monospace (markdown sejajar)', kotak.mono === true);
    const kIsi = rasio(kotak.fg, kotak.bg);
    ok('teks kotak sunting kontras >= 7 (nyaman untuk teks panjang)', kIsi >= 7,
       'rasio=' + kIsi.toFixed(2));
    ok('kursor langsung berada di kotak (tidak perlu klik dua kali)', kotak.fokus === true);
    ok('ada tombol Simpan dan Batal', kotak.tombol.length >= 2,
       JSON.stringify(kotak.tombol.map(t => t.teks)));
    const tKecil = kotak.tombol.filter(t => t.h < 32);
    ok('tombol Simpan/Batal tinggi >= 32px', tKecil.length === 0, JSON.stringify(tKecil));
    const kAksi = kotak.tombol.map(t => rasio(t.fg, t.bg));
    ok('tombol Simpan/Batal kontras >= 4.5', kAksi.every(r => r >= 4.5),
       kAksi.map(r => r.toFixed(2)).join(' '));
    ok('ada baris bantuan di bawah kotak', kotak.adaBantuan === true, kotak.teksBantuan);

    /* ---------- bilah mode edit tidak menutupi isi ---------- */
    const bilah = await br.eval(`(() => {
      ${WARNA}
      const b = document.querySelector('.kd-edit-bilah');
      const r = b.getBoundingClientRect();
      const s = getComputedStyle(b);
      const teks = b.querySelector('p') || b;
      const kartu = document.querySelector('[data-materi-isi] .kd-blok');
      const rk = kartu ? kartu.getBoundingClientRect() : null;
      return {
        tinggi: Math.round(r.height), posisi: s.position,
        z: s.zIndex, bg: bgEfektif(teks), fg: fgEfektif(teks),
        adaTombolKeluar: /Selesai|Keluar/i.test(b.textContent),
        // Bilah menempel di atas; isi pertama tidak boleh tertutup olehnya.
        tumpangTindih: rk ? (rk.top < r.bottom && rk.bottom > r.top) : false
      };
    })()`);
    ok('bilah mode edit menempel (sticky/fixed)', /sticky|fixed/.test(bilah.posisi),
       bilah.posisi);
    ok('bilah punya tombol keluar dari mode edit', bilah.adaTombolKeluar === true);
    const kBilah = rasio(bilah.fg, bilah.bg);
    ok('teks bilah kontras >= 4.5', kBilah >= 4.5, 'rasio=' + kBilah.toFixed(2));
    ok('bilah tidak menimpa isi materi', bilah.tumpangTindih === false);

    /* ---------- palet wajib dipatuhi ---------- */
    const palet = await br.eval(`(() => {
      const s = getComputedStyle(document.documentElement);
      const aksen = s.getPropertyValue('--accent').trim();
      const bar = document.querySelector('.kd-blok-alat');
      const t = document.querySelector('.kd-blok.kd-blok-aktif');
      return {
        aksen: aksen,
        garisAktif: t ? getComputedStyle(t).outlineColor || getComputedStyle(t).borderColor : '',
        adaWarnaAsing: /#(?!A4D8FF|BFE4FF|8CCBFA)[0-9a-f]{6}/i.test(bar ? bar.style.cssText : '')
      };
    })()`);
    ok('token warna aksen tetap #A4D8FF', /A4D8FF/i.test(palet.aksen), palet.aksen);
    ok('tidak ada warna asing ditulis inline di bilah alat', palet.adaWarnaAsing === false);

    const galat = br.galat.filter(g => !/favicon|net::ERR_/i.test(g));
    ok('tidak ada error JavaScript', galat.length === 0, galat.join('\n     '));

    /* ---------- bersihkan ---------- */
    await br.pergi(B + '/admin_materi.php?b=' + UJIB);
    await tunggu(700);
    await br.eval(`(() => {
      const f = [...document.querySelectorAll('form')]
        .find(x => x.querySelector('[name=aksi][value=hapus]'));
      if (f) { f.removeAttribute('data-konfirmasi'); f.submit(); }
    })()`);
    await tunggu(1200);
    await br.pergi(B + '/admin_materi.php');
    await tunggu(600);
    const sisa = await br.eval(`document.body.textContent.includes('Bagian uji tampilan')`);
    ok('Bagian uji ' + UJIB + ' sudah dihapus', sisa === false);
  } finally {
    br.tutup();
  }
  console.log('\n-----\nLULUS=' + lulus + ' GAGAL=' + gagal);
  process.exit(gagal > 0 ? 1 : 0);
})().catch(e => {
  console.log('BAD  uji berhenti: ' + (e && e.stack || e));
  process.exit(1);
});
