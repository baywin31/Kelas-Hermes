/* smoke2.js — fitur lanjutan mode HTML: admin CMS, tiket, reset password,
   cari, setelan, cadangan, badge materi baru, rate limit, keamanan.
   Jalankan: NODE_PATH='C:\Users\user\apps\dompetku\.test\node_modules' node .test/smoke2.js */
const H = require('./harness');
const { buka, pergi, view, halaman, kirim, klik, ok, eq, berisi, tidakBerisi, judulBlok } = H;

const PW = 'rahasia12345';

function pasangAdmin(w) {
  pergi(w, '#/setup');
  kirim(w, 'setup', {
    nama: 'Darwin', email: 'admin@uji.id', password: PW, password2: PW,
    telegram: 'https://t.me/+grupuji'
  });
}
function buatKode(w, n, batch) {
  pergi(w, '#/admin-kode');
  kirim(w, 'kode-buat', { jumlah: String(n || 1), batch: batch || 'uji', note: 'order' });
  return w.__app.state().kode.map(k => k.kode);
}
function daftarMember(w, kode, nama, email) {
  pergi(w, '#/redeem');
  kirim(w, 'redeem-cek', { kode: kode });
  kirim(w, 'redeem-daftar', { nama: nama, email: email, password: PW, password2: PW });
}
function masuk(w, email, pw) {
  pergi(w, '#/masuk');
  kirim(w, 'masuk', { email: email, password: pw || PW });
}

(async function () {
  let t = buka('');
  let w = t.w;

  /* ============ 1. admin CMS: edit materi ============ */
  judulBlok('1. Admin edit materi (CMS tanpa deploy ulang)');
  pasangAdmin(w);
  pergi(w, '#/admin-materi?b=1');
  berisi('editor materi terbuka', view(w), 'Edit Bagian 1');
  berisi('isi markdown termuat di textarea', view(w), 'name="isi_md"');

  kirim(w, 'materi-simpan', {
    urutan: '1', judul: 'Bagian Satu Diedit', ringkas: 'ringkas baru',
    isi_md: '## Sub Judul Baru\n\nIsi paragraf hasil edit admin.\n\n- poin satu\n- poin dua'
  });
  const b1 = w.__app.state().bagian.find(b => b.urutan === 1);
  eq('judul tersimpan', b1.judul, 'Bagian Satu Diedit');
  berisi('isi tersimpan', b1.isi_md, 'Isi paragraf hasil edit admin');
  ok('updated tercatat', b1.updated > 0);

  /* judul kosong ditolak */
  kirim(w, 'materi-simpan', { urutan: '1', judul: '   ', ringkas: '', isi_md: 'x' });
  berisi('judul kosong ditolak', halaman(w), 'Judul wajib diisi');
  eq('judul lama dipertahankan', w.__app.state().bagian.find(b => b.urutan === 1).judul, 'Bagian Satu Diedit');

  /* pratinjau */
  pergi(w, '#/admin-materi?b=1');
  const ta = w.document.getElementById('isi_md');
  ta.value = '## Pratinjau Cek\n\nteks pratinjau';
  klik(w, '[data-aksi="materi-pratinjau"]');
  berisi('pratinjau merender markdown', view(w), 'Pratinjau Cek');
  tidakBerisi('pratinjau tidak menyimpan', w.__app.state().bagian.find(b => b.urutan === 1).isi_md, 'Pratinjau Cek');

  /* Bagian baru */
  const nomorBaru = w.__app.state().bagian.length + 1;
  pergi(w, '#/admin-materi?b=' + nomorBaru);
  berisi('form Bagian baru', view(w), 'Bagian baru (nomor ' + nomorBaru + ')');
  kirim(w, 'materi-simpan', {
    urutan: String(nomorBaru), judul: 'Bagian Bonus', ringkas: 'tambahan',
    isi_md: '## Bonus\n\nMateri bonus.'
  });
  eq('bagian bertambah', w.__app.state().bagian.length, nomorBaru);

  /* hapus Bagian bonus */
  pergi(w, '#/admin-materi?b=' + nomorBaru);
  klik(w, '[data-aksi="materi-hapus"]');
  eq('bagian terhapus', w.__app.state().bagian.length, nomorBaru - 1);

  /* FAQ */
  pergi(w, '#/admin-materi?b=1');
  kirim(w, 'faq-simpan', { faq_md: '## Kenapa error 403?\n\nCek nama provider di config.' });
  berisi('FAQ tersimpan', w.__app.state().faq_md, 'error 403');

  /* ============ 2. setelan ============ */
  judulBlok('2. Setelan: Telegram, kontak admin, tautan penting');
  pergi(w, '#/admin-setelan');
  kirim(w, 'setelan-simpan', {
    telegram_url: 'https://t.me/+grupbaru',
    admin_kontak: 'https://t.me/darwin',
    links: 'Flaz Cloud | https://flazcloud.com | pakai referral\nDokumentasi | https://hermes-agent.nousresearch.com/docs |\nrusak-tanpa-url | bukan-url | abaikan'
  });
  const setel = w.__app.state().setelan;
  eq('telegram tersimpan', setel.telegram_url, 'https://t.me/+grupbaru');
  eq('kontak admin tersimpan', setel.admin_kontak, 'https://t.me/darwin');
  eq('hanya tautan http yang diterima', setel.links.length, 2);
  eq('judul tautan terparse', setel.links[0].judul, 'Flaz Cloud');

  /* ============ 3. statistik admin ============ */
  judulBlok('3. Ringkasan admin');
  const kode = buatKode(w, 3, 'batch-a');
  pergi(w, '#/admin');
  berisi('kartu kode total', view(w), 'Kode akses');
  const stat = w.__app.store2.statistik();
  eq('kode_total 3', stat.kode_total, 3);
  eq('kode_sisa 3', stat.kode_sisa, 3);
  eq('member 0', stat.member, 0);

  /* ============ 4. cabut kode ============ */
  judulBlok('4. Cabut kode yang belum dipakai');
  pergi(w, '#/admin-kode');
  klik(w, '[data-aksi="kode-cabut"][data-kode="' + kode[2] + '"]');
  eq('kode dicabut', w.__app.state().kode.find(k => k.kode === kode[2]).dicabut, true);
  pergi(w, '#/keluar');
  pergi(w, '#/redeem');
  kirim(w, 'redeem-cek', { kode: kode[2] });
  berisi('kode dicabut tidak bisa dipakai', view(w), 'tidak berlaku');

  /* ============ 5. member: cari, FAQ, tanya admin ============ */
  judulBlok('5. Member: cari materi, FAQ, tanya admin');
  daftarMember(w, kode[0], 'Budi', 'budi@uji.id');
  const uidBudi = w.__app.state().sesi;

  pergi(w, '#/cari?q=a');
  berisi('query < 2 karakter ditolak', view(w), 'minimal 2 karakter');
  pergi(w, '#/cari?q=' + encodeURIComponent('paragraf hasil edit'));
  berisi('hasil pencarian isi materi', view(w), 'Bagian Satu Diedit');
  pergi(w, '#/cari?q=' + encodeURIComponent('kata-yang-mustahil-ada'));
  berisi('pencarian kosong', view(w), 'Tidak ada Bagian');

  pergi(w, '#/faq');
  berisi('FAQ tampil untuk member', view(w), 'error 403');

  pergi(w, '#/tanya');
  berisi('tombol chat admin memakai kontak setelan', view(w), 'https://t.me/darwin');
  kirim(w, 'tanya', { isi: 'pendek' });
  berisi('pertanyaan terlalu pendek ditolak', halaman(w), 'minimal 10 karakter');
  kirim(w, 'tanya', { isi: 'Cron saya jalan tapi hasil kosong, ini di Bagian 3. Kenapa ya?' });
  eq('tiket masuk', w.__app.state().tiket.length, 1);
  berisi('tiket tampil di riwayat member', view(w), 'Menunggu');

  /* rate limit tiket: 5 per jam */
  for (let i = 0; i < 5; i++) kirim(w, 'tanya', { isi: 'Pertanyaan berulang nomor ' + i + ' untuk uji rate limit.' });
  eq('tiket berhenti di 5 (rate limit)', w.__app.state().tiket.length, 5);
  berisi('pesan rate limit muncul', halaman(w), 'Tunggu sebentar');

  /* ============ 6. profil member ============ */
  judulBlok('6. Profil: riwayat kode & tanggal join');
  pergi(w, '#/profil');
  const prof = view(w);
  berisi('email tampil', prof, 'budi@uji.id');
  berisi('kode yang dipakai tampil', prof, kode[0]);
  berisi('tanggal tukar kode tampil', prof, 'Kode ditukar');

  kirim(w, 'ganti-pw', { lama: 'salah', baru: 'passwordbaru123', baru2: 'passwordbaru123' });
  berisi('password lama salah ditolak', halaman(w), 'Password lama salah');
  kirim(w, 'ganti-pw', { lama: PW, baru: 'passwordbaru123', baru2: 'passwordbaru123' });
  berisi('ganti password berhasil', halaman(w), 'Password');
  pergi(w, '#/keluar');
  masuk(w, 'budi@uji.id', 'passwordbaru123');
  eq('login pakai password baru', w.location.hash, '#/dashboard');

  /* ============ 7. badge materi baru ============ */
  judulBlok('7. Badge "Materi Baru" setelah admin update');
  pergi(w, '#/materi/2');            /* kunjungan tercatat */
  pergi(w, '#/keluar');
  masuk(w, 'admin@uji.id', PW);
  pergi(w, '#/admin-materi?b=2');
  kirim(w, 'materi-simpan', {
    urutan: '2', judul: w.__app.state().bagian.find(b => b.urutan === 2).judul,
    ringkas: 'diupdate', isi_md: '## Update\n\nAda tambahan penting di sini.'
  });
  pergi(w, '#/keluar');
  masuk(w, 'budi@uji.id', 'passwordbaru123');
  berisi('badge Materi Baru muncul di dashboard', view(w), 'Materi Baru');
  ok('helper materiBaru true', w.__app.store2.materiBaru(
    w.__app.state().bagian.find(b => b.urutan === 2), uidBudi) === true);
  pergi(w, '#/materi/2');
  pergi(w, '#/dashboard');
  tidakBerisi('badge hilang setelah dibuka', view(w), 'Materi Baru');

  /* ============ 8. admin: kelola tiket ============ */
  judulBlok('8. Admin menandai pertanyaan selesai');
  pergi(w, '#/keluar');
  masuk(w, 'admin@uji.id', PW);
  pergi(w, '#/admin-tiket');
  berisi('pertanyaan member tampil di admin', view(w), 'Cron saya jalan');
  berisi('email penanya tampil', view(w), 'budi@uji.id');
  const idTiket = w.__app.state().tiket[0].id;
  klik(w, '[data-aksi="tiket-tandai"][data-id="' + idTiket + '"]');
  eq('tiket ditandai dibalas', w.__app.state().tiket[0].dibalas, true);

  /* ============ 9. tombol "Isi data demo" di halaman setup ============ */
  judulBlok('9. Tombol data demo (untuk pameran ke calon pembeli)');
  let td = buka('');
  let wd = td.w;
  pergi(wd, '#/setup');
  berisi('tombol demo ada di setup', view(wd), 'data-aksi="demo-isi"');
  klik(wd, '[data-aksi="demo-isi"]');
  const sd = wd.__app.state();
  eq('demo: 1 admin + 1 member', sd.users.length, 2);
  eq('demo: 4 kode dibuat', sd.kode.length, 4);
  eq('demo: 1 kode terpakai', sd.kode.filter(k => !!k.dipakaiOleh).length, 1);
  eq('demo: tidak auto-login', sd.sesi, null);
  berisi('kredensial demo ditampilkan', halaman(wd), 'admin@demo.id');
  kirim(wd, 'masuk', { email: 'budi@demo.id', password: 'demo12345' });
  eq('member demo bisa login', wd.location.hash, '#/dashboard');
  berisi('progres demo terpasang', view(wd), '>25%<');
  pergi(wd, '#/keluar');
  pergi(wd, '#/masuk');
  kirim(wd, 'masuk', { email: 'admin@demo.id', password: 'demo12345' });
  pergi(wd, '#/admin-tiket');
  berisi('tiket demo ada', view(wd), 'cron saya jalan');

  const r = H.hasil();
  console.log('\n=== suite 2: ' + r.pass + ' lulus, ' + r.fail + ' gagal ===');
  if (r.fail) { r.gagal.forEach(g => console.log(' - ' + g)); process.exit(1); }
  process.exit(0);
})().catch(function (e) {
  console.error('ERROR harness:', e && e.stack || e);
  process.exit(1);
});
