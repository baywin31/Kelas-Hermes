// ambil-textarea.js — ambil isi <textarea id="isi_md"> dari halaman HTML dan
// balikkan escape HTML-nya, supaya bisa dibandingkan dengan markdown asli.
//
// Dipakai uji-tinymce.sh. Ditulis sebagai berkas, bukan `node -e` inline,
// karena perintah inline panjang di shell mesin ini sering gagal.
const fs = require('fs');
const [, , masuk, keluar] = process.argv;

const html = fs.readFileSync(masuk, 'utf8');
const m = html.match(/<textarea id="isi_md"[^>]*>([\s\S]*?)<\/textarea>/);
const teks = (m ? m[1] : '')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#0?39;/g, "'")
  .replace(/&amp;/g, '&');

fs.writeFileSync(keluar, teks);
console.log('panjang isi textarea = ' + teks.length);
