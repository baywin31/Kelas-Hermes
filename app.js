// app.js — perapian input kode, auto-save catatan, progres bar.
(function () {
  'use strict';

  // ---------- Rapikan input kode saat diketik: HRMS-XXXX-XXXX-XXXX ----------
  var kode = document.querySelector('.kode-input');
  if (kode) {
    kode.addEventListener('input', function () {
      var pos = this.selectionStart === this.value.length;
      var s = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (s.indexOf('HRMS') === 0) s = s.slice(4);
      s = s.slice(0, 12);
      var out = 'HRMS';
      for (var i = 0; i < s.length; i += 4) out += '-' + s.slice(i, i + 4);
      this.value = s.length ? out : '';
      if (pos) this.setSelectionRange(this.value.length, this.value.length);
    });
  }

  // ---------- Progres bar ----------
  document.querySelectorAll('.bar-dalam[data-persen]').forEach(function (el) {
    el.style.width = Math.max(0, Math.min(100, +el.dataset.persen)) + '%';
  });

  // ---------- Auto-save catatan (debounce 1,2 detik) ----------
  var ta = document.querySelector('[data-catatan-bagian]');
  if (ta) {
    var status = document.querySelector('[data-catatan-status]');
    var timer = null;
    var terakhir = ta.value;

    function simpan() {
      if (ta.value === terakhir) return;
      var isi = ta.value;
      if (status) status.textContent = 'Menyimpan…';
      var body = new URLSearchParams({
        csrf: ta.dataset.csrf,
        bagian: ta.dataset.catatanBagian,
        isi: isi
      });
      fetch('catatan_simpan.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        credentials: 'same-origin'
      })
        .then(function (r) { if (!r.ok) throw new Error('gagal'); return r.text(); })
        .then(function () {
          terakhir = isi;
          if (status) {
            var jam = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            status.textContent = 'Tersimpan ' + jam;
          }
        })
        .catch(function () {
          if (status) status.textContent = 'Gagal menyimpan — cek koneksi';
        });
    }

    ta.addEventListener('input', function () {
      if (status) status.textContent = 'Mengetik…';
      clearTimeout(timer);
      timer = setTimeout(simpan, 1200);
    });
    ta.addEventListener('blur', function () { clearTimeout(timer); simpan(); });
    window.addEventListener('beforeunload', function () { clearTimeout(timer); simpan(); });
  }

  // ---------- Konfirmasi aksi berbahaya ----------
  document.querySelectorAll('[data-konfirmasi]').forEach(function (el) {
    el.addEventListener('submit', function (ev) {
      if (!confirm(el.dataset.konfirmasi)) ev.preventDefault();
    });
  });

  // ---------- Sisipkan kerangka modul ke editor ----------
  // Kerangkanya diambil dari textarea tersembunyi, bukan dari atribut data-*,
  // supaya baris barunya utuh. Kalau editor sudah ada isinya, kerangka
  // ditambahkan di bawah — jangan pernah menimpa tulisan yang sudah ada.
  document.querySelectorAll('[data-kerangka]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var ta = document.getElementById(btn.getAttribute('data-kerangka'));
      var sumber = document.getElementById('kerangka-modul');
      if (!ta || !sumber) return;
      var pola = sumber.value;
      ta.value = ta.value.trim() === '' ? pola : ta.value.replace(/\s*$/, '') + '\n\n' + pola;
      ta.focus();
      // Bawa kursor ke awal kerangka yang baru ditempel, bukan ke ujung
      // bawah: yang perlu diedit pertama adalah judul cerita pembuka.
      var mulai = ta.value.length - pola.length;
      ta.setSelectionRange(mulai, mulai);
      ta.scrollTop = ta.scrollHeight;
    });
  });

  // ---------- Bilah kemajuan baca + penanda posisi di daftar isi ----------
  // Dua hal digabung karena keduanya butuh angka yang sama (posisi gulir), dan
  // menghitungnya sekali lebih murah daripada dua pendengar terpisah.
  // Tanpa library: hanya scrollY, tinggi dokumen, dan offsetTop tiap heading.
  var maju = document.querySelector('[data-baca-maju]');
  var toc  = document.querySelector('[data-toc]');
  if (maju || toc) {
    var tautan = toc ? Array.prototype.slice.call(toc.querySelectorAll('a')) : [];
    // Heading tujuan tiap tautan dicari sekali di awal, bukan tiap gulir.
    var target = tautan.map(function (a) {
      try { return document.querySelector(a.getAttribute('href')); }
      catch (e) { return null; }
    });
    var jadwal = false;

    function hitung() {
      jadwal = false;

      if (maju) {
        // Yang dihitung adalah bagian dokumen yang SUDAH terlewat, bukan posisi
        // absolut: kalau halamannya pendek, bilahnya langsung penuh dan tidak
        // memberi kesan salah bahwa masih ada sisa panjang.
        var bisa = document.documentElement.scrollHeight - window.innerHeight;
        var pct = bisa > 20 ? (window.scrollY / bisa) * 100 : 100;
        maju.style.width = Math.max(0, Math.min(100, pct)) + '%';
      }

      if (tautan.length) {
        // Heading aktif = heading terakhir yang ujung atasnya sudah melewati
        // sepertiga atas layar. Ambang sepertiga (bukan 0) supaya penanda
        // berpindah tepat saat judul terasa "sedang dibaca".
        var batas = window.scrollY + window.innerHeight / 3;
        var aktif = 0;
        for (var i = 0; i < target.length; i++) {
          if (target[i] && target[i].offsetTop <= batas) aktif = i;
        }
        for (var j = 0; j < tautan.length; j++) {
          tautan[j].classList.toggle('kd-toc-aktif', j === aktif);
        }
      }
    }

    // requestAnimationFrame: peristiwa scroll bisa datang puluhan kali per
    // detik; tanpa penjadwalan ini, halaman tersendat di ponsel murah — dan
    // itu justru perangkat yang dipakai pembaca yang kita bidik.
    window.addEventListener('scroll', function () {
      if (!jadwal) { jadwal = true; requestAnimationFrame(hitung); }
    }, { passive: true });
    window.addEventListener('resize', hitung);
    hitung();
  }

  // ---------- Salin ke clipboard ----------
  document.querySelectorAll('[data-salin]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = document.querySelector(btn.dataset.salin);
      if (!target) return;
      var txt = target.value !== undefined ? target.value : target.textContent;
      navigator.clipboard.writeText(txt).then(function () {
        var asli = btn.textContent;
        btn.textContent = 'Tersalin!';
        setTimeout(function () { btn.textContent = asli; }, 1400);
      });
    });
  });

  // ---------- Tombol salin di blok kode materi ----------
  // Pembaca yang belum lancar mengetik perintah panjang paling sering gagal
  // karena salah ketik. Satu tombol ini menghapus seluruh kelas kesalahan itu.
  // Vanilla JS, tanpa library: tombolnya sudah dirender server (komp_kode()),
  // di sini cuma dipasangi pendengar.
  document.querySelectorAll('.kd-salin').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var kotak = btn.closest('.kd-kode');
      var kode  = kotak && kotak.querySelector('pre code');
      if (!kode) return;

      var label = btn.querySelector('span');
      var tulis = function (pesan) {
        if (!label) return;
        var asli = label.textContent;
        label.textContent = pesan;
        setTimeout(function () { label.textContent = asli; }, 1500);
      };

      // clipboard API butuh HTTPS. Kalau tidak tersedia (mis. dibuka lewat
      // http biasa), pakai jalur lama supaya tombolnya tidak mati diam-diam.
      var teks = kode.textContent;
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(teks).then(
          function () { tulis('Tersalin'); },
          function () { tulis('Gagal'); }
        );
        return;
      }
      var tmp = document.createElement('textarea');
      tmp.value = teks;
      tmp.setAttribute('readonly', '');
      tmp.style.position = 'fixed';
      tmp.style.left = '-9999px';
      document.body.appendChild(tmp);
      tmp.select();
      try { document.execCommand('copy'); tulis('Tersalin'); }
      catch (e) { tulis('Gagal'); }
      document.body.removeChild(tmp);
    });
  });
})();
