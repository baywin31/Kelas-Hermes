/* ============================================================
   State + penyimpanan (localStorage). Semua mutasi lewat sini.
   ============================================================ */
(function () {
'use strict';
var K = window.KD;

var state = null;

function kosong() {
  return {
    versi: 1,
    users: [],        /* {id,nama,email,pass,role,kode,dibuat} */
    kode: [],         /* {kode,batch,note,dibuat,dipakaiOleh,dipakaiPada,dicabut} */
    bagian: [],       /* {urutan,judul,ringkas,isi_md,updated} */
    faq_md: '',
    setelan: {},
    progres: {},      /* uid -> {bagian: 'belum'|'mulai'|'selesai'} */
    catatan: {},      /* uid -> {bagian: teks} */
    kunjungan: {},    /* uid -> {bagian: ts} */
    tiket: [],        /* {id,uid,nama,email,isi,dibuat,dibalas} */
    rate: {},         /* bucket -> {hits,started} */
    audit: [],        /* {ev,uid,detail,ts} */
    sesi: null,       /* uid yang login */
    reset: {}         /* token -> {uid,exp} */
  };
}

function seedIsi(s) {
  var seed = window.KD_SEED;
  s.bagian = seed.bagian.map(function (b) {
    return { urutan: b.urutan, judul: b.judul, ringkas: b.ringkas, isi_md: b.isi_md, updated: K.now() };
  });
  s.faq_md = seed.faq_md;
  s.setelan = {
    telegram_url: seed.setelan.telegram_url,
    admin_kontak: seed.setelan.admin_kontak,
    wa_nomor: seed.setelan.wa_nomor || '',
    wa_pesan: seed.setelan.wa_pesan || '',
    links: seed.setelan.links.slice()
  };
  return s;
}

function normalisasi(s) {
  var d = kosong();
  Object.keys(d).forEach(function (k) {
    if (s[k] === undefined || s[k] === null) s[k] = d[k];
  });
  if (!Array.isArray(s.bagian) || !s.bagian.length) seedIsi(s);
  if (!s.setelan || typeof s.setelan !== 'object') s.setelan = {};
  if (!Array.isArray(s.setelan.links)) s.setelan.links = [];
  ['progres', 'catatan', 'kunjungan', 'rate', 'reset'].forEach(function (k) {
    if (typeof s[k] !== 'object' || Array.isArray(s[k]) || !s[k]) s[k] = {};
  });
  ['users', 'kode', 'tiket', 'audit'].forEach(function (k) {
    if (!Array.isArray(s[k])) s[k] = [];
  });
  return s;
}

function muat() {
  var raw = null;
  try { raw = window.localStorage.getItem(K.LS_KEY); } catch (e) { raw = null; }
  if (!raw) return seedIsi(kosong());
  try { return normalisasi(JSON.parse(raw)); }
  catch (e) { return seedIsi(kosong()); }   /* data rusak: jangan bikin app mati */
}

function simpan() {
  try { window.localStorage.setItem(K.LS_KEY, JSON.stringify(state)); }
  catch (e) { /* kuota penuh / mode privat: app tetap jalan untuk sesi ini */ }
}

/* ---------- audit ---------- */
function audit(ev, uid, detail) {
  state.audit.push({ ev: ev, uid: uid || null, detail: String(detail || '').slice(0, 300), ts: K.now() });
  if (state.audit.length > 400) state.audit = state.audit.slice(-400);
}

/* ---------- rate limit ---------- */
function rateOk(bucket, max, windowSec) {
  var r = state.rate[bucket];
  var t = Math.floor(K.now() / 1000);
  if (!r || (t - r.started) > windowSec) {
    state.rate[bucket] = { hits: 1, started: t };
    simpan();
    return true;
  }
  r.hits++;
  simpan();
  return r.hits <= max;
}
function rateReset(bucket) { delete state.rate[bucket]; simpan(); }

/* ---------- user ---------- */
function userAktif() {
  if (!state.sesi) return null;
  var u = cariUserId(state.sesi);
  if (!u) { state.sesi = null; simpan(); return null; }
  return u;
}
function cariUserId(id) {
  for (var i = 0; i < state.users.length; i++) if (state.users[i].id === id) return state.users[i];
  return null;
}
function cariUserEmail(email) {
  var e = String(email || '').trim().toLowerCase();
  for (var i = 0; i < state.users.length; i++) if (state.users[i].email === e) return state.users[i];
  return null;
}
function login(email, pw) {
  var bucket = 'login:' + String(email || '').toLowerCase();
  if (!rateOk(bucket, 8, 900)) return { ok: false, err: 'Terlalu banyak percobaan. Coba lagi sekitar 15 menit, atau pakai Lupa password.' };
  var u = cariUserEmail(email);
  if (!u || !K.pwCocok(pw, u.pass)) {
    audit('login_gagal', null, String(email || ''));
    simpan();
    return { ok: false, err: 'Email atau password salah.' };
  }
  state.sesi = u.id;
  rateReset(bucket);
  audit('login', u.id, '');
  simpan();
  return { ok: true, user: u };
}
function logout() {
  var u = state.sesi;
  state.sesi = null;
  audit('logout', u, '');
  simpan();
}

/* ---------- kode akses ---------- */
function cariKode(kode) {
  for (var i = 0; i < state.kode.length; i++) if (state.kode[i].kode === kode) return state.kode[i];
  return null;
}
function statusKode(kode) {
  var r = cariKode(kode);
  if (!r) return 'tidak_ada';
  if (r.dicabut) return 'dicabut';
  if (r.dipakaiOleh) return 'sudah_dipakai';
  return 'ok';
}
function buatKode(jumlah, batch, note) {
  jumlah = Math.max(1, Math.min(500, parseInt(jumlah, 10) || 1));
  var hasil = [];
  for (var i = 0; i < jumlah; i++) {
    var k, coba = 0;
    do { k = K.kodeGenerate(); coba++; } while (cariKode(k) && coba < 8);
    if (cariKode(k)) continue;
    state.kode.push({ kode: k, batch: String(batch || ''), note: String(note || ''),
      dibuat: K.now(), dipakaiOleh: null, dipakaiPada: null, dicabut: false });
    hasil.push(k);
  }
  audit('kode_buat', state.sesi, hasil.length + ' kode');
  simpan();
  return hasil;
}
function cabutKode(kode, nilai) {
  var r = cariKode(kode);
  if (!r || r.dipakaiOleh) return false;
  r.dicabut = !!nilai;
  audit(nilai ? 'kode_cabut' : 'kode_aktif', state.sesi, kode);
  simpan();
  return true;
}

/* ---------- redeem: kode valid → akun baru → langsung login ---------- */
function redeem(kodeRaw, nama, email, pw, pw2) {
  var norm = K.kodeNormalize(kodeRaw);
  if (!norm) return { ok: false, err: 'Format kode tidak sesuai. Contoh: HRMS-A2B3-C4D5-E6F7' };
  var st = statusKode(norm);
  if (st === 'tidak_ada') return { ok: false, err: 'Kode tidak ditemukan. Periksa lagi ketikannya.' };
  if (st === 'dicabut') return { ok: false, err: 'Kode ini sudah tidak berlaku. Hubungi admin.' };
  if (st === 'sudah_dipakai') return { ok: false, err: 'Kode ini sudah dipakai untuk membuat akun.', keLogin: true };

  nama = String(nama || '').trim();
  email = String(email || '').trim().toLowerCase();
  if (!nama || nama.length > 120) return { ok: false, err: 'Nama wajib diisi (maksimal 120 karakter).' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, err: 'Email tidak valid.' };
  if (String(pw || '').length < 8) return { ok: false, err: 'Password minimal 8 karakter.' };
  if (pw !== pw2) return { ok: false, err: 'Dua kolom password belum sama.' };
  if (cariUserEmail(email)) return { ok: false, err: 'Email itu sudah terdaftar. Silakan masuk atau pakai email lain.', keLogin: true };

  var row = cariKode(norm);
  if (row.dipakaiOleh) return { ok: false, err: 'Kode baru saja dipakai.', keLogin: true };

  var u = { id: K.uid(), nama: nama, email: email, pass: K.pwBuat(pw),
    role: 'member', kode: norm, dibuat: K.now() };
  state.users.push(u);
  row.dipakaiOleh = u.id;
  row.dipakaiPada = K.now();
  state.sesi = u.id;
  audit('redeem_sukses', u.id, norm);
  simpan();
  return { ok: true, user: u };
}

/* Muat sekali saat berkas ini dievaluasi, supaya tidak ada jendela waktu
   di mana state masih null (mis. pengujian yang merender sebelum
   DOMContentLoaded). mulai() memuatnya ulang, dan itu tidak berbahaya. */
state = muat();

window.KD_STORE_1 = {
  kosong: kosong, seedIsi: seedIsi, normalisasi: normalisasi, muat: muat, simpan: simpan,
  audit: audit, rateOk: rateOk, rateReset: rateReset,
  userAktif: userAktif, cariUserId: cariUserId, cariUserEmail: cariUserEmail,
  login: login, logout: logout,
  cariKode: cariKode, statusKode: statusKode, buatKode: buatKode, cabutKode: cabutKode,
  redeem: redeem,
  _set: function (s) { state = s; },
  /* Muat malas: kalau ada yang memakai state sebelum mulai() jalan
     (mis. harness pengujian), jangan biarkan null. */
  _get: function () { if (!state) state = muat(); return state; }
};
})();
