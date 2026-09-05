/* lihat-zip.js — daftar isi kedua zip paket (tanpa CLI unzip). */
const { execFileSync } = require('child_process');
const ps = 'powershell';
const zips = [
  'C:/Users/user/apps/karyawan-digital-html.zip',
  'C:/Users/user/apps/karyawan-digital-php-upload.zip'
];
for (const z of zips) {
  const cmd = `Add-Type -A System.IO.Compression.FileSystem; ` +
    `[IO.Compression.ZipFile]::OpenRead('${z}').Entries | % { $_.FullName }`;
  const out = execFileSync(ps, ['-NoProfile', '-Command', cmd], { encoding: 'utf8' });
  const list = out.trim().split(/\r?\n/).filter(Boolean);
  console.log('== ' + z.split('/').pop() + ' (' + list.length + ' berkas)');
  console.log('   ' + list.join('\n   '));
}
