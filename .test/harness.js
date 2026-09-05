/* Harness jsdom untuk index.html mode HTML. */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const FILE = path.join(__dirname, '..', 'index.html');
const LS_KEY = 'KD_HTML_V1';

let pass = 0, fail = 0;
const gagal = [];

function ok(nama, syarat, ket) {
  if (syarat) { pass++; console.log('  ok   ' + nama); }
  else {
    fail++; gagal.push(nama + (ket ? ' — ' + ket : ''));
    console.log('  GAGAL ' + nama + (ket ? ' — ' + ket : ''));
  }
}
function eq(nama, dapat, harap) {
  ok(nama, dapat === harap, 'dapat ' + JSON.stringify(dapat) + ', harap ' + JSON.stringify(harap));
}
function berisi(nama, teks, cari) {
  ok(nama, String(teks).indexOf(cari) >= 0, 'tidak menemukan "' + cari + '"');
}
function tidakBerisi(nama, teks, cari) {
  ok(nama, String(teks).indexOf(cari) < 0, 'malah menemukan "' + cari + '"');
}
function urutan(nama, teks, daftar) {
  const pos = daftar.map(function (s) { return String(teks).indexOf(s); });
  const adaSemua = pos.every(function (p) { return p >= 0; });
  const naik = pos.every(function (p, i) { return i === 0 || pos[i - 1] < p; });
  ok(nama, adaSemua && naik, 'posisi: ' + JSON.stringify(pos));
}

function buka(seed) {
  const html = fs.readFileSync(FILE, 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'http://localhost/index.html',
    pretendToBeVisual: true,
    beforeParse(window) {
      if (seed !== undefined) {
        try { window.localStorage.setItem(LS_KEY, seed); } catch (e) {}
      }
      window.confirm = function () { return true; };
      window.open = function () { return null; };
      window.print = function () { window.__printed = true; };
      window.alert = function () {};
    }
  });
  const w = dom.window;
  /* DOMContentLoaded di jsdom belum tentu sudah lewat saat ini,
     jadi inisialisasi dipanggil manual (mulai() aman dipanggil dua kali). */
  w.__app.mulai();
  return { dom, w, doc: w.document, app: w.__app };
}

/* Ganti hash lalu paksa render (jsdom kadang menunda hashchange). */
function pergi(w, hash) {
  w.location.hash = hash;
  w.__app.render();
}
function view(w) { return w.document.getElementById('view').innerHTML; }
function halaman(w) { return w.document.body.innerHTML; }

function isiForm(w, aksi, data) {
  const form = w.document.querySelector('form[data-aksi="' + aksi + '"]');
  if (!form) throw new Error('form data-aksi="' + aksi + '" tidak ada di halaman ' + w.location.hash);
  Object.keys(data).forEach(function (k) {
    const el = form.elements[k];
    if (!el) throw new Error('field "' + k + '" tidak ada di form ' + aksi);
    el.value = data[k];
  });
  return form;
}
/* Kirim form. Kalau aksi mengganti hash, jsdom menunda hashchange —
   jadi kita render manual. Kalau hash TETAP, aksinya sudah merender
   sendiri (mis. menampilkan pesan error); render ulang akan menghapus
   pesan itu, jadi jangan disentuh. */
function kirim(w, aksi, data) {
  const form = isiForm(w, aksi, data || {});
  const sebelum = w.location.hash;
  form.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  if (w.location.hash !== sebelum) w.__app.render();
}
function klik(w, selector) {
  const el = w.document.querySelector(selector);
  if (!el) throw new Error('tombol ' + selector + ' tidak ada');
  const sebelum = w.location.hash;
  el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  if (w.location.hash !== sebelum) w.__app.render();
  return el;
}
function bagianState(w) { return w.__app.state(); }
function tidur(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

function judulBlok(t) { console.log('\n' + t); }

module.exports = {
  LS_KEY, FILE, buka, pergi, view, halaman, isiForm, kirim, klik,
  ok, eq, berisi, tidakBerisi, urutan, bagianState, tidur, judulBlok,
  hasil: function () { return { pass, fail, gagal }; }
};
