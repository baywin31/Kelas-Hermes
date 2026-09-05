/* cek-rahasia-git.js — pastikan tidak ada kredensial nyata di dalam objek git.

   Kenapa harus skrip, bukan `git grep`: `git grep HEAD` hanya melihat berkas di
   commit terakhir. Sandi bisa tertinggal di OBJEK BLOB dari commit/amend
   sebelumnya, dan objek itulah yang ikut terkirim saat push. Skrip ini memeriksa
   SEMUA blob yang ada di database git.

   Nilai rahasianya dibaca dari berkas kredensial di working dir (yang memang
   tidak diversikan) dan TIDAK PERNAH dicetak — yang dicetak hanya nama berkas
   sumbernya dan verdict-nya.

   Pemakaian: node cek-rahasia-git.js   (exit 1 kalau ada yang bocor) */
const fs = require('fs');
const { execSync } = require('child_process');

const APP = process.cwd();

/* Kumpulkan nilai rahasia dari berkas yang tidak diversikan. */
const rahasia = [];
const tambah = (nilai, asal, keras = true) => {
  const v = String(nilai || '').trim();
  // Nilai terlalu pendek akan cocok dengan teks biasa dan membuat laporan palsu.
  if (v.length >= 6) rahasia.push({ nilai: v, asal, keras });
};

['.ftp', '.ftp2', '.cpanel'].forEach((f) => {
  if (!fs.existsSync(APP + '/' + f)) return;
  const isi = fs.readFileSync(APP + '/' + f, 'utf8').trim();
  const p = isi.indexOf(':');
  if (p > 0) {
    tambah(isi.slice(p + 1), f + ' (sandi FTP)');
    // Nama akun bukan rahasia dengan sendirinya, dan bentuknya sering sama
    // dengan alamat email contoh di formulir ("placeholder="). Dilaporkan
    // sebagai peringatan supaya bisa dilihat, tapi tidak memblokir push —
    // kalau ini memblokir, orang akan berhenti mempercayai skripnya.
    tambah(isi.slice(0, p), f + ' (nama akun FTP)', false);
  }
});

['_config.php', '_config.local.php', '_config.prod.php'].forEach((f) => {
  if (!fs.existsSync(APP + '/' + f)) return;
  const isi = fs.readFileSync(APP + '/' + f, 'utf8');
  const m = isi.match(/DB_PASS\s*=\s*'([^']*)'/);
  if (m) tambah(m[1], f + ' (sandi DB)');
});

if (fs.existsSync(APP + '/.cpanel')) {
  tambah(fs.readFileSync(APP + '/.cpanel', 'utf8').split(/[\s:]+/).pop(), '.cpanel');
}

if (!rahasia.length) {
  console.log('Tidak ada berkas kredensial di folder ini — tidak ada yang perlu dicocokkan.');
  process.exit(0);
}

/* Semua blob di database git, termasuk dari commit yang sudah di-amend. */
const daftar = execSync('git cat-file --batch-all-objects --batch-check', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  .split('\n')
  .filter((l) => l.includes(' blob '))
  .map((l) => l.split(' ')[0]);

console.log('blob diperiksa   : ' + daftar.length);
console.log('rahasia dicocokkan: ' + rahasia.length + '  (' + rahasia.map((r) => r.asal).join(', ') + ')');

let bocor = 0;
let ingat = 0;
daftar.forEach((sha) => {
  let isi;
  try { isi = execSync('git cat-file blob ' + sha, { encoding: 'latin1', maxBuffer: 32 * 1024 * 1024 }); }
  catch (e) { return; }
  rahasia.forEach((r) => {
    if (isi.includes(r.nilai)) {
      // Cari nama berkasnya supaya laporannya bisa ditindaklanjuti.
      let nama = '(objek lepas ' + sha.slice(0, 8) + ')';
      try {
        const out = execSync('git rev-list --objects --all', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
        const baris = out.split('\n').find((l) => l.startsWith(sha));
        if (baris && baris.includes(' ')) nama = baris.slice(baris.indexOf(' ') + 1);
      } catch (e) { /* nama tidak wajib */ }
      if (r.keras) { console.log('BOCOR : ' + r.asal + ' ditemukan di ' + nama); bocor++; }
      else { console.log('ingat : ' + r.asal + ' terlihat di ' + nama + ' (bukan rahasia, tidak memblokir)'); ingat++; }
    }
  });
});

if (ingat) console.log('\n' + ingat + ' temuan tidak memblokir (nama akun / alamat email contoh).');

if (bocor) {
  console.log('\nGAGAL: ' + bocor + ' kebocoran. JANGAN push. Perbaiki berkasnya, lalu:');
  console.log('  git add <berkas> && git commit --amend  (kalau belum pernah dipush)');
  console.log('  git reflog expire --expire=now --all && git gc --prune=now');
  process.exit(1);
}
console.log('\nAMAN: tidak ada sandi di objek git mana pun.');
