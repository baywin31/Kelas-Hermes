/* siap-pratinjau-lepas.js — jadikan percobaan-figma.html halaman BERDIRI SENDIRI
   di folder pratinjau/, supaya bisa dibuka langsung (klik dua kali) tanpa
   server, tanpa PHP, tanpa apa pun.

   Kenapa perlu: halaman percobaan memanggil empat berkas CSS. Kalau dibuka apa
   adanya dari folder app, berkas itu ada di sebelahnya sehingga tampak normal —
   tapi begitu berkasnya dipindah atau dikirim ke orang, tampilannya rusak dan
   yang dinilai jadi gambar yang salah. Menanam CSS langsung ke dalam berkas
   menghilangkan seluruh risiko itu.
*/
const fs = require('fs');

const APP = 'C:/Users/user/apps/karyawan-digital-php';
const SUMBER = APP + '/percobaan-figma.html';
const OUT = APP + '/pratinjau/percobaan-figma.html';

let html = fs.readFileSync(SUMBER, 'utf8');
let tertanam = [];

html = html.replace(/<link[^>]+href=["']([^"']+\.css)(?:\?v=\d+)?["'][^>]*>/gi, (m, href) => {
  const berkas = href.split('/').pop();
  const jalur = APP + '/' + berkas;
  if (!fs.existsSync(jalur)) {
    console.log('  PERINGATAN: ' + berkas + ' tidak ada — halaman akan tampil tanpa gaya itu');
    return '<!-- hilang: ' + berkas + ' -->';
  }
  tertanam.push(berkas);
  return '<style data-dari="' + berkas + '">\n' + fs.readFileSync(jalur, 'utf8') + '\n</style>';
});

// Beri keterangan kecil di atas halaman supaya jelas ini percobaan.
html = html.replace('<main class="wrap">',
  '<main class="wrap">\n  <p style="margin:0 0 4px;font:600 12px/1.6 ui-monospace,monospace;' +
  'letter-spacing:1px;text-transform:uppercase;color:#94a3af">Halaman percobaan — bukan halaman asli</p>');

fs.mkdirSync(APP + '/pratinjau', { recursive: true });
fs.writeFileSync(OUT, html, 'utf8');
console.log('berdiri sendiri: pratinjau/percobaan-figma.html');
console.log('CSS ditanam     : ' + tertanam.join(', '));
console.log('ukuran          : ' + Math.round(html.length / 1024) + ' KB' +
            '  (semua gaya ada di dalam berkas)');
