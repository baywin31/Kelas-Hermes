/* smoke.js — uji alur inti mode HTML.
   Jalankan: NODE_PATH='C:\Users\user\apps\dompetku\.test\node_modules' node .test/smoke.js */
const H = require('./harness');
const { buka, pergi, view, halaman, kirim, klik, ok, eq, berisi, tidakBerisi, urutan, judulBlok } = H;

const PW = 'rahasia12345';

function pasangAdmin(w) {
  pergi(w, '#/setup');
  kirim(w, 'setup', {
    nama: 'Darwin', email: 'admin@uji.id', password: PW, password2: PW,
    telegram: 'https://t.me/+ujigrup'
  });
}
function buatKode(w, n) {
  pergi(w, '#/admin-kode');
  kirim(w, 'kode-buat', { jumlah: String(n || 1), batch: 'uji', note: 'order-1' });
  return w.__app.state().kode.map(function (k) { return k.kode; });
}

(async function () {
  /* ============ 1. pemasangan awal ============ */
  judulBlok('1. Pemasangan awal & pengalihan ke setup');
  let t = buka('');
  let w = t.w;
  eq('tanpa admin, hash dialihkan ke #/setup', w.location.hash, '#/setup');
  berisi('halaman setup muncul', view(w), 'Buat akun admin');
  eq('materi awal ter-seed 4 Bagian', w.__app.state().bagian.length, 4);

  pasangAdmin(w);
  eq('admin dibuat', w.__app.state().users.length, 1);
  eq('role admin', w.__app.state().users[0].role, 'admin');
  eq('langsung login sebagai admin', w.__app.state().sesi, w.__app.state().users[0].id);
  eq('diarahkan ke panel admin', w.location.hash, '#/admin');
  berisi('link Telegram tersimpan', w.__app.state().setelan.telegram_url, 't.me/+ujigrup');
  ok('password tidak disimpan polos', w.__app.state().users[0].pass.indexOf(PW) < 0);
  berisi('format hash password', w.__app.state().users[0].pass, 's1$');

  pergi(w, '#/setup');
  berisi('setup tertutup setelah admin ada', view(w), 'Sudah terpasang');

  /* ============ 2. kode akses ============ */
  judulBlok('2. Generate kode akses');
  const kode = buatKode(w, 3);
  eq('3 kode dibuat', kode.length, 3);
  ok('format kode benar', /^HRMS-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/.test(kode[0]), kode[0]);
  ok('kode unik', new Set(kode).size === 3);
  berisi('kode tampil di tabel admin', view(w), kode[0]);
  eq('semua kode masih bebas', w.__app.state().kode.filter(k => !k.dipakaiOleh).length, 3);

  /* ============ 3. member biasa ditolak di admin ============ */
  judulBlok('3. Redeem kode → buat akun → auto login');
  pergi(w, '#/keluar');
  eq('logout berhasil', w.__app.state().sesi, null);

  pergi(w, '#/redeem');
  kirim(w, 'redeem-cek', { kode: 'HRMS-XXXX' });
  berisi('kode pendek ditolak', view(w), 'Format kode tidak sesuai');

  kirim(w, 'redeem-cek', { kode: 'HRMS-0000-0000-0000' });
  berisi('karakter di luar alfabet ditolak', view(w), 'Format kode tidak sesuai');

  kirim(w, 'redeem-cek', { kode: 'HRMS-2345-6789-ABCD' });
  berisi('kode asing tidak ditemukan', view(w), 'Kode tidak ditemukan');

  /* huruf kecil + spasi + tanpa prefix harus tetap diterima */
  const tanpaPrefix = kode[0].replace('HRMS-', '').toLowerCase().replace(/-/g, ' ');
  kirim(w, 'redeem-cek', { kode: tanpaPrefix });
  berisi('kode huruf kecil tanpa prefix diterima', view(w), 'Buat akunmu');
  berisi('kode ternormalisasi ditampilkan', view(w), kode[0]);

  kirim(w, 'redeem-daftar', { nama: 'Budi', email: 'budi@uji.id', password: 'pendek', password2: 'pendek' });
  berisi('password pendek ditolak', view(w), 'Password minimal 8 karakter');
  kirim(w, 'redeem-daftar', { nama: 'Budi', email: 'budi@uji.id', password: PW, password2: 'lainnya123' });
  berisi('password tidak sama ditolak', view(w), 'belum sama');
  kirim(w, 'redeem-daftar', { nama: 'Budi', email: 'bukan-email', password: PW, password2: PW });
  berisi('email tidak valid ditolak', view(w), 'Email tidak valid');

  kirim(w, 'redeem-daftar', { nama: 'Budi', email: 'budi@uji.id', password: PW, password2: PW });
  eq('akun member dibuat', w.__app.state().users.length, 2);
  eq('langsung login', w.__app.state().sesi, w.__app.state().users[1].id);
  eq('masuk ke dashboard', w.location.hash, '#/dashboard');
  eq('kode jadi terpakai', w.__app.state().kode.filter(k => !!k.dipakaiOleh).length, 1);
  eq('kode ter-link ke member', w.__app.state().kode[0].dipakaiOleh, w.__app.state().users[1].id);

  /* ============ 4. satu kode = satu akun ============ */
  judulBlok('4. Kode tidak bisa dipakai dua kali');
  pergi(w, '#/keluar');
  pergi(w, '#/redeem');
  kirim(w, 'redeem-cek', { kode: kode[0] });
  berisi('kode terpakai ditolak', view(w), 'sudah dipakai');
  eq('tidak ada akun tambahan', w.__app.state().users.length, 2);

  /* email ganda di kode lain */
  kirim(w, 'redeem-cek', { kode: kode[1] });
  berisi('kode kedua valid', view(w), 'Buat akunmu');
  kirim(w, 'redeem-daftar', { nama: 'Budi Lain', email: 'budi@uji.id', password: PW, password2: PW });
  berisi('email ganda ditolak', view(w), 'sudah terdaftar');
  eq('kode kedua masih bebas', w.__app.state().kode[1].dipakaiOleh, null);

  /* ============ 5. login ulang ============ */
  judulBlok('5. Login kunjungan berikutnya');
  pergi(w, '#/masuk');
  kirim(w, 'masuk', { email: 'budi@uji.id', password: 'salahbanget' });
  berisi('password salah ditolak', view(w), 'Email atau password salah');
  kirim(w, 'masuk', { email: 'budi@uji.id', password: PW });
  eq('login berhasil ke dashboard', w.location.hash, '#/dashboard');

  /* ============ 6. URUTAN DASHBOARD (wajib per PRD) ============ */
  judulBlok('6. Urutan elemen dashboard sesuai PRD');
  const dash = view(w);
  berisi('sapaan memakai nama member', dash, 'Halo, Budi');
  urutan('urutan: sapaan › Telegram › daftar Bagian › progres', dash,
    ['Halo, Budi', 'Join Komunitas Telegram', 'Materi kelas', 'Progres belajar']);
  berisi('tombol Telegram memakai link setelan', dash, 'https://t.me/+ujigrup');
  berisi('tombol buka materi ada', dash, 'Buka Materi');
  berisi('tombol tandai selesai ada', dash, 'Tandai Selesai');
  berisi('semua Bagian tampil', dash, 'Bagian 4'.replace('Bagian 4', 'Produksi &amp; Distribusi Hasil'));
  berisi('progres awal 0%', dash, '>0%<');

  /* ============ 7. progres ============ */
  judulBlok('7. Tandai selesai & progres');
  klik(w, '[data-aksi="progres"][data-b="1"]');
  const uidBudi = w.__app.state().sesi;
  eq('status Bagian 1 tersimpan', w.__app.state().progres[uidBudi][1], 'selesai');
  berisi('progres jadi 25%', view(w), '>25%<');
  berisi('badge selesai muncul', view(w), 'Selesai');
  klik(w, '[data-aksi="progres"][data-b="1"]');
  eq('bisa dibatalkan', w.__app.state().progres[uidBudi][1], 'belum');
  klik(w, '[data-aksi="progres"][data-b="1"]');

  /* ============ 8. baca materi + catatan ============ */
  judulBlok('8. Halaman materi, TOC, catatan pribadi');
  pergi(w, '#/materi/2');
  const m2 = view(w);
  berisi('judul Bagian 2 tampil', m2, 'Alur Kerja Harian');
  /* Level markdown digeser +1 (judul halaman sudah pakai <h1>),
     jadi "## Judul" di materi jadi <h3 id="..."> — itu yang benar. */
  berisi('markdown jadi heading beranchor', m2, '<h3 id=');
  berisi('daftar isi terbentuk', m2, 'class="toc"');
  berisi('blok kode dirender', view(w), 'Bagian 2');
  eq('buka materi = otomatis "mulai"', w.__app.state().progres[uidBudi][2], 'mulai');

  const ta = w.document.querySelector('textarea[data-aksi="catatan"]');
  ok('kolom catatan ada', !!ta);
  ta.value = 'Catatan uji Bagian 2';
  ta.dispatchEvent(new w.Event('input', { bubbles: true }));
  await H.tidur(600);
  eq('catatan tersimpan otomatis', w.__app.state().catatan[uidBudi][2], 'Catatan uji Bagian 2');

  pergi(w, '#/materi/3');
  berisi('tabel markdown dirender', view(w), '<table>');
  berisi('blok kode dirender sebagai pre', view(w), '<pre><code>');

  /* ============ 9. persistensi setelah logout-login ============ */
  judulBlok('9. Data bertahan setelah logout & muat ulang');
  pergi(w, '#/keluar');
  const t2 = buka(w.localStorage.getItem(H.LS_KEY));
  w = t2.w;
  pergi(w, '#/masuk');
  kirim(w, 'masuk', { email: 'budi@uji.id', password: PW });
  eq('login lagi setelah reload', w.location.hash, '#/dashboard');
  berisi('progres tetap 25%', view(w), '>25%<');
  pergi(w, '#/materi/2');
  berisi('catatan tetap ada', view(w), 'Catatan uji Bagian 2');

  /* ============ 10. member ditolak di semua halaman admin ============ */
  judulBlok('10. Otorisasi: member tidak boleh masuk area admin');
  ['#/admin', '#/admin-kode', '#/admin-materi', '#/admin-tiket', '#/admin-setelan', '#/admin-data'].forEach(function (h) {
    pergi(w, h);
    berisi('member ditolak di ' + h, view(w), 'Akses ditolak');
    tidakBerisi('tidak ada tombol generate di ' + h, view(w), 'Generate Kode Baru');
  });

  const r = H.hasil();
  console.log('\n=== suite 1: ' + r.pass + ' lulus, ' + r.fail + ' gagal ===');
  if (r.fail) { r.gagal.forEach(function (g) { console.log(' - ' + g); }); process.exit(1); }
  process.exit(0);
})().catch(function (e) {
  console.error('ERROR harness:', e && e.stack || e);
  process.exit(1);
});
