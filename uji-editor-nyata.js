/* uji-editor-nyata.js — uji TinyMCE di browser SUNGGUHAN.
 *
 * Kenapa ini ada, padahal uji-editor-dom.js sudah 56 lulus: uji itu memakai
 * TinyMCE TIRUAN. Dia membuktikan logika app benar, tapi tidak membuktikan
 * TinyMCE-nya sendiri mau jalan — skin ketemu, plugin termuat, toolbar tergambar,
 * tidak ada spanduk lisensi, ikon tidak jadi kotak "!". Hal-hal itu hanya
 * kelihatan kalau editornya benar-benar dijalankan.
 *
 * Jalankan (server 8813 harus hidup):  node uji-editor-nyata.js
 */
const { buka, tunggu } = require('./cdp-mini.js');

const B = 'http://127.0.0.1:8813';
let lulus = 0, gagal = 0;
const ok = (n, b, x) => {
  if (b) { lulus++; console.log('OK   ' + n); }
  else { gagal++; console.log('BAD  ' + n + (x !== undefined ? '\n     ' + x : '')); }
};

(async () => {
  // Rate limit login lokal hanya 8 percobaan per email. Uji sebelumnya sering
  // menghabiskannya, dan gejalanya menyesatkan: pesan yang muncul
  // "Email atau password salah" padahal sandinya benar. Jadi kosongkan dulu.
  try { await fetch(B + '/_uji_ratereset.php'); } catch (e) {}
  try { await fetch(B + '/_uji_akun.php'); } catch (e) {}

  const br = await buka();
  try {
    /* ---------- masuk sebagai admin ---------- */
    await br.pergi(B + '/login.php');
    await br.eval(`(() => {
      document.querySelector('[name=email]').value = 'admin@demo.id';
      document.querySelector('[name=password]').value  = 'demo12345';
      document.querySelector('form').submit();
    })()`);
    await tunggu(1200);

    const judul = await br.eval('document.title');
    ok('login admin berhasil', !/Masuk/i.test(judul), judul);

    /* ---------- buka editor materi Bagian 1 ---------- */
    await br.pergi(B + '/admin_materi.php?b=1');
    // TinyMCE menyiapkan iframe secara asinkron; tunggu sampai instance siap.
    const siap = await br.eval(`(async () => {
      for (let i = 0; i < 80; i++) {
        if (window.KD_ED && document.querySelector('.tox-tinymce')) return 'siap';
        await new Promise(r => setTimeout(r, 250));
      }
      return 'tidak siap: tinymce=' + (typeof window.tinymce)
           + ' KD_ED=' + (typeof window.KD_ED);
    })()`);
    ok('TinyMCE benar-benar hidup di halaman', siap === 'siap', siap);

    /* ---------- yang tidak bisa dilihat uji jsdom ---------- */
    const info = await br.eval(`(() => {
      const kotak = document.querySelector('.tox-tinymce');
      const bar   = document.querySelector('.tox-toolbar__primary, .tox-toolbar');
      const iframe = document.querySelector('iframe.tox-edit-area__iframe');
      const doc = iframe && iframe.contentDocument;
      const skinCss = [...document.styleSheets].map(s => s.href || '').filter(h => /skin/.test(h));
      return {
        tinggi: kotak ? Math.round(kotak.getBoundingClientRect().height) : 0,
        lebar:  kotak ? Math.round(kotak.getBoundingClientRect().width) : 0,
        jumlahTombol: bar ? bar.querySelectorAll('button, .tox-tbtn').length : 0,
        ikonRusak: bar ? bar.querySelectorAll('svg:empty').length : -1,
        promo: document.querySelectorAll('.tox-promotion, .tox-notification--warn').length,
        statusbar: !!document.querySelector('.tox-statusbar__branding'),
        iframeAda: !!iframe,
        bgEditor: doc ? getComputedStyle(doc.body).backgroundColor : '',
        fgEditor: doc ? getComputedStyle(doc.body).color : '',
        isiAwal: doc ? (doc.body.innerHTML || '').slice(0, 300) : '',
        jumlahKartu: doc ? doc.querySelectorAll('.kd-kartu').length : -1,
        jumlahCeklis: doc ? doc.querySelectorAll('ul.kd-ceklis li').length : -1,
        skinTermuat: skinCss.length,
        taTampil: getComputedStyle(document.getElementById('isi_md')).display
      };
    })()`);

    ok('editor punya ukuran nyata (bukan 0px)', info.tinggi > 300 && info.lebar > 300,
      info.lebar + 'x' + info.tinggi);
    ok('toolbar tergambar dengan banyak tombol', info.jumlahTombol >= 15, info.jumlahTombol);
    ok('tidak ada ikon kosong/rusak di toolbar', info.ikonRusak === 0, info.ikonRusak);
    ok('tidak ada spanduk promo/peringatan lisensi', info.promo === 0, info.promo);
    ok('branding "Build with TinyMCE" tidak tampil', !info.statusbar);
    ok('skin CSS termuat dari folder lokal', info.skinTermuat > 0, info.skinTermuat);
    ok('iframe isi editor ada', info.iframeAda);
    ok('tema gelap masuk ke dalam iframe',
      info.bgEditor === 'rgb(37, 40, 43)' || info.bgEditor === 'rgba(0, 0, 0, 0)',
      info.bgEditor);
    ok('warna teks di editor terang', /rgb\(2[0-9][0-9]|rgb\(24[0-9]/.test(info.fgEditor),
      info.fgEditor);
    ok('materi Bagian 1 termuat sebagai HTML', /<h3|<p/i.test(info.isiAwal),
      info.isiAwal.slice(0, 120));
    ok('kartu ::: tampil sebagai kartu, bukan teks pagar', info.jumlahKartu > 0, info.jumlahKartu);
    ok('checklist tampil sebagai daftar', info.jumlahCeklis > 0, info.jumlahCeklis);
    ok('textarea markdown disembunyikan saat mode visual', info.taTampil === 'none', info.taTampil);

    /* ---------- pagar ::: tidak boleh terbaca sebagai teks ---------- */
    const adaPagar = await br.eval(`(() => {
      const d = document.querySelector('iframe.tox-edit-area__iframe').contentDocument;
      return (d.body.textContent.match(/:::/g) || []).length;
    })()`);
    ok('tidak ada pagar ::: mentah yang terlihat admin', adaPagar === 0, adaPagar);

    /* ---------- edit lalu simpan: bukti kerja tidak hilang ---------- */
    const stempel = 'UJI-NYATA-' + Date.now();
    await br.eval(`(() => {
      const ed = window.KD_ED;
      ed.setContent(ed.getContent() + '<p>${stempel}</p>');
      return true;
    })()`);

    const mdSebelum = await br.eval(`(() => {
      // Paksa sinkronisasi seperti yang terjadi saat submit.
      document.querySelector('form').dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }));
      return document.getElementById('isi_md').value;
    })()`);
    ok('isi editor pindah ke textarea saat submit', mdSebelum.indexOf(stempel) !== -1,
      mdSebelum.slice(-150));
    ok('markdown hasil sinkronisasi bersih dari tag HTML',
      !/<(div|p|h3|ul|li|span)\b/i.test(mdSebelum), (mdSebelum.match(/<[a-z]+/gi) || []).join(' '));
    ok('kartu tetap jadi pagar ::: di markdown', /^:::[a-z]+ /m.test(mdSebelum));
    ok('checklist tetap jadi - [ ]', /^- \[[ x]\] /m.test(mdSebelum));

    /* ---------- ganti mode di browser nyata ---------- */
    await br.eval(`document.querySelector('.kd-ed-tab[data-mode="markdown"]').click()`);
    await tunggu(300);
    const modeMd = await br.eval(`(() => ({
      ta: getComputedStyle(document.getElementById('isi_md')).display,
      // Yang disembunyikan adalah pembungkusnya. getComputedStyle pada
      // .tox-tinymce tetap 'flex' walau induknya display:none — display tidak
      // diwarisi. Jadi keterlihatan nyata diperiksa lewat offsetParent.
      ed: getComputedStyle(document.querySelector('.kd-ed-visual')).display,
      edTerlihat: document.querySelector('.tox-tinymce').offsetParent !== null,
      hintMd: !document.querySelector('[data-hint-md]').hidden
    }))()`);
    ok('mode markdown: textarea tampil', modeMd.ta !== 'none', modeMd.ta);
    ok('mode markdown: editor visual disembunyikan',
      modeMd.ed === 'none' && !modeMd.edTerlihat, modeMd.ed + ' terlihat=' + modeMd.edTerlihat);
    ok('mode markdown: petunjuk sintaks muncul', modeMd.hintMd);

    await br.eval(`document.querySelector('.kd-ed-tab[data-mode="visual"]').click()`);
    await tunggu(500);
    const modeVis = await br.eval(`(() => ({
      ta: getComputedStyle(document.getElementById('isi_md')).display,
      ed: getComputedStyle(document.querySelector('.kd-ed-visual')).display,
      edTerlihat: document.querySelector('.tox-tinymce').offsetParent !== null,
      isi: document.querySelector('iframe.tox-edit-area__iframe').contentDocument.body.textContent.indexOf('${stempel}') !== -1
    }))()`);
    ok('mode visual: editor tampil lagi', modeVis.ed !== 'none' && modeVis.edTerlihat,
      modeVis.ed + ' terlihat=' + modeVis.edTerlihat);
    ok('mode visual: textarea sembunyi lagi', modeVis.ta === 'none', modeVis.ta);
    ok('tulisan tidak hilang setelah bolak-balik mode', modeVis.isi);

    /* ---------- menu kartu benar-benar bisa dibuka ---------- */
    const menu = await br.eval(`(async () => {
      const tombol = [...document.querySelectorAll('.tox-tbtn')]
        .find(b => (b.getAttribute('aria-label') || '').toLowerCase().includes('kartu'));
      if (!tombol) return { ada: false };
      tombol.click();
      await new Promise(r => setTimeout(r, 400));
      const item = [...document.querySelectorAll('.tox-collection__item')];
      const hasil = { ada: true, jumlah: item.length, teks: item.map(i => i.textContent.trim()) };
      document.body.click();
      return hasil;
    })()`);
    ok('tombol kartu ada di toolbar', menu.ada);
    ok('menu kartu terbuka dan berisi 11 pilihan', menu.jumlah === 11, menu.jumlah);
    ok('nama jenis kartu terbaca di menu',
      menu.teks && menu.teks.some((t) => /tips/i.test(t)), (menu.teks || []).join(' | '));

    /* ---------- tidak ada error JS ---------- */
    const penting = br.galat.filter((g) => !/favicon|net::ERR_/i.test(g));
    ok('tidak ada error JavaScript di halaman editor', penting.length === 0,
      penting.slice(0, 3).join(' || '));

    console.log('\n-----');
    console.log('LULUS=' + lulus + ' GAGAL=' + gagal);
  } catch (e) {
    console.log('BAD  uji berhenti: ' + e.message);
    gagal++;
  } finally {
    br.tutup();
  }
  process.exit(gagal ? 1 : 0);
})();
