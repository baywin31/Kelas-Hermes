/* ============================================================
   Halaman publik: beranda, redeem kode, masuk, lupa & reset password.
   ============================================================ */
(function () {
'use strict';
var K = window.KD, S = window.KD_STORE_1, S2 = window.KD_STORE_2;
var U = window.KD_UI, R = U.routes, A = window.KD_AKSI;

/* ---------- beranda ---------- */
R.beranda = function () {
  if (S.userAktif()) { U.go('/dashboard'); return false; }
  return '' +
  '<section class="hero">' +
    '<span class="eyebrow">Akses sekali bayar · berlaku selamanya</span>' +
    '<h1>Member area kelas ' + K.esc(K.COURSE_NAME) + '</h1>' +
    '<p class="sub">Punya kode akses dari pembelian? Tukar sekarang, akunmu langsung aktif — ' +
      'tanpa menunggu admin membuatkan.</p>' +
    '<div class="hero-aksi">' +
      '<a class="btn" href="#/redeem">Redeem kode akses</a>' +
      '<a class="btn ghost" href="#/masuk">Sudah punya akun — Masuk</a>' +
    '</div>' +
  '</section>' +
  '<div class="fitur">' +
    '<div class="fitur-item"><b>Materi 4 Bagian</b><span>Tersusun urut, bisa dibaca dari HP, lengkap dengan penanda progres.</span></div>' +
    '<div class="fitur-item"><b>Komunitas Telegram</b><span>Tombolnya di paling atas dashboard, sekali klik langsung masuk grup.</span></div>' +
    '<div class="fitur-item"><b>Catatan pribadi</b><span>Tulis catatan per Bagian, tersimpan otomatis sambil kamu belajar.</span></div>' +
    '<div class="fitur-item"><b>Update tanpa kirim file</b><span>Materi baru muncul dengan sendirinya, ditandai label khusus.</span></div>' +
    '<div class="fitur-item"><b>Cari cepat</b><span>Cari kata di seluruh materi kalau lupa letak pembahasannya.</span></div>' +
    '<div class="fitur-item"><b>Versi cetak</b><span>Simpan materi jadi PDF lewat tombol cetak, untuk dibaca offline.</span></div>' +
  '</div>' +
  '<div class="card" style="margin-top:16px">' +
    '<h2 style="margin-top:0">Cara masuk pertama kali</h2>' +
    '<ol style="padding-left:20px;margin:0">' +
      '<li>Selesaikan pembayaran di Lynk.id / Mayar.</li>' +
      '<li>Kamu menerima kode berformat <span class="mono">' + K.esc(K.KODE_PREFIX) + '-XXXX-XXXX-XXXX</span>.</li>' +
      '<li>Buka <a href="#/redeem">halaman redeem</a>, tempel kodenya, buat email &amp; password.</li>' +
      '<li>Selesai — kamu langsung berada di dashboard.</li>' +
    '</ol>' +
  '</div>';
};

/* ---------- redeem (2 tahap: cek kode → buat akun) ---------- */
var redeemState = { tahap: 'kode', kode: '', nama: '', email: '', err: '' };

R.redeem = function () {
  if (S.userAktif()) { U.go('/dashboard'); return false; }
  var err = redeemState.err ? '<div class="flash err">' + redeemState.err + '</div>' : '';
  redeemState.err = '';

  if (redeemState.tahap === 'akun') {
    return '<div class="card sempit">' + err +
      '<h1>Buat akunmu</h1>' +
      '<p class="sub">Kode <span class="mono">' + K.esc(redeemState.kode) + '</span> valid. Lengkapi data di bawah.</p>' +
      '<form data-aksi="redeem-daftar" novalidate>' +
        '<label for="nama">Nama</label>' +
        '<input id="nama" name="nama" required maxlength="120" data-fokus value="' + K.esc(redeemState.nama) + '">' +
        '<label for="email">Email</label>' +
        '<input id="email" name="email" type="email" required maxlength="190" autocomplete="email" value="' + K.esc(redeemState.email) + '">' +
        '<p class="hint">Dipakai untuk masuk dan memulihkan password.</p>' +
        '<label for="password">Password (min 8 karakter)</label>' +
        '<input id="password" name="password" type="password" required minlength="8" autocomplete="new-password">' +
        '<label for="password2">Ulangi password</label>' +
        '<input id="password2" name="password2" type="password" required minlength="8" autocomplete="new-password">' +
        '<p style="margin-top:20px"><button class="btn blok" type="submit">Aktifkan akun</button></p>' +
      '</form>' +
      '<p class="hint" style="margin-top:14px"><a href="#/redeem" data-aksi="redeem-ulang">Pakai kode lain</a></p>' +
    '</div>';
  }

  return '<div class="card sempit">' + err +
    '<h1>Masukkan kode akses</h1>' +
    '<p class="sub">Kode dikirim setelah pembayaran, formatnya ' + K.esc(K.KODE_PREFIX) + '-XXXX-XXXX-XXXX.</p>' +
    '<form data-aksi="redeem-cek" novalidate>' +
      '<label for="kode">Kode akses</label>' +
      '<input class="kode-input" id="kode" name="kode" required autocomplete="off" spellcheck="false" ' +
        'placeholder="' + K.esc(K.KODE_PREFIX) + '-____-____-____" data-fokus value="">' +
      '<p class="hint">Huruf besar/kecil tidak masalah, tanda hubung otomatis dirapikan.</p>' +
      '<p style="margin-top:18px"><button class="btn blok" type="submit">Cek kode</button></p>' +
    '</form>' +
    '<p class="hint" style="margin-top:16px">Sudah pernah daftar? <a href="#/masuk">Masuk</a>.</p>' +
    (function () {
      var w = K.waLink(S2.setelan('wa_nomor', ''),
        'Halo admin, saya sudah bayar tapi kode akses ' + K.APP_NAME + ' saya belum bisa dipakai. Mohon dibantu.');
      return w ? '<p class="hint" style="margin-top:6px">Kode bermasalah atau belum dapat? ' +
        '<a href="' + K.esc(w) + '" target="_blank" rel="noopener">Chat admin di WhatsApp</a>.</p>' : '';
    })() +
  '</div>';
};

A['redeem-cek'] = function (form) {
  // Batas 15 percobaan / 15 menit — cukup longgar untuk salah ketik.
  if (!S.rateOk('redeem', 15, 900)) {
    redeemState.err = 'Terlalu banyak percobaan. Coba lagi sekitar 15 menit, atau hubungi admin lewat <a href="#/tanya">Tanya Admin</a>.';
    U.render(); return;
  }
  var norm = K.kodeNormalize(U.nilai(form, 'kode'));
  if (!norm) {
    redeemState.err = 'Format kode tidak sesuai. Contoh: ' + K.KODE_PREFIX + '-A2B3-C4D5-E6F7';
    S.audit('redeem_gagal', null, 'format');
    S.simpan(); U.render(); return;
  }
  var st = S.statusKode(norm);
  if (st === 'ok') {
    redeemState.tahap = 'akun';
    redeemState.kode = norm;
    // Kode benar: bebaskan hitungan supaya salah ketik sebelumnya tidak
    // menghalangi pendaftaran.
    S.rateReset('redeem');
    U.render(); return;
  }
  redeemState.err =
    st === 'sudah_dipakai' ? 'Kode ini sudah dipakai untuk membuat akun. Silakan <a href="#/masuk">masuk</a>.' :
    st === 'dicabut' ? 'Kode ini sudah tidak berlaku. Hubungi admin.' :
    'Kode tidak ditemukan. Periksa lagi ketikannya.';
  S.audit('redeem_gagal', null, norm);
  S.simpan();
  U.render();
};

A['redeem-daftar'] = function (form) {
  redeemState.nama = U.nilai(form, 'nama');
  redeemState.email = U.nilai(form, 'email');
  var r = S.redeem(redeemState.kode, redeemState.nama, redeemState.email,
    U.nilai(form, 'password'), U.nilai(form, 'password2'));
  if (!r.ok) {
    redeemState.err = r.err + (r.keLogin ? ' <a href="#/masuk">Masuk</a>.' : '');
    if (r.keLogin) redeemState.tahap = 'kode';
    U.render(); return;
  }
  redeemState = { tahap: 'kode', kode: '', nama: '', email: '', err: '' };
  U.flash('ok', 'Akun aktif. Selamat belajar!');
  U.go('/dashboard');
};

A['redeem-ulang'] = function () {
  redeemState = { tahap: 'kode', kode: '', nama: '', email: '', err: '' };
  U.render();
};

/* ---------- masuk ---------- */
var masukErr = '';
R.masuk = function () {
  if (S.userAktif()) { U.go('/dashboard'); return false; }
  var err = masukErr ? '<div class="flash err">' + K.esc(masukErr) + '</div>' : '';
  masukErr = '';
  return '<div class="card sempit">' + err +
    '<h1>Masuk</h1>' +
    '<p class="sub">Pakai email dan password yang kamu buat saat menukar kode.</p>' +
    '<form data-aksi="masuk" novalidate>' +
      '<label for="email">Email</label>' +
      '<input id="email" name="email" type="email" required autocomplete="email" data-fokus>' +
      '<label for="password">Password</label>' +
      '<input id="password" name="password" type="password" required autocomplete="current-password">' +
      '<p style="margin-top:20px"><button class="btn blok" type="submit">Masuk</button></p>' +
    '</form>' +
    '<p class="hint" style="margin-top:16px">' +
      '<a href="#/lupa">Lupa password?</a> · Belum punya akun? <a href="#/redeem">Redeem kode</a>.' +
    '</p>' +
  '</div>';
};

A.masuk = function (form) {
  var r = S.login(U.nilai(form, 'email'), U.nilai(form, 'password'));
  if (!r.ok) { masukErr = r.err; U.render(); return; }
  U.flash('ok', 'Selamat datang kembali, ' + K.esc(r.user.nama) + '.');
  U.go(r.user.role === 'admin' ? '/admin' : '/dashboard');
};

R.keluar = function () {
  S.logout();
  U.flash('info', 'Kamu sudah keluar.');
  U.go('/');
  return false;
};

/* ---------- lupa password ---------- */
var lupaInfo = null;
R.lupa = function () {
  var info = '';
  if (lupaInfo) {
    info = lupaInfo.token
      ? '<div class="flash ok">Tautan reset dibuat. Karena mode HTML tidak mengirim email, ' +
        'buka tautan ini: <a href="#/reset?t=' + K.esc(lupaInfo.token) + '">setel password baru</a>.</div>'
      : '<div class="flash info">Kalau email itu terdaftar, tautan reset sudah dibuat.</div>';
    lupaInfo = null;
  }
  return '<div class="card sempit">' + info +
    '<h1>Lupa password</h1>' +
    '<p class="sub">Masukkan email akunmu. Di versi PHP tautan dikirim lewat email; ' +
      'di mode HTML tautannya ditampilkan langsung di sini.</p>' +
    '<form data-aksi="lupa" novalidate>' +
      '<label for="email">Email</label>' +
      '<input id="email" name="email" type="email" required data-fokus>' +
      '<p style="margin-top:20px"><button class="btn blok" type="submit">Buat tautan reset</button></p>' +
    '</form>' +
    '<p class="hint" style="margin-top:14px"><a href="#/masuk">Kembali ke halaman masuk</a></p>' +
  '</div>';
};

A.lupa = function (form) {
  var r = S2.resetMinta(U.nilai(form, 'email'));
  if (!r.ok) { U.flash('err', K.esc(r.err)); U.render(); return; }
  lupaInfo = r;
  U.render();
};

/* ---------- reset password ---------- */
var resetErr = '';
R.reset = function (rute) {
  var tok = rute.query.t || '';
  var err = resetErr ? '<div class="flash err">' + K.esc(resetErr) + '</div>' : '';
  resetErr = '';
  return '<div class="card sempit">' + err +
    '<h1>Setel password baru</h1>' +
    '<form data-aksi="reset" novalidate>' +
      '<input type="hidden" name="token" value="' + K.esc(tok) + '">' +
      '<label for="password">Password baru (min 8 karakter)</label>' +
      '<input id="password" name="password" type="password" required minlength="8" data-fokus autocomplete="new-password">' +
      '<label for="password2">Ulangi password baru</label>' +
      '<input id="password2" name="password2" type="password" required minlength="8" autocomplete="new-password">' +
      '<p style="margin-top:20px"><button class="btn blok" type="submit">Simpan password</button></p>' +
    '</form>' +
  '</div>';
};

A.reset = function (form) {
  var r = S2.resetPakai(U.nilai(form, 'token'), U.nilai(form, 'password'), U.nilai(form, 'password2'));
  if (!r.ok) { resetErr = r.err; U.render(); return; }
  U.flash('ok', 'Password berhasil diganti. Silakan masuk.');
  U.go('/masuk');
};
})();
