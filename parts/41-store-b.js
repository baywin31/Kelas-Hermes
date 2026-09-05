/* ============================================================
   Store bagian 2: materi, progres, catatan, tiket, reset password,
   setelan, export/import, dan hook __app untuk pengujian.
   ============================================================ */
(function () {
'use strict';
var K = window.KD, S = window.KD_STORE_1;
function st() { return S._get(); }

/* ---------- materi ---------- */
function bagianSemua() {
  return st().bagian.slice().sort(function (a, b) { return a.urutan - b.urutan; });
}
function bagianSatu(urutan) {
  urutan = parseInt(urutan, 10);
  var list = st().bagian;
  for (var i = 0; i < list.length; i++) if (list[i].urutan === urutan) return list[i];
  return null;
}
function bagianSimpan(urutan, judul, ringkas, isi_md) {
  var b = bagianSatu(urutan);
  judul = String(judul || '').trim();
  if (!judul) return { ok: false, err: 'Judul wajib diisi.' };
  if (!b) {
    b = { urutan: parseInt(urutan, 10), judul: judul, ringkas: '', isi_md: '', updated: 0 };
    st().bagian.push(b);
  }
  b.judul = judul.slice(0, 200);
  b.ringkas = String(ringkas || '').slice(0, 300);
  b.isi_md = String(isi_md || '');
  b.updated = K.now();
  S.audit('materi_simpan', st().sesi, 'bagian=' + b.urutan);
  S.simpan();
  return { ok: true, bagian: b };
}
function bagianHapus(urutan) {
  urutan = parseInt(urutan, 10);
  var b4 = st().bagian.length;
  st().bagian = st().bagian.filter(function (b) { return b.urutan !== urutan; });
  var ok = st().bagian.length < b4;
  if (ok) { S.audit('materi_hapus', st().sesi, 'bagian=' + urutan); S.simpan(); }
  return ok;
}
function bagianBaruNomor() {
  var max = 0;
  st().bagian.forEach(function (b) { if (b.urutan > max) max = b.urutan; });
  return max + 1;
}

/* ---------- progres ---------- */
function progresUser(uid) { return st().progres[uid] || {}; }
function progresSet(uid, bagian, status) {
  if (['belum', 'mulai', 'selesai'].indexOf(status) < 0) return false;
  if (!st().progres[uid]) st().progres[uid] = {};
  st().progres[uid][bagian] = status;
  S.audit('progres', uid, 'bagian=' + bagian + ' ' + status);
  S.simpan();
  return true;
}
function progresPersen(uid) {
  var list = bagianSemua(), p = progresUser(uid), selesai = 0;
  list.forEach(function (b) { if (p[b.urutan] === 'selesai') selesai++; });
  return { total: list.length, selesai: selesai,
    persen: list.length ? Math.round(selesai / list.length * 100) : 0 };
}

/* ---------- kunjungan & badge "Materi Baru" ---------- */
function kunjunganCatat(uid, bagian) {
  if (!st().kunjungan[uid]) st().kunjungan[uid] = {};
  var pertama = !st().kunjungan[uid][bagian];
  st().kunjungan[uid][bagian] = K.now();
  /* buka materi pertama kali = otomatis "sedang dipelajari" */
  var p = progresUser(uid);
  if (pertama && (!p[bagian] || p[bagian] === 'belum')) progresSet(uid, bagian, 'mulai');
  S.simpan();
}
function materiBaru(bagian, uid) {
  var seen = (st().kunjungan[uid] || {})[bagian.urutan] || 0;
  return seen === 0 ? false : bagian.updated > seen;
}

/* ---------- catatan pribadi ---------- */
function catatanAmbil(uid, bagian) { return (st().catatan[uid] || {})[bagian] || ''; }
function catatanSimpan(uid, bagian, isi) {
  if (!st().catatan[uid]) st().catatan[uid] = {};
  st().catatan[uid][bagian] = String(isi || '').slice(0, 20000);
  S.simpan();
}

/* ---------- pencarian materi ---------- */
function cariMateri(q) {
  q = String(q || '').trim().toLowerCase();
  if (q.length < 2) return [];
  return bagianSemua().map(function (b) {
    var hay = (b.judul + ' ' + b.ringkas + ' ' + b.isi_md).toLowerCase();
    var pos = hay.indexOf(q);
    if (pos < 0) return null;
    var src = b.isi_md, ip = src.toLowerCase().indexOf(q);
    var kutipan = ip >= 0
      ? K.mdExcerpt(src.slice(Math.max(0, ip - 70), ip + 130), 200)
      : K.mdExcerpt(b.ringkas, 160);
    return { bagian: b, kutipan: kutipan };
  }).filter(Boolean);
}

/* ---------- tiket "Tanya Admin" ---------- */
function tiketKirim(uid, isi) {
  isi = String(isi || '').trim();
  if (isi.length < 10) return { ok: false, err: 'Tulis pertanyaannya minimal 10 karakter.' };
  if (!S.rateOk('tiket:' + uid, 5, 3600)) return { ok: false, err: 'Sudah 5 pertanyaan dalam sejam. Tunggu sebentar ya.' };
  var u = S.cariUserId(uid);
  st().tiket.push({ id: K.uid(), uid: uid, nama: u ? u.nama : '-', email: u ? u.email : '-',
    isi: isi.slice(0, 4000), dibuat: K.now(), dibalas: false });
  S.audit('tiket', uid, '');
  S.simpan();
  return { ok: true };
}
function tiketTandai(id, nilai) {
  var t = st().tiket;
  for (var i = 0; i < t.length; i++) if (t[i].id === id) { t[i].dibalas = !!nilai; S.simpan(); return true; }
  return false;
}

/* ---------- lupa / reset password ---------- */
function resetMinta(email) {
  if (!S.rateOk('reset:' + String(email || '').toLowerCase(), 5, 900)) {
    return { ok: false, err: 'Terlalu sering. Coba lagi 15 menit.' };
  }
  var u = S.cariUserEmail(email);
  /* jawaban selalu sama supaya tidak bisa dipakai menebak email terdaftar */
  if (!u) return { ok: true, token: null };
  var tok = K.uid();
  st().reset[tok] = { uid: u.id, exp: K.now() + 3600 * 1000 };
  S.audit('reset_minta', u.id, '');
  S.simpan();
  return { ok: true, token: tok };
}
function resetPakai(token, pw, pw2) {
  var r = st().reset[token];
  if (!r || r.exp < K.now()) return { ok: false, err: 'Tautan reset tidak valid atau sudah kedaluwarsa.' };
  if (String(pw || '').length < 8) return { ok: false, err: 'Password minimal 8 karakter.' };
  if (pw !== pw2) return { ok: false, err: 'Dua kolom password belum sama.' };
  var u = S.cariUserId(r.uid);
  if (!u) return { ok: false, err: 'Akun tidak ditemukan.' };
  u.pass = K.pwBuat(pw);
  delete st().reset[token];
  S.audit('reset_pakai', u.id, '');
  S.simpan();
  return { ok: true };
}
function gantiPassword(uid, lama, baru, baru2) {
  var u = S.cariUserId(uid);
  if (!u) return { ok: false, err: 'Akun tidak ditemukan.' };
  if (!K.pwCocok(lama, u.pass)) return { ok: false, err: 'Password lama salah.' };
  if (String(baru || '').length < 8) return { ok: false, err: 'Password baru minimal 8 karakter.' };
  if (baru !== baru2) return { ok: false, err: 'Dua kolom password baru belum sama.' };
  u.pass = K.pwBuat(baru);
  S.audit('ganti_pw', uid, '');
  S.simpan();
  return { ok: true };
}

/* ---------- setelan ---------- */
function setelan(k, def) {
  var v = st().setelan[k];
  return (v === undefined || v === null || v === '') ? (def === undefined ? '' : def) : v;
}
function setelanSimpan(obj) {
  Object.keys(obj).forEach(function (k) { st().setelan[k] = obj[k]; });
  S.audit('setelan', st().sesi, Object.keys(obj).join(','));
  S.simpan();
  return { ok: true };
}
function faqSimpan(mdText) {
  st().faq_md = String(mdText || '');
  S.audit('faq_simpan', st().sesi, '');
  S.simpan();
  return { ok: true };
}

/* ---------- statistik admin ---------- */
function statistik() {
  var s = st();
  var dipakai = s.kode.filter(function (k) { return !!k.dipakaiOleh; }).length;
  var member = s.users.filter(function (u) { return u.role === 'member'; }).length;
  var selesaiSemua = 0;
  s.users.forEach(function (u) {
    if (u.role !== 'member') return;
    var p = progresPersen(u.id);
    if (p.total > 0 && p.selesai === p.total) selesaiSemua++;
  });
  return {
    kode_total: s.kode.length, kode_dipakai: dipakai, kode_sisa: s.kode.length - dipakai,
    member: member, tiket_baru: s.tiket.filter(function (t) { return !t.dibalas; }).length,
    tuntas: selesaiSemua, bagian: s.bagian.length
  };
}

/* ---------- export / import ---------- */
function exportJson() { return JSON.stringify(st(), null, 2); }
function importJson(text) {
  var obj;
  try { obj = JSON.parse(text); } catch (e) { return { ok: false, err: 'Berkas bukan JSON yang valid.' }; }
  if (!obj || typeof obj !== 'object' || !Array.isArray(obj.users)) {
    return { ok: false, err: 'Isi berkas tidak cocok dengan cadangan app ini.' };
  }
  var baru = S.normalisasi(obj);
  var lama = st();
  Object.keys(lama).forEach(function (k) { delete lama[k]; });
  Object.keys(baru).forEach(function (k) { lama[k] = baru[k]; });
  S.simpan();
  return { ok: true };
}
function kodeCsv() {
  var rows = [['kode', 'status', 'batch', 'catatan', 'dibuat', 'dipakai_pada', 'email_member']];
  st().kode.forEach(function (k) {
    var u = k.dipakaiOleh ? S.cariUserId(k.dipakaiOleh) : null;
    rows.push([k.kode, k.dicabut ? 'dicabut' : (k.dipakaiOleh ? 'dipakai' : 'bebas'),
      k.batch || '', k.note || '', K.tglJam(k.dibuat), k.dipakaiPada ? K.tglJam(k.dipakaiPada) : '',
      u ? u.email : '']);
  });
  return rows.map(function (r) {
    return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(',');
  }).join('\n');
}

window.KD_STORE_2 = {
  bagianSemua: bagianSemua, bagianSatu: bagianSatu, bagianSimpan: bagianSimpan,
  bagianHapus: bagianHapus, bagianBaruNomor: bagianBaruNomor,
  progresUser: progresUser, progresSet: progresSet, progresPersen: progresPersen,
  kunjunganCatat: kunjunganCatat, materiBaru: materiBaru,
  catatanAmbil: catatanAmbil, catatanSimpan: catatanSimpan, cariMateri: cariMateri,
  tiketKirim: tiketKirim, tiketTandai: tiketTandai,
  resetMinta: resetMinta, resetPakai: resetPakai, gantiPassword: gantiPassword,
  setelan: setelan, setelanSimpan: setelanSimpan, faqSimpan: faqSimpan,
  statistik: statistik, exportJson: exportJson, importJson: importJson, kodeCsv: kodeCsv
};
})();
