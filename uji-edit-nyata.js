/* uji-edit-nyata.js — uji mode "klik ubah langsung" di browser SUNGGUHAN.
 *
 * Kenapa ini ada padahal uji-edit-langsung.sh sudah 45 lulus: uji itu menembak
 * endpoint lewat curl. Dia membuktikan servernya benar, tapi TIDAK membuktikan
 * bahwa admin bisa mengklik. Hal-hal yang hanya kelihatan di browser nyata:
 *  - klik pada paragraf benar-benar membuka kotak sunting,
 *  - tombol per blok tergambar dan bisa ditekan,
 *  - setelah menyimpan, kartu di halaman berubah TANPA memuat ulang halaman,
 *  - Esc membatalkan tanpa kehilangan isi asli,
 *  - tidak ada error JavaScript di konsol.
 *
 * Jalankan (server 8813 harus hidup):  node uji-edit-nyata.js
 */
const { buka, tunggu } = require('./cdp-mini.js');

const B = 'http://127.0.0.1:8813';
const UJIB = 92;   // Bagian uji sendiri; dihapus di akhir.
let lulus = 0, gagal = 0;
const ok = (n, b, x) => {
  if (b) { lulus++; console.log('OK   ' + n); }
  else { gagal++; console.log('BAD  ' + n + (x !== undefined ? '\n     ' + x : '')); }
};

/* Ambil blok TERDALAM yang teksnya cocok.
 * Kartu section juga sebuah .kd-blok dan textContent-nya memuat seluruh isi
 * bagian, jadi pencarian naif selalu mengembalikan section — bukan paragraf
 * yang dimaksud. Blok yang benar adalah yang tidak punya .kd-blok di dalamnya. */
const CARI = `(pola) => {
  const semua = [...document.querySelectorAll('.kd-blok')];
  return semua.filter(b => new RegExp(pola).test(b.textContent))
              .filter(b => b.querySelectorAll('.kd-blok').length === 0)[0] || null;
}`;

const MATERI = [
  '## Judul bagian uji',
  '',
  'Paragraf pertama yang tidak disentuh.',
  '',
  'Paragraf kedua yang akan diklik dan diubah.',
  '',
  ':::tips Kartu tips',
  'Isi kartunya.',
  ':::',
  '',
  '- [ ] tugas pertama',
  '- [x] tugas kedua',
  '',
  'Paragraf penutup.'
].join('\n');

(async () => {
  try { await fetch(B + '/_uji_ratereset.php'); } catch (e) {}
  try { await fetch(B + '/_uji_akun.php'); } catch (e) {}

  const br = await buka();
  try {
    /* ---------- masuk sebagai admin ---------- */
    await br.pergi(B + '/login.php');
    await br.eval(`(() => {
      document.querySelector('[name=email]').value = 'admin@demo.id';
      document.querySelector('[name=password]').value = 'demo12345';
      document.querySelector('form').submit();
    })()`);
    await tunggu(1200);
    const judul = await br.eval('document.title');
    ok('login admin berhasil', !/Masuk/i.test(judul), judul);

    /* ---------- siapkan Bagian uji lewat panel admin ---------- */
    await br.pergi(B + '/admin_materi.php?b=' + UJIB);
    await tunggu(600);
    const tersimpan = await br.eval(`(() => {
      const f = document.querySelector('form input[name=aksi][value=simpan]')
             || document.querySelector('form');
      const form = f.form || f;
      form.querySelector('[name=urutan]').value = ${UJIB};
      form.querySelector('[name=judul]').value = 'Bagian uji klik ubah';
      form.querySelector('[name=ringkas]').value = 'uji browser nyata';
      // Pindah ke tab Markdown DULU, baru isi textarea. Alasannya: handler
      // submit menimpa isi_md dari editor visual selama mode masih 'visual' —
      // mematikan editor tidak menolong, malah membuat isi terkirim kosong.
      var tab = document.querySelector('.kd-ed-tab[data-mode="markdown"]');
      if (tab) tab.click();
      form.querySelector('#isi_md').value = ${JSON.stringify(MATERI)};
      const b = form.querySelector('[name=aksi][value=simpan]');
      if (b) { b.click(); return 'klik'; }
      form.submit();
      return 'submit';
    })()`);
    await tunggu(1400);
    ok('Bagian uji tersimpan', tersimpan === 'klik' || tersimpan === 'submit', tersimpan);

    /* ---------- buka mode edit langsung ---------- */
    await br.pergi(B + '/materi.php?b=' + UJIB + '&edit=1');
    await tunggu(900);

    const awal = await br.eval(`(() => ({
      bodyKelas: document.body.className,
      jumlahBlok: document.querySelectorAll('.kd-blok').length,
      dataAda: !!(window.KD_EDIT && window.KD_EDIT.blok),
      jumlahData: window.KD_EDIT && window.KD_EDIT.blok ? window.KD_EDIT.blok.length : -1,
      alatTergambar: document.querySelectorAll('.kd-blok-alat').length,
      bilah: !!document.querySelector('.kd-edit-bilah')
    }))()`);
    ok('mode edit aktif (kd-edit-on di body)', /kd-edit-on/.test(awal.bodyKelas), awal.bodyKelas);
    // Materi uji punya 6 blok: judul, p1, p2, kartu, ceklis, p penutup.
    ok('6 blok bisa diklik tergambar', awal.jumlahBlok === 6, 'blok=' + awal.jumlahBlok);
    ok('data markdown blok terkirim ke klien', awal.dataAda && awal.jumlahData === awal.jumlahBlok,
       'data=' + awal.jumlahData + ' blok=' + awal.jumlahBlok);
    ok('bilah alat terpasang di setiap blok', awal.alatTergambar === awal.jumlahBlok,
       'alat=' + awal.alatTergambar);
    ok('bilah penanda mode edit tampil', awal.bilah);

    /* ---------- klik paragraf: kotak sunting harus terbuka ---------- */
    const klik = await br.eval(`(() => {
      const cari = ${CARI};
      const t = cari('Paragraf kedua yang akan diklik');
      if (!t) return { galat: 'blok target tidak ditemukan' };
      const p = t.querySelector('p') || t;
      p.click();
      const kotak = t.querySelector('.kd-sunting textarea');
      return {
        kotakAda: !!kotak,
        isiKotak: kotak ? kotak.value : '',
        aktif: t.classList.contains('kd-blok-aktif'),
        idx: t.dataset.blok,
        // Isi asli disembunyikan, bukan dihapus — supaya Batal tidak perlu
        // memuat ulang apa pun dari server.
        aslinyaTersembunyi: !!(t.querySelector('p') && t.querySelector('p').style.display === 'none')
      };
    })()`);
    ok('klik paragraf membuka kotak sunting', klik.kotakAda === true, JSON.stringify(klik));
    ok('kotak berisi markdown asli blok itu',
       klik.isiKotak === 'Paragraf kedua yang akan diklik dan diubah.', klik.isiKotak);
    ok('blok yang disunting ditandai aktif', klik.aktif === true);
    ok('tampilan asli disembunyikan saat menyunting', klik.aslinyaTersembunyi === true);

    /* ---------- Esc membatalkan tanpa merusak ---------- */
    const batal = await br.eval(`(() => {
      const t = document.querySelector('.kd-blok .kd-sunting')
        ? [...document.querySelectorAll('.kd-blok')].filter(b => b.querySelector(':scope > .kd-sunting'))[0]
        : null;
      if (!t) return { galat: 'tidak ada kotak sunting terbuka' };
      const ta = t.querySelector('textarea');
      ta.value = 'ini TIDAK boleh tersimpan';
      ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return {
        kotakTutup: !t.querySelector('.kd-sunting'),
        teksKembali: /Paragraf kedua yang akan diklik/.test(t.textContent),
        pTampil: !!(t.querySelector('p') && t.querySelector('p').style.display === '')
      };
    })()`);
    ok('Esc menutup kotak sunting', batal.kotakTutup === true, JSON.stringify(batal));
    ok('teks asli kembali tampil setelah batal', batal.teksKembali === true);
    ok('tampilan blok kembali normal', batal.pTampil === true);

    /* ---------- ubah sungguhan lewat tombol Simpan ---------- */
    const simpan = await br.eval(`(async () => {
      const cari = ${CARI};
      const t = cari('Paragraf kedua yang akan diklik');
      (t.querySelector('p') || t).click();
      const ta = t.querySelector('.kd-sunting textarea');
      ta.value = 'Paragraf kedua HASIL KLIK UBAH di browser.';
      const tombol = [...t.querySelectorAll('.kd-sunting button')]
        .find(b => /Simpan/i.test(b.textContent));
      tombol.click();
      // Menunggu HTML materi diganti oleh balasan server.
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 200));
        const w = document.querySelector('[data-materi-isi]');
        if (/HASIL KLIK UBAH/.test(w.textContent)) return { sukses: true, i };
        const nb = document.querySelector('.kd-sunting-nb.kd-nb-galat');
        if (nb) return { sukses: false, pesan: nb.textContent };
      }
      return { sukses: false, pesan: 'tidak berubah dalam 12 detik' };
    })()`);
    ok('simpan mengubah halaman tanpa muat ulang', simpan.sukses === true, JSON.stringify(simpan));

    const sesudah = await br.eval(`(() => {
      const w = document.querySelector('[data-materi-isi]');
      return {
        adaBaru: /HASIL KLIK UBAH/.test(w.textContent),
        // Kalimat lama diperiksa lengkap: potongan "Paragraf kedua" saja juga
        // cocok dengan kalimat BARU, dan ujinya jadi gagal palsu.
        adaLama: /Paragraf kedua yang akan diklik dan diubah/.test(w.textContent),
        // Blok lain wajib tetap ada — ini inti rancangan per-blok.
        kartuUtuh: /Kartu tips/.test(w.textContent),
        ceklisUtuh: w.querySelectorAll('ul.kd-ceklis li').length,
        pertamaUtuh: /Paragraf pertama yang tidak disentuh/.test(w.textContent),
        penutupUtuh: /Paragraf penutup/.test(w.textContent),
        // Penanda dan alat harus terpasang ulang di HTML yang baru; kalau tidak,
        // admin hanya bisa mengedit satu kali lalu halaman jadi mati.
        blokLagi: w.querySelectorAll('.kd-blok').length,
        alatLagi: w.querySelectorAll('.kd-blok-alat').length,
        dataSegar: window.KD_EDIT_INTERNAL ? window.KD_EDIT_INTERNAL.ambilBlok().length : -1,
        pagarBocor: (w.textContent.match(/:::/g) || []).length
      };
    })()`);
    ok('isi baru tampil sebagai kartu jadi', sesudah.adaBaru === true);
    ok('isi lama hilang dari halaman', sesudah.adaLama === false);
    ok('kartu tips tetap utuh', sesudah.kartuUtuh === true);
    ok('checklist tetap utuh (2 item)', sesudah.ceklisUtuh === 2, 'item=' + sesudah.ceklisUtuh);
    ok('paragraf pertama tetap utuh', sesudah.pertamaUtuh === true);
    ok('paragraf penutup tetap utuh', sesudah.penutupUtuh === true);
    ok('blok terpasang ulang setelah simpan', sesudah.blokLagi === 6, 'blok=' + sesudah.blokLagi);
    ok('bilah alat terpasang ulang', sesudah.alatLagi === sesudah.blokLagi,
       'alat=' + sesudah.alatLagi + ' blok=' + sesudah.blokLagi);
    ok('data markdown ikut disegarkan', sesudah.dataSegar === sesudah.blokLagi,
       'data=' + sesudah.dataSegar);
    ok('tidak ada pagar ::: bocor ke tampilan', sesudah.pagarBocor === 0);

    /* ---------- masih bisa diedit lagi setelah simpan ---------- */
    const lagi = await br.eval(`(() => {
      const cari = ${CARI};
      const t = cari('HASIL KLIK UBAH');
      (t.querySelector('p') || t).click();
      const ta = t.querySelector('.kd-sunting textarea');
      return { kotakAda: !!ta, isi: ta ? ta.value : '' };
    })()`);
    ok('blok bisa diedit lagi setelah simpan pertama', lagi.kotakAda === true);
    ok('kotak kedua berisi markdown yang BARU',
       lagi.isi === 'Paragraf kedua HASIL KLIK UBAH di browser.', lagi.isi);

    /* ---------- menu tambah blok ---------- */
    const menu = await br.eval(`(() => {
      const t = document.querySelector('.kd-blok');
      const b = [...t.querySelectorAll('.kd-blok-alat button')]
        .find(x => x.dataset.alat === 'tambah');
      if (!b) return { galat: 'tombol tambah tidak ada' };
      b.click();
      const m = document.querySelector('.kd-tambah-menu');
      return {
        menuAda: !!m,
        jumlahPilihan: m ? m.querySelectorAll('button').length : 0,
        adaIndonesia: m ? /Kartu berwarna/.test(m.textContent) : false,
        diViewport: m ? (m.getBoundingClientRect().left >= 0) : false
      };
    })()`);
    ok('tombol tambah membuka menu jenis blok', menu.menuAda === true, JSON.stringify(menu));
    ok('menu berisi 13 jenis blok', menu.jumlahPilihan === 13, 'pilihan=' + menu.jumlahPilihan);
    ok('nama jenis pakai Bahasa Indonesia', menu.adaIndonesia === true);
    ok('menu tidak keluar dari layar', menu.diViewport === true);

    /* ---------- halaman member: tidak boleh ada jejak mode edit ---------- */
    await br.pergi(B + '/materi.php?b=' + UJIB);
    await tunggu(700);
    const baca = await br.eval(`(() => ({
      bodyKelas: document.body.className,
      alat: document.querySelectorAll('.kd-blok-alat').length,
      penanda: document.querySelectorAll('[data-blok]').length,
      kdEdit: typeof window.KD_EDIT,
      skrip: [...document.scripts].filter(s => /edit-langsung/.test(s.src)).length,
      kartuTampil: document.querySelectorAll('.kd-callout').length
    }))()`);
    ok('mode baca tidak memakai kd-edit-on', !/kd-edit-on/.test(baca.bodyKelas), baca.bodyKelas);
    ok('tidak ada bilah alat di mode baca', baca.alat === 0, 'alat=' + baca.alat);
    ok('tidak ada penanda data-blok di mode baca', baca.penanda === 0, 'penanda=' + baca.penanda);
    ok('skrip edit tidak dimuat di mode baca', baca.skrip === 0 && baca.kdEdit === 'undefined',
       'skrip=' + baca.skrip + ' KD_EDIT=' + baca.kdEdit);
    ok('kartu tetap tampil normal untuk pembaca', baca.kartuTampil >= 1,
       'kartu=' + baca.kartuTampil);

    /* ---------- konsol bersih ---------- */
    // favicon dan ERR_ jaringan bukan error app; disaring supaya uji tidak
    // gagal karena hal yang tidak bisa diperbaiki.
    const galat = br.galat.filter((g) => !/favicon|net::ERR_/i.test(g));
    ok('tidak ada error JavaScript di seluruh alur', galat.length === 0, galat.join('\n     '));

    /* ---------- bersihkan Bagian uji ---------- */
    // Kalau tidak dihapus, Bagian 92 muncul di dashboard member sebagai materi
    // nyata. Uji tidak boleh meninggalkan sampah yang terlihat pembeli.
    // Form hapus ada di halaman EDIT Bagian itu (admin_materi.php?b=N),
    // bukan di daftar — daftar hanya punya tautan Edit/Lihat.
    await br.pergi(B + '/admin_materi.php?b=' + UJIB);
    await tunggu(700);
    const bersih = await br.eval(`(() => {
      const f = [...document.querySelectorAll('form')]
        .find(x => x.querySelector('[name=aksi][value=hapus]'));
      if (!f) return 'form hapus tidak ditemukan';
      // data-konfirmasi dilepas: app.js memasang confirm() yang menggantung
      // browser tanpa antarmuka.
      f.removeAttribute('data-konfirmasi');
      f.submit();
      return 'dikirim';
    })()`);
    await tunggu(1400);
    await br.pergi(B + '/admin_materi.php');
    await tunggu(700);
    const sisa = await br.eval(`document.body.textContent.includes('Bagian uji klik ubah')`);
    ok('Bagian uji ' + UJIB + ' sudah dihapus', sisa === false, 'bersih=' + bersih);

  } finally {
    br.tutup();
  }

  console.log('\n-----\nLULUS=' + lulus + ' GAGAL=' + gagal);
  process.exit(gagal > 0 ? 1 : 0);
})().catch(e => {
  console.log('BAD  uji berhenti: ' + (e && e.stack || e));
  process.exit(1);
});
