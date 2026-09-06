// cek-ikon-tinymce.js — daftar nama ikon yang benar-benar ada di paket TinyMCE.
//
// Kenapa perlu: ikon yang salah nama TIDAK melempar error — TinyMCE hanya
// menggambar kotak "!" di toolbar. Cara satu-satunya memastikan tombolnya
// terlihat benar adalah mencocokkan nama ikon dengan isi berkas ikon.
const fs = require('fs');
const berkas = 'tinymce/icons/default/icons.min.js';
const isi = fs.readFileSync(berkas, 'utf8');

// Berkasnya diminifikasi dan SVG yang sama dipakai ulang lewat variabel, mis.
//   {"align-center":a,"align-justify":b,"bold":c,…}
// Jadi mencocokkan `'nama':'<svg` MELEWATKAN sebagian besar ikon (dulu hanya
// 111 dari ~200 yang terbaca, dan 'bold' pun tidak terlihat). Yang benar:
// ambil isi objek `icons:{…}` lalu baca semua kuncinya.
const mulai = isi.indexOf('icons:{');
const potong = mulai === -1 ? isi : isi.slice(mulai);
const nama = [...potong.matchAll(/["']?([a-z][a-z0-9-]{2,})["']?\s*:/g)]
  .map((m) => m[1])
  .filter((n) => n !== 'icons');
const unik = [...new Set(nama)].sort();
console.log('total ikon =', unik.length);

const dicari = process.argv.slice(2);
if (dicari.length) {
  dicari.forEach((d) => {
    const ada = unik.includes(d);
    console.log((ada ? 'ADA   ' : 'TIDAK ') + d);
    if (!ada) {
      const inti = d.split('-')[0];
      const mirip = unik.filter((n) => n.includes(inti));
      if (mirip.length) console.log('       mirip: ' + mirip.slice(0, 12).join(', '));
    }
  });
} else {
  console.log(unik.join('\n'));
}
