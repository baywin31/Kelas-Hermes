/* ============================================================
   Halaman member: dashboard, materi, cari, FAQ, tanya admin, profil, cetak.
   URUTAN DASHBOARD (dari PRD, jangan ditukar):
     1 sapaan · 2 tombol Telegram · 3 daftar Bagian + tombol materi · 4 progres
   ============================================================ */
(function () {
'use strict';
var K = window.KD, S = window.KD_STORE_1, S2 = window.KD_STORE_2;
var U = window.KD_UI, R = U.routes, A = window.KD_AKSI;

/* ---------- dashboard ---------- */
R.dashboard = function () {
  var u = U.butuhLogin();
  if (!u) return false;

  var list = S2.bagianSemua();
  var prog = S2.progresUser(u.id);
  var p = S2.progresPersen(u.id);
  var tele = S2.setelan('telegram_url', '');
  var links = S2.setelan('links', []);

  var h = '';

  /* 1. SAPAAN */
  h += '<div class="card">' +
    '<span class="eyebrow">Akses aktif · selamanya</span>' +
    '<h1>Halo, ' + K.esc(u.nama) + '</h1>' +
    '<p class="sub" style="margin-bottom:0">Selamat datang di member area kelas ' + K.esc(K.COURSE_NAME) +
      '. Aksesmu berlaku selamanya, termasuk materi yang ditambahkan nanti.</p>' +
  '</div>';

  /* 2. TOMBOL TELEGRAM */
  h += '<div class="card tight">';
  if (/^https?:\/\//i.test(tele)) {
    h += '<a class="btn btn-tele blok" href="' + K.esc(tele) + '" target="_blank" rel="noopener" ' +
      'data-aksi="klik-telegram">Join Komunitas Telegram</a>';
  } else {
    h += '<button class="btn btn-tele blok" disabled>Join Komunitas Telegram</button>';
  }
  h += '<p class="hint" style="margin:10px 0 0;text-align:center">Tempat tanya-jawab dan pengumuman materi baru.</p>' +
  '</div>';

  /* 3. DAFTAR BAGIAN + TOMBOL MATERI */
  h += '<div class="card"><h2 style="margin-top:0">Materi kelas</h2>';
  if (!list.length) {
    h += '<p class="muted">Materi belum tersedia.</p>';
  } else {
    list.forEach(function (b) {
      var st = prog[b.urutan] || 'belum';
      h += '<div class="bagian">' +
        '<div class="no">' + b.urutan + '</div>' +
        '<div class="isi">' +
          '<h3><a href="#/materi/' + b.urutan + '">' + K.esc(b.judul) + '</a>' +
            (S2.materiBaru(b, u.id) ? ' <span class="badge baru">Materi Baru</span>' : '') + '</h3>' +
          '<p class="muted small" style="margin:0 0 8px">' + K.esc(b.ringkas) + '</p>' +
          U.badgeStatus(st) +
        '</div>' +
        '<div class="aksi">' +
          '<a class="btn ghost" href="#/materi/' + b.urutan + '">Buka Materi</a>' +
          (st === 'selesai'
            ? '<button class="btn ghost" data-aksi="progres" data-b="' + b.urutan + '" data-st="belum">Tandai belum</button>'
            : '<button class="btn ok" data-aksi="progres" data-b="' + b.urutan + '" data-st="selesai">Tandai Selesai</button>') +
        '</div>' +
      '</div>';
    });
  }
  h += '</div>';

  /* 4. PROGRES */
  h += '<div class="card"><h2 style="margin-top:0">Progres belajar</h2>' +
    '<div class="progres"><div class="progres-angka"><b>' + p.persen + '%</b>' +
      '<span class="muted small"><strong>' + p.selesai + '</strong> dari ' + p.total + ' Bagian selesai</span></div>' +
      '<div class="bar-luar"><div class="bar-dalam" data-persen="' + p.persen + '"></div></div></div>' +
  '</div>';

  /* tautan penting */
  var linkHtml = links.filter(function (l) { return /^https?:\/\//i.test(l.url || ''); }).map(function (l) {
    return '<div class="bagian" style="padding:14px"><div class="isi">' +
      '<h3 style="margin:0"><a href="' + K.esc(l.url) + '" target="_blank" rel="noopener">' +
        K.esc(l.judul || l.url) + '</a></h3>' +
      (l.ket ? '<p class="muted small" style="margin:2px 0 0">' + K.esc(l.ket) + '</p>' : '') +
    '</div></div>';
  }).join('');
  if (linkHtml) h += '<div class="card"><h2 style="margin-top:0">Tautan penting</h2>' + linkHtml + '</div>';

  h += '<div class="card tight"><div class="row">' +
    '<a class="btn ghost blok" href="#/cari">Cari materi</a>' +
    '<a class="btn ghost blok" href="#/faq">FAQ</a>' +
    '<a class="btn ghost blok" href="#/tanya">Tanya Admin</a>' +
    '<a class="btn ghost blok" href="#/cetak">Cetak semua</a>' +
  '</div></div>';

  return h;
};

A.progres = function (el) {
  var u = S.userAktif();
  if (!u) return;
  S2.progresSet(u.id, parseInt(el.getAttribute('data-b'), 10), el.getAttribute('data-st'));
  U.render();
};
A['klik-telegram'] = function (el) {
  var u = S.userAktif();
  S.audit('klik_telegram', u ? u.id : null, '');
  S.simpan();
  window.open(el.getAttribute('href'), '_blank', 'noopener');
};

/* ---------- baca materi ---------- */
R.materi = function (rute) {
  var u = U.butuhLogin();
  if (!u) return false;
  var no = parseInt(rute.arg, 10);
  var b = S2.bagianSatu(no);
  if (!b) return '<div class="card sempit"><h1>Materi tidak ada</h1>' +
    '<p class="sub">Bagian ' + K.esc(rute.arg) + ' belum tersedia.</p>' +
    '<p><a class="btn ghost" href="#/dashboard">Kembali</a></p></div>';

  S2.kunjunganCatat(u.id, no);
  var prog = S2.progresUser(u.id);
  var st = prog[no] || 'mulai';
  var list = S2.bagianSemua();
  var idx = list.findIndex(function (x) { return x.urutan === no; });
  var prev = idx > 0 ? list[idx - 1] : null;
  var next = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null;

  var toc = K.mdToc(b.isi_md).map(function (t) {
    return '<a class="' + (t.level >= 3 ? 'l3' : '') + '" href="#' + t.id + '">' + K.esc(t.text) + '</a>';
  }).join('');

  return '' +
  '<div class="card">' +
    '<div class="row rapat" style="justify-content:space-between;align-items:center;gap:10px">' +
      '<div><span class="eyebrow">Bagian ' + b.urutan + ' dari ' + list.length + '</span>' +
        '<h1 style="margin:10px 0 4px">' + K.esc(b.judul) + '</h1>' +
        '<p class="muted small" style="margin:0">' + K.esc(b.ringkas) +
        ' · diperbarui ' + K.tgl(b.updated) + '</p></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
        (st === 'selesai'
          ? '<button class="btn ghost" data-aksi="materi-progres" data-b="' + no + '" data-st="belum">Tandai belum</button>'
          : '<button class="btn ok" data-aksi="materi-progres" data-b="' + no + '" data-st="selesai">Tandai Selesai</button>') +
        '<a class="btn ghost" href="#/cetak/' + no + '">Cetak</a>' +
      '</div>' +
    '</div>' +
  '</div>' +
  '<div class="card">' +
    '<div class="materi">' +
      '<nav class="toc" aria-label="Daftar isi">' + (toc || '<span class="muted small">—</span>') + '</nav>' +
      '<div class="isi-materi">' + K.md(b.isi_md) + '</div>' +
    '</div>' +
  '</div>' +
  '<div class="card">' +
    '<h2 style="margin-top:0">Catatan pribadi</h2>' +
    '<p class="hint" style="margin-top:0">Hanya kamu yang bisa melihat ini. Tersimpan otomatis.</p>' +
    '<textarea class="pendek" data-aksi="catatan" data-b="' + no + '" ' +
      'placeholder="Tulis langkah yang berhasil, error yang kamu temui, ide penerapan…">' +
      K.esc(S2.catatanAmbil(u.id, no)) + '</textarea>' +
    '<p class="hint" id="catatan-status">&nbsp;</p>' +
  '</div>' +
  '<div class="card tight"><div class="row">' +
    (prev ? '<a class="btn ghost blok" href="#/materi/' + prev.urutan + '">← Bagian ' + prev.urutan + '</a>'
          : '<a class="btn ghost blok" href="#/dashboard">← Dashboard</a>') +
    (next ? '<a class="btn blok" href="#/materi/' + next.urutan + '">Bagian ' + next.urutan + ' →</a>'
          : '<a class="btn blok" href="#/dashboard">Selesai — ke dashboard</a>') +
  '</div></div>';
};

A['materi-progres'] = function (el) {
  var u = S.userAktif();
  if (!u) return;
  S2.progresSet(u.id, parseInt(el.getAttribute('data-b'), 10), el.getAttribute('data-st'));
  U.flash('ok', 'Status Bagian diperbarui.');
  U.render();
};

A.catatan = function (el) {
  var u = S.userAktif();
  if (!u) return;
  clearTimeout(A.catatan._t);
  A.catatan._t = setTimeout(function () {
    S2.catatanSimpan(u.id, parseInt(el.getAttribute('data-b'), 10), el.value);
    var s = document.getElementById('catatan-status');
    if (s) s.textContent = 'Tersimpan ' + K.tglJam(K.now());
  }, 400);
};

/* ---------- cari ---------- */
R.cari = function (rute) {
  var u = U.butuhLogin();
  if (!u) return false;
  var q = rute.query.q || '';
  var hasil = q ? S2.cariMateri(q) : [];
  var h = '<div class="card">' +
    '<h1>Cari materi</h1>' +
    '<p class="sub">Cari kata di judul maupun isi seluruh Bagian.</p>' +
    '<form data-aksi="cari" novalidate><div class="row">' +
      '<input name="q" placeholder="misal: provider, cron, deploy" data-fokus value="' + K.esc(q) + '">' +
      '<button class="btn" type="submit" style="flex:0 0 auto">Cari</button>' +
    '</div></form>' +
  '</div>';
  if (q) {
    h += '<div class="card">';
    if (q.trim().length < 2) h += '<p class="muted">Ketik minimal 2 karakter.</p>';
    else if (!hasil.length) h += '<p class="muted">Tidak ada Bagian yang memuat "' + K.esc(q) + '".</p>';
    else {
      h += '<p class="muted small">' + hasil.length + ' Bagian cocok.</p>';
      hasil.forEach(function (r) {
        h += '<div class="bagian"><div class="no">' + r.bagian.urutan + '</div><div class="isi">' +
          '<h3><a href="#/materi/' + r.bagian.urutan + '">' + K.esc(r.bagian.judul) + '</a></h3>' +
          '<p class="muted small" style="margin:0">' + K.esc(r.kutipan) + '</p>' +
        '</div></div>';
      });
    }
    h += '</div>';
  }
  return h;
};
A.cari = function (form) { U.go('/cari?q=' + encodeURIComponent(U.nilai(form, 'q'))); };

/* ---------- FAQ ---------- */
R.faq = function () {
  var u = U.butuhLogin();
  if (!u) return false;
  return '<div class="card"><h1>FAQ &amp; Troubleshooting</h1>' +
    '<div class="isi-materi">' + K.md(S._get().faq_md) + '</div></div>' +
    '<div class="card tight"><a class="btn ghost blok" href="#/tanya">Pertanyaanku belum terjawab — Tanya Admin</a></div>';
};

/* ---------- tanya admin ---------- */
R.tanya = function () {
  var u = U.butuhLogin();
  if (!u) return false;
  var kontak = S2.setelan('admin_kontak', '');
  // Pesan dibuat spesifik supaya admin tahu siapa yang chat tanpa bertanya dulu.
  var waUrl = K.waLink(S2.setelan('wa_nomor', ''),
    'Halo admin, saya ' + u.nama + ' (' + u.email + '), member ' + K.APP_NAME + '. Saya mau tanya:');
  var mine = S._get().tiket.filter(function (t) { return t.uid === u.id; }).reverse();
  var h = '<div class="card"><h1>Tanya Admin</h1>' +
    '<p class="sub">Untuk pertanyaan personal/teknis yang tidak cocok dibahas di grup.</p>';
  if (waUrl) {
    h += '<p><a class="btn btn-wa blok" href="' + K.esc(waUrl) + '" target="_blank" rel="noopener">' +
      'Chat admin di WhatsApp</a></p>' +
      '<p class="hint">Paling langsung — nama dan emailmu sudah otomatis terisi di pesannya.</p>';
  }
  if (/^https?:\/\//i.test(kontak)) {
    h += '<p><a class="btn' + (waUrl ? ' ghost' : '') + '" href="' + K.esc(kontak) + '" target="_blank" rel="noopener">Chat admin langsung</a></p>' +
      '<p class="hint">Atau tinggalkan pesan di bawah — admin membacanya dari panel.</p>';
  }
  h += '<form data-aksi="tanya" novalidate>' +
      '<label for="isi">Pertanyaanmu</label>' +
      '<textarea class="pendek" id="isi" name="isi" required data-fokus ' +
        'placeholder="Ceritakan yang kamu coba, error yang muncul, dan di Bagian berapa."></textarea>' +
      '<p style="margin-top:16px"><button class="btn" type="submit">Kirim pertanyaan</button></p>' +
    '</form></div>';
  if (mine.length) {
    h += '<div class="card"><h2 style="margin-top:0">Pertanyaan yang sudah kamu kirim</h2>';
    mine.forEach(function (t) {
      h += '<div class="bagian"><div class="isi">' +
        '<p class="small" style="margin:0 0 4px">' + K.esc(t.isi) + '</p>' +
        '<span class="muted small">' + K.tglJam(t.dibuat) + '</span> ' +
        (t.dibalas ? '<span class="badge selesai">Sudah dibalas</span>' : '<span class="badge belum">Menunggu</span>') +
      '</div></div>';
    });
    h += '</div>';
  }
  return h;
};
A.tanya = function (form) {
  var u = S.userAktif();
  var r = S2.tiketKirim(u.id, U.nilai(form, 'isi'));
  U.flash(r.ok ? 'ok' : 'err', r.ok ? 'Pertanyaan terkirim. Admin akan menghubungimu.' : K.esc(r.err));
  U.render();
};

/* ---------- profil ---------- */
R.profil = function () {
  var u = U.butuhLogin();
  if (!u) return false;
  var p = S2.progresPersen(u.id);
  var kode = u.kode ? S.cariKode(u.kode) : null;
  return '<div class="card"><h1>Profil</h1>' +
    '<table class="data" style="margin-top:8px">' +
      '<tr><th style="width:180px">Nama</th><td>' + K.esc(u.nama) + '</td></tr>' +
      '<tr><th>Email</th><td>' + K.esc(u.email) + '</td></tr>' +
      '<tr><th>Peran</th><td>' + K.esc(u.role) + '</td></tr>' +
      '<tr><th>Bergabung</th><td>' + K.tglJam(u.dibuat) + '</td></tr>' +
      '<tr><th>Kode akses</th><td class="mono">' + K.esc(u.kode || '—') + '</td></tr>' +
      '<tr><th>Kode ditukar</th><td>' + (kode && kode.dipakaiPada ? K.tglJam(kode.dipakaiPada) : '—') + '</td></tr>' +
      '<tr><th>Progres</th><td>' + p.selesai + ' dari ' + p.total + ' Bagian (' + p.persen + '%)</td></tr>' +
    '</table></div>' +
  '<div class="card"><h2 style="margin-top:0">Ganti password</h2>' +
    '<form data-aksi="ganti-pw" novalidate>' +
      '<label for="lama">Password sekarang</label>' +
      '<input id="lama" name="lama" type="password" required autocomplete="current-password">' +
      '<label for="baru">Password baru (min 8 karakter)</label>' +
      '<input id="baru" name="baru" type="password" required minlength="8" autocomplete="new-password">' +
      '<label for="baru2">Ulangi password baru</label>' +
      '<input id="baru2" name="baru2" type="password" required minlength="8" autocomplete="new-password">' +
      '<p style="margin-top:18px"><button class="btn" type="submit">Simpan password</button></p>' +
    '</form></div>' +
  '<div class="card tight"><div class="row">' +
    '<a class="btn ghost blok" href="#/cetak">Cetak semua materi</a>' +
    '<a class="btn ghost blok" href="#/keluar">Keluar dari akun</a>' +
  '</div></div>';
};
A['ganti-pw'] = function (form) {
  var u = S.userAktif();
  var r = S2.gantiPassword(u.id, U.nilai(form, 'lama'), U.nilai(form, 'baru'), U.nilai(form, 'baru2'));
  U.flash(r.ok ? 'ok' : 'err', r.ok ? 'Password diperbarui.' : K.esc(r.err));
  U.render();
};

/* ---------- versi cetak ---------- */
R.cetak = function (rute) {
  var u = U.butuhLogin();
  if (!u) return false;
  var no = parseInt(rute.arg, 10);
  var list = no ? [S2.bagianSatu(no)].filter(Boolean) : S2.bagianSemua();
  var h = '<div class="card tight"><div class="row">' +
    '<button class="btn blok" data-aksi="cetak-sekarang">Cetak / Simpan PDF</button>' +
    '<a class="btn ghost blok" href="' + (no ? '#/materi/' + no : '#/dashboard') + '">Kembali</a>' +
  '</div></div>';
  h += '<div class="card"><h1>' + K.esc(K.COURSE_NAME) + (no ? ' — Bagian ' + no : ' — semua Bagian') + '</h1>' +
    '<p class="muted small">Disiapkan untuk ' + K.esc(u.nama) + ' · ' + K.tgl(K.now()) + '</p></div>';
  list.forEach(function (b) {
    h += '<div class="card"><h2 style="margin-top:0">Bagian ' + b.urutan + ' — ' + K.esc(b.judul) + '</h2>' +
      '<div class="isi-materi">' + K.md(b.isi_md) + '</div></div>';
  });
  return h;
};
A['cetak-sekarang'] = function () { try { window.print(); } catch (e) { U.toast('Cetak tidak tersedia di sini.'); } };
})();
