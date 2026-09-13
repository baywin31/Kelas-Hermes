/* alat-kontras.js — pengukur kontras yang BENAR, dipakai bersama oleh
   audit-tata-letak.js dan cari-kontras.js.

   KENAPA ADA: pengukur sebelumnya mengambil backgroundColor elemen,
   dan kalau elemen itu tidak punya latar sendiri (nilainya "transparent"
   atau "rgba(0,0,0,0)") pembacaannya jatuh ke hitam. Akibatnya huruf gelap
   di halaman bertema terang dilaporkan "kontras 1.21" padahal latar
   sebenarnya putih. Cacatnya ada di ALAT, bukan di halaman — dan alat yang
   salah lebih berbahaya daripada tidak punya alat, karena menuntun ke
   perbaikan yang keliru.

   CARA BENAR: susun semua lapisan latar dari elemen ke atas, lalu campur
   berurutan (menimpa sesuai kepekatan). Latar yang terlihat mata adalah
   hasil campuran itu, bukan warna elemen teratas saja.

   SUMBER berisi kode yang disuntikkan ke halaman lewat page.addScriptTag,
   jadi tidak perlu disalin ke setiap skrip. */
const SUMBER = `
function bacaRGBA(s){
  if (!s) return null;
  s = s.trim();
  if (s === 'transparent') return null;
  let m = s.match(/^rgba?\\(([\\d.]+)[,\\s]+([\\d.]+)[,\\s]+([\\d.]+)(?:[,/\\s]+([\\d.]+))?\\)$/);
  if (!m) return null;
  return { r:+m[1], g:+m[2], b:+m[3], a: m[4] === undefined ? 1 : +m[4] };
}
function campur(diAtas, diBawah){
  const a = diAtas.a;
  return { r: diAtas.r*a + diBawah.r*(1-a), g: diAtas.g*a + diBawah.g*(1-a),
           b: diAtas.b*a + diBawah.b*(1-a), a: a + diBawah.a*(1-a) };
}
// Latar yang benar-benar terlihat di belakang sebuah elemen.
function latarEfektif(el){
  const lapis = [];
  let n = el.parentElement;            // latar elemen sendiri tidak dihitung
  while (n) {                          // (yang dicari latar DI BELAKANG hurufnya)
    const c = bacaRGBA(getComputedStyle(n).backgroundColor);
    if (c && c.a > 0.02) lapis.push(c);
    n = n.parentElement;
  }
  if (!getComputedStyle(document.documentElement).backgroundColor) lapis.push({r:255,g:255,b:255,a:1});
  let hasil = { r:255, g:255, b:255, a:1 };   // kanvas: putih
  for (let i = lapis.length - 1; i >= 0; i--) hasil = campur(lapis[i], hasil);
  return hasil;
}
function lum(c){
  const f = [c.r, c.g, c.b].map((v) => { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); });
  return 0.2126*f[0] + 0.7152*f[1] + 0.0722*f[2];
}
function rasioKontras(fg, bg){
  const L1 = lum(fg), L2 = lum(bg);
  return (Math.max(L1,L2)+0.05) / (Math.min(L1,L2)+0.05);
}
// Ambang WCAG: teks besar boleh 3, teks biasa 4.5.
function ambangKontras(px, tebal){
  return (px >= 24 || (px >= 18.66 && tebal)) ? 3 : 4.5;
}
function rgbTeks(s){ return bacaRGBA(s); }
function jalurElemen(el){
  const p = []; let n = el;
  while (n && n.tagName !== 'BODY') {
    p.unshift(n.tagName.toLowerCase() + (n.className && n.className.toString().trim()
      ? '.' + n.className.toString().trim().split(/\\s+/)[0] : ''));
    n = n.parentElement;
  }
  return p.join(' > ');
}
`;
module.exports = { SUMBER };
