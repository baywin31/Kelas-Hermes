/* edit-langsung.js — mode "klik ubah langsung" di halaman materi.
 *
 * Apa yang dikerjakan berkas ini:
 * Admin membuka materi.php?edit=1, mengklik paragraf mana pun, mengubahnya di
 * tempat, lalu menyimpan. Yang dikirim ke server HANYA blok itu.
 *
 * Kenapa begini, bukan editor satu kotak besar:
 * Editor satu kotak (TinyMCE) mengirim ULANG seluruh materi setiap kali
 * disimpan. Artinya satu kesalahan konversi di satu tempat bisa merusak bagian
 * yang admin tidak sentuh — dan admin baru sadar berhari-hari kemudian. Dengan
 * per-blok, kerusakan paling buruk terbatas pada blok yang memang sedang
 * diedit, dan blok lain tetap byte-per-byte seperti aslinya di database.
 *
 * Kenapa yang diedit tetap markdown, bukan HTML:
 * _markdown.php sengaja meng-escape SELURUH HTML sebagai pengaman. Jadi format
 * simpanan tidak boleh berubah. Yang berubah cuma cara admin menyentuhnya:
 * dulu satu kotak berisi seluruh materi, sekarang satu kotak kecil berisi satu
 * blok — dan hasilnya langsung terlihat sebagai kartu jadi, bukan teks mentah.
 *
 * Tidak ada dependensi. Tidak ada framework. Vanilla, satu berkas.
 */
(function () {
  'use strict';

  var K = window.KD_EDIT;
  if (!K || !K.aktif) return;

  var wadah = document.querySelector('[data-materi-isi]');
  if (!wadah) return;

  // Daftar blok datang dari server (markdown asli tiap blok). Ini yang dipakai
  // saat membuka kotak sunting — bukan hasil membaca balik HTML di halaman.
  // Alasannya: membaca balik HTML berarti menebak, dan tebakan yang salah
  // menulis ulang materi dengan isi yang keliru.
  var BLOK = Array.isArray(K.blok) ? K.blok : [];

  var JENIS_NAMA = [
    ['paragraf', 'Paragraf'],
    ['judul',    'Judul bagian (##)'],
    ['sub',      'Sub bagian (###)'],
    ['kartu',    'Kartu berwarna'],
    ['ceklis',   'Checklist'],
    ['ul',       'Daftar poin'],
    ['ol',       'Daftar bernomor'],
    ['tabel',    'Tabel'],
    ['kode',     'Blok kode'],
    ['video',    'Video YouTube'],
    ['gambar',   'Gambar'],
    ['kutipan',  'Kutipan'],
    ['garis',    'Garis pemisah']
  ];

  var IKON = {
    ubah:   '\u270E',  // pensil
    naik:   '\u2191',
    turun:  '\u2193',
    tambah: '\u002B',
    hapus:  '\u00D7'
  };

  var sedangSunting = null;   // elemen .kd-sunting yang terbuka, kalau ada
  var menuTerbuka   = null;

  function el(tag, kelas, isi) {
    var e = document.createElement(tag);
    if (kelas) e.className = kelas;
    if (isi != null) e.textContent = isi;
    return e;
  }

  function tombol(kunci, judul, kelas) {
    var b = el('button', kelas || '', IKON[kunci]);
    b.type = 'button';
    b.title = judul;
    b.setAttribute('aria-label', judul);
    b.dataset.alat = kunci;
    return b;
  }

  /** Bilah alat untuk satu blok. Dipasang ulang setiap kali HTML diganti. */
  function pasangAlat() {
    var blok = wadah.querySelectorAll('.kd-blok');
    for (var i = 0; i < blok.length; i++) {
      var n = blok[i];
      if (n.querySelector(':scope > .kd-blok-alat')) continue;

      var bar = el('div', 'kd-blok-alat');
      bar.appendChild(tombol('ubah', 'Ubah blok ini'));
      bar.appendChild(tombol('naik', 'Pindah ke atas'));
      bar.appendChild(tombol('turun', 'Pindah ke bawah'));
      bar.appendChild(tombol('tambah', 'Tambah blok di bawah'));
      bar.appendChild(tombol('hapus', 'Hapus blok ini', 'kd-alat-hapus'));
      n.insertBefore(bar, n.firstChild);
    }
  }

  /** Cari elemen blok terdekat dari sebuah node. */
  function blokDari(node) {
    while (node && node !== wadah) {
      if (node.classList && node.classList.contains('kd-blok')) return node;
      node = node.parentNode;
    }
    return null;
  }

  function kirim(data, lanjut) {
    var body = new URLSearchParams();
    body.set('csrf', K.csrf);
    body.set('bagian', K.bagian);
    Object.keys(data).forEach(function (k) { body.set(k, data[k]); });

    return fetch('blok_simpan.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      credentials: 'same-origin'
    })
      .then(function (r) { return r.json().catch(function () { return { ok: false, pesan: 'Balasan server tidak terbaca (HTTP ' + r.status + ').' }; }); })
      .then(function (j) { lanjut(j); })
      .catch(function () { lanjut({ ok: false, pesan: 'Gagal menghubungi server — cek koneksi.' }); });
  }

  /**
   * Pasang HTML materi yang baru dari server.
   *
   * Seluruh isi diganti, bukan cuma blok yang diubah. Ini disengaja: menambah
   * "##" mengubah pengelompokan kartu section, jadi menambal satu elemen saja
   * akan membuat tampilan admin menyimpang dari yang dilihat pembeli.
   */
  function pasangUlang(j) {
    wadah.innerHTML = j.html;
    BLOK = j.blok || [];
    sedangSunting = null;
    pasangAlat();
  }

  /** Tutup kotak sunting yang terbuka, kembalikan blok ke tampilan normal. */
  function tutupSunting() {
    if (!sedangSunting) return;
    var kotak = sedangSunting.kotak;
    var blokEl = sedangSunting.blokEl;
    if (kotak && kotak.parentNode) kotak.parentNode.removeChild(kotak);
    if (blokEl) {
      blokEl.classList.remove('kd-blok-aktif');
      // Isi asli disembunyikan saat menyunting, bukan dihapus — jadi
      // membatalkan tidak perlu memuat ulang apa pun dari server.
      for (var i = 0; i < sedangSunting.sembunyi.length; i++) {
        sedangSunting.sembunyi[i].style.display = '';
      }
    }
    sedangSunting = null;
  }

  /**
   * Buka kotak sunting untuk satu blok.
   *
   * Markdown-nya diambil dari daftar BLOK yang dikirim server, bukan dari HTML
   * di layar. Membaca balik HTML berarti menebak, dan tebakan yang salah
   * menulis ulang materi dengan isi yang keliru.
   */
  function bukaSunting(blokEl) {
    if (sedangSunting && sedangSunting.blokEl === blokEl) return;
    tutupSunting();

    var idx = parseInt(blokEl.dataset.blok, 10);
    var data = BLOK[idx];
    if (!data) return;

    var sembunyi = [];
    for (var i = 0; i < blokEl.childNodes.length; i++) {
      var c = blokEl.childNodes[i];
      if (c.nodeType === 1 && !c.classList.contains('kd-blok-alat')) {
        sembunyi.push(c);
        c.style.display = 'none';
      }
    }

    var kotak = el('div', 'kd-sunting');
    var ta = document.createElement('textarea');
    ta.value = data.md;
    ta.spellcheck = false;
    ta.rows = Math.min(20, Math.max(3, data.md.split('\n').length + 1));

    var bar = el('div', 'kd-sunting-bar');
    var bSimpan = el('button', 'btn ok', 'Simpan');
    bSimpan.type = 'button';
    var bBatal = el('button', 'btn ghost', 'Batal');
    bBatal.type = 'button';
    var nb = el('span', 'kd-sunting-nb', 'Ctrl+Enter simpan · Esc batal');

    bar.appendChild(bSimpan);
    bar.appendChild(bBatal);
    bar.appendChild(nb);
    kotak.appendChild(ta);
    kotak.appendChild(bar);
    blokEl.appendChild(kotak);
    blokEl.classList.add('kd-blok-aktif');

    sedangSunting = { blokEl: blokEl, kotak: kotak, ta: ta, nb: nb,
                      idx: idx, lama: data.md, sembunyi: sembunyi };

    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);

    bBatal.addEventListener('click', tutupSunting);
    bSimpan.addEventListener('click', simpanSunting);
    ta.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') { ev.preventDefault(); tutupSunting(); }
      if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); simpanSunting(); }
    });
  }

  function simpanSunting() {
    if (!sedangSunting) return;
    var s = sedangSunting;
    s.nb.className = 'kd-sunting-nb';
    s.nb.textContent = 'Menyimpan…';

    kirim({ aksi: 'ubah', idx: s.idx, md: s.ta.value, md_lama: s.lama }, function (j) {
      if (!j.ok) {
        // Kotak sengaja TIDAK ditutup saat gagal: kalau ditutup, tulisan admin
        // hilang dan dia harus mengarang ulang.
        s.nb.className = 'kd-sunting-nb kd-nb-galat';
        s.nb.textContent = j.pesan || 'Gagal menyimpan.';
        return;
      }
      pasangUlang(j);
    });
  }

  /** Tutup menu "tambah blok" kalau terbuka. */
  function tutupMenu() {
    if (menuTerbuka && menuTerbuka.parentNode) menuTerbuka.parentNode.removeChild(menuTerbuka);
    menuTerbuka = null;
  }

  /**
   * Menu pilih jenis blok baru. Nama jenisnya Bahasa Indonesia, bukan istilah
   * markdown — admin tidak perlu tahu apa itu "fence" atau "ordered list".
   */
  function bukaMenuTambah(blokEl, tombolEl) {
    tutupMenu();
    var idx = parseInt(blokEl.dataset.blok, 10);
    var menu = el('div', 'kd-tambah-menu');

    JENIS_NAMA.forEach(function (pasangan) {
      var b = el('button', '', pasangan[1]);
      b.type = 'button';
      b.addEventListener('click', function () {
        tutupMenu();
        kirim({ aksi: 'tambah', idx: idx, jenis: pasangan[0] }, function (j) {
          if (!j.ok) { alert(j.pesan || 'Gagal menambah blok.'); return; }
          pasangUlang(j);
          // Blok baru langsung dibuka untuk disunting: isinya cuma contoh, dan
          // contoh yang dibiarkan terpasang lebih buruk daripada blok kosong.
          var baru = wadah.querySelector('.kd-blok[data-blok="' + (idx + 1) + '"]');
          if (baru) bukaSunting(baru);
        });
      });
      menu.appendChild(b);
    });

    document.body.appendChild(menu);
    var r = tombolEl.getBoundingClientRect();
    menu.style.top = (r.bottom + window.scrollY + 6) + 'px';
    // Ditahan di dalam viewport supaya pilihan terakhir tidak terpotong di layar
    // sempit — menu yang setengah keluar layar terlihat seperti aplikasi rusak.
    var kiri = Math.min(r.left + window.scrollX, window.scrollX + document.documentElement.clientWidth - menu.offsetWidth - 12);
    menu.style.left = Math.max(window.scrollX + 8, kiri) + 'px';
    menuTerbuka = menu;
  }

  function aksiBlok(kunci, blokEl, tombolEl) {
    var idx = parseInt(blokEl.dataset.blok, 10);

    if (kunci === 'ubah')   { bukaSunting(blokEl); return; }
    if (kunci === 'tambah') { bukaMenuTambah(blokEl, tombolEl); return; }

    if (kunci === 'hapus') {
      // Konfirmasi wajib: hapus blok tidak bisa dibatalkan dari layar ini.
      if (!confirm('Hapus blok ini? Tindakan ini tidak bisa dibatalkan.')) return;
    }

    tutupSunting();
    kirim({ aksi: kunci, idx: idx }, function (j) {
      if (!j.ok) { alert(j.pesan || 'Gagal.'); return; }
      pasangUlang(j);
    });
  }

  // Satu pendengar klik untuk seluruh wadah, bukan satu per tombol. Alasannya
  // praktis: HTML materi diganti total setiap kali menyimpan, jadi pendengar
  // yang dipasang per tombol harus dipasang ulang terus dan mudah terlewat.
  wadah.addEventListener('click', function (ev) {
    var t = ev.target;

    var btn = t.closest ? t.closest('.kd-blok-alat button') : null;
    if (btn) {
      ev.preventDefault();
      ev.stopPropagation();
      var b1 = blokDari(btn);
      if (b1) aksiBlok(btn.dataset.alat, b1, btn);
      return;
    }

    // Klik di dalam kotak sunting tidak boleh membuka sunting lain.
    if (t.closest && t.closest('.kd-sunting')) return;

    // Tautan dan video tetap berfungsi normal di mode edit — admin sering perlu
    // memeriksa tautannya, dan mengubah klik jadi "sunting" membuat itu mustahil.
    if (t.closest && t.closest('a, iframe, button')) return;

    var blokEl = blokDari(t);
    if (blokEl) bukaSunting(blokEl);
  });

  document.addEventListener('click', function (ev) {
    if (!menuTerbuka) return;
    if (menuTerbuka.contains(ev.target)) return;
    if (ev.target.closest && ev.target.closest('.kd-blok-alat button')) return;
    tutupMenu();
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && menuTerbuka) tutupMenu();
  });

  window.KD_EDIT_INTERNAL = {
    pasangAlat: pasangAlat, blokDari: blokDari, kirim: kirim,
    pasangUlang: pasangUlang, JENIS_NAMA: JENIS_NAMA, el: el,
    ambilBlok: function () { return BLOK; },
    sunting: function (v) { if (v !== undefined) sedangSunting = v; return sedangSunting; },
    menu: function (v) { if (v !== undefined) menuTerbuka = v; return menuTerbuka; },
    wadah: wadah, K: K
  };

  pasangAlat();
})();
