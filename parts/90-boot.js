/* ============================================================
   Pemasangan awal (admin pertama), inisialisasi, dan hook pengujian.
   ============================================================ */
(function () {
'use strict';
var K = window.KD, S = window.KD_STORE_1, S2 = window.KD_STORE_2;
var U = window.KD_UI, R = U.routes, A = window.KD_AKSI;

function adaAdmin() {
  return S._get().users.some(function (u) { return u.role === 'admin'; });
}

/* ---------- setup: bikin akun admin pertama ---------- */
var setupErr = '';
R.setup = function () {
  if (adaAdmin()) {
    return '<div class="card sempit"><h1>Sudah terpasang</h1>' +
      '<p class="sub">Akun admin sudah ada. Masuk untuk mengelola kelas.</p>' +
      '<p><a class="btn" href="#/masuk">Masuk</a></p></div>';
  }
  var err = setupErr ? '<div class="flash err">' + K.esc(setupErr) + '</div>' : '';
  setupErr = '';
  return '<div class="card sempit">' + err +
    '<span class="eyebrow">Pemasangan · sekali saja</span>' +
    '<h1>Buat akun admin</h1>' +
    '<p class="sub">Akun ini yang membuat kode akses dan mengedit materi. ' +
      'Halaman ini hilang sendiri setelah admin pertama dibuat.</p>' +
    '<form data-aksi="setup" novalidate>' +
      '<label for="nama">Nama</label>' +
      '<input id="nama" name="nama" required maxlength="120" data-fokus value="">' +
      '<label for="email">Email admin</label>' +
      '<input id="email" name="email" type="email" required maxlength="190">' +
      '<label for="password">Password (min 8 karakter)</label>' +
      '<input id="password" name="password" type="password" required minlength="8" autocomplete="new-password">' +
      '<label for="password2">Ulangi password</label>' +
      '<input id="password2" name="password2" type="password" required minlength="8" autocomplete="new-password">' +
      '<label for="telegram">Link grup Telegram (boleh diisi nanti)</label>' +
      '<input id="telegram" name="telegram" placeholder="https://t.me/…">' +
      '<label for="wa">Nomor WhatsApp kamu (boleh diisi nanti)</label>' +
      '<input id="wa" name="wa" placeholder="081234567890">' +
      '<p style="margin-top:20px"><button class="btn blok" type="submit">Pasang &amp; masuk</button></p>' +
    '</form>' +
    '<hr style="border:0;border-top:1px solid var(--line);margin:26px 0 18px">' +
    '<p class="hint" style="margin-top:0">Mau lihat isinya dulu tanpa mengisi apa-apa? ' +
      'Tombol ini membuat 1 admin, 1 member, dan 3 kode contoh.</p>' +
    '<p><button class="btn ghost blok" data-aksi="demo-isi">Isi data demo</button></p>' +
  '</div>';
};

A['demo-isi'] = function () {
  var d = demoSeed();
  U.flash('ok', 'Data demo terpasang. Admin ' + d.admin + ' · member ' + d.member +
    ' · password keduanya ' + d.password + '. Kode contoh yang belum dipakai: ' + d.kode.join(', '));
  U.go('/masuk');
};

function buatAdmin(nama, email, pw, pw2, telegram, wa) {
  nama = String(nama || '').trim();
  email = String(email || '').trim().toLowerCase();
  if (adaAdmin()) return { ok: false, err: 'Akun admin sudah ada.' };
  if (!nama) return { ok: false, err: 'Nama wajib diisi.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, err: 'Email tidak valid.' };
  if (String(pw || '').length < 8) return { ok: false, err: 'Password minimal 8 karakter.' };
  if (pw !== pw2) return { ok: false, err: 'Dua kolom password belum sama.' };
  if (S.cariUserEmail(email)) return { ok: false, err: 'Email itu sudah terdaftar.' };
  // Nomor WA opsional, tapi kalau diisi harus benar — daripada dipasang
  // setengah jalan lalu tombolnya tidak bisa dibuka pembeli.
  var waIsi = String(wa || '').trim();
  var waBersih = waIsi === '' ? '' : K.waNormal(waIsi);
  if (waIsi !== '' && waBersih === '') {
    return { ok: false, err: 'Nomor WhatsApp tidak masuk akal. Contoh: 081234567890.' };
  }

  var u = { id: K.uid(), nama: nama, email: email, pass: K.pwBuat(pw),
    role: 'admin', kode: null, dibuat: K.now() };
  S._get().users.push(u);
  var setelanBaru = {};
  if (/^https?:\/\//i.test(String(telegram || '').trim())) setelanBaru.telegram_url = String(telegram).trim();
  if (waBersih) setelanBaru.wa_nomor = waBersih;
  if (Object.keys(setelanBaru).length) S2.setelanSimpan(setelanBaru);
  S._get().sesi = u.id;
  S.audit('setup_admin', u.id, email);
  S.simpan();
  return { ok: true, user: u };
}

A.setup = function (form) {
  var r = buatAdmin(U.nilai(form, 'nama'), U.nilai(form, 'email'),
    U.nilai(form, 'password'), U.nilai(form, 'password2'),
    U.nilai(form, 'telegram'), U.nilai(form, 'wa'));
  if (!r.ok) { setupErr = r.err; U.render(); return; }
  U.flash('ok', 'Pemasangan selesai. Mulai dari Kode akses untuk membuat kode pembeli.');
  U.go('/admin');
};

/* ---------- inisialisasi ---------- */
var sudahMulai = false;
function mulai() {
  if (sudahMulai) { U.render(); return; }
  sudahMulai = true;
  S._set(S.muat());

  /* Belum ada admin sama sekali → arahkan ke pemasangan. */
  if (!adaAdmin()) {
    var r = U.parseHash();
    if (r.nama !== 'setup') { window.location.hash = '#/setup'; }
  }

  window.addEventListener('hashchange', U.render);
  U.render();
}

/* ---------- demo cepat: admin + member + kode contoh ---------- */
function demoSeed() {
  var st = S._get();
  st.users = [];
  st.kode = [];
  st.progres = {}; st.catatan = {}; st.kunjungan = {}; st.tiket = []; st.rate = {}; st.reset = {};
  st.sesi = null;
  S.seedIsi(st);

  var admin = { id: K.uid(), nama: 'Darwin', email: 'admin@demo.id', pass: K.pwBuat('demo12345'),
    role: 'admin', kode: null, dibuat: K.now() - 86400000 * 9 };
  st.users.push(admin);

  var kode = S.buatKode(4, 'demo', 'contoh order');
  var member = { id: K.uid(), nama: 'Budi', email: 'budi@demo.id', pass: K.pwBuat('demo12345'),
    role: 'member', kode: kode[0], dibuat: K.now() - 86400000 * 2 };
  st.users.push(member);
  var k0 = S.cariKode(kode[0]);
  k0.dipakaiOleh = member.id;
  k0.dipakaiPada = K.now() - 86400000 * 2;

  S2.progresSet(member.id, 1, 'selesai');
  S2.progresSet(member.id, 2, 'mulai');
  S2.catatanSimpan(member.id, 1, 'Provider sempat salah nama, sudah dibetulkan.');
  S2.tiketKirim(member.id, 'Di Bagian 3, cron saya jalan tapi hasilnya kosong. Kira-kira salah di mana ya?');
  S.simpan();
  return { admin: admin.email, member: member.email, password: 'demo12345', kode: kode.slice(1) };
}

/* Hook pengujian: dipakai .test/smoke.js, bukan bagian dari UI. */
window.__app = {
  K: K, store: S, store2: S2, ui: U, aksi: A,
  state: function () { return S._get(); },
  render: U.render, go: U.go, mulai: mulai,
  muatUlang: function () { S._set(S.muat()); U.render(); },
  reset: function (denganSeed) {
    var s = S.kosong();
    if (denganSeed !== false) S.seedIsi(s);
    S._set(s);
    S.simpan();
    return s;
  },
  buatAdmin: buatAdmin, adaAdmin: adaAdmin, demoSeed: demoSeed
};

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai);
  else mulai();
}
})();
