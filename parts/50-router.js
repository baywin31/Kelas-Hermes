/* ============================================================
   Router hash (#/dashboard, #/materi/2, ...), nav, flash, helper form.
   ============================================================ */
(function () {
'use strict';
var K = window.KD, S = window.KD_STORE_1, S2 = window.KD_STORE_2;

var flashQueue = [];
var routes = {};
var hashTerakhir = null;

function flash(type, msg) { flashQueue.push({ type: type, msg: msg }); }
function flashRender() {
  var slot = document.getElementById('flash-slot');
  if (!slot) return;
  slot.innerHTML = flashQueue.map(function (f) {
    return '<div class="flash ' + f.type + '">' + f.msg + '</div>';
  }).join('');
  flashQueue = [];
}
function toast(msg) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('tampil');
  clearTimeout(toast._t);
  toast._t = setTimeout(function () { t.classList.remove('tampil'); }, 1900);
}

function go(hash) {
  if (('#' + hash.replace(/^#/, '')) === window.location.hash) render();
  else window.location.hash = hash.replace(/^#/, '');
}

function parseHash() {
  var h = (window.location.hash || '#/').replace(/^#\/?/, '');
  var q = '';
  var qi = h.indexOf('?');
  if (qi >= 0) { q = h.slice(qi + 1); h = h.slice(0, qi); }
  var seg = h.split('/').filter(function (x) { return x !== ''; });
  var query = {};
  q.split('&').forEach(function (kv) {
    if (!kv) return;
    var p = kv.split('=');
    query[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '');
  });
  return { nama: seg[0] || 'beranda', arg: seg[1] || '', query: query };
}

function navRender(rute) {
  var u = S.userAktif();
  var nav = document.getElementById('nav');
  var brand = document.getElementById('brand');
  if (brand) brand.setAttribute('href', u ? '#/dashboard' : '#/');
  if (!nav) return;
  var item = [];
  function a(href, label, cls) {
    var aktif = ('#/' + rute.nama) === href ? ' aktif' : '';
    item.push('<a class="' + (cls || '') + aktif + '" href="' + href + '">' + label + '</a>');
  }
  if (u) {
    a('#/dashboard', 'Dashboard');
    a('#/cari', 'Cari');
    a('#/faq', 'FAQ');
    a('#/profil', 'Profil');
    if (u.role === 'admin') a('#/admin', 'Admin', 'pill');
    item.push('<a href="#/keluar">Keluar</a>');
  } else {
    a('#/redeem', 'Redeem kode');
    a('#/masuk', 'Masuk');
  }
  nav.innerHTML = item.join('');
}

function render() {
  var rute = parseHash();
  var view = document.getElementById('view');
  var fn = routes[rute.nama] || routes.beranda;
  hashTerakhir = window.location.hash || '#/';
  navRender(rute);
  var html = '';
  try { html = fn(rute) || ''; }
  catch (e) {
    html = '<div class="card"><h1>Terjadi kesalahan</h1><p class="sub">' + K.esc(e.message) + '</p></div>';
  }
  if (html === false) return;                 /* view sudah redirect sendiri */
  view.innerHTML = html;
  flashRender();
  waApungRender();
  window.scrollTo(0, 0);
  pasangHandler(view);
  document.title = (routes._judul || K.APP_NAME) + ' — ' + K.APP_NAME;
}

/* Tombol WhatsApp apung: dipasang di luar #view supaya tidak ikut
   tergantikan setiap pindah halaman, dan dicabut kalau nomornya dihapus. */
function waApungRender() {
  var lama = document.getElementById('wa-apung');
  var set = (S._get().setelan || {});
  var url = K.waLink(set.wa_nomor, set.wa_pesan);
  waFooterRender(url);
  if (!url) { if (lama) lama.remove(); return; }

  var a = lama || document.createElement('a');
  if (!lama) {
    a.id = 'wa-apung';
    a.className = 'wa-apung';
    a.target = '_blank';
    a.rel = 'noopener';
    a.setAttribute('aria-label', 'Chat WhatsApp dengan admin');
    a.title = 'Chat admin di WhatsApp';
    a.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false">' +
      '<path fill="currentColor" d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.15c-1.5 0-2.97-.4-4.25-1.16l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.37c0-4.54 3.7-8.23 8.24-8.23 4.54 0 8.23 3.69 8.23 8.23 0 4.54-3.69 8.24-8.17 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.7-.8-.23-.09-.4-.13-.56.12-.17.25-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.12-1.06-.39-2.02-1.25-.75-.67-1.25-1.5-1.4-1.75-.14-.25-.01-.39.11-.51.11-.11.25-.29.37-.44.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.55.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.17-.47-.29z"/></svg>';
    document.body.appendChild(a);
  }
  a.href = url;
}

/* Tautan WA di footer ikut nomor yang sama; disembunyikan kalau nomor kosong. */
function waFooterRender(url) {
  var f = document.getElementById('footer-wa');
  if (!f) return;
  var sep = f.previousElementSibling;
  if (url) { f.href = url; f.hidden = false; if (sep) sep.hidden = false; }
  else { f.hidden = true; if (sep) sep.hidden = true; }
}

/* Semua interaksi dipasang di sini supaya tidak ada inline onclick. */
function pasangHandler(root) {
  root.querySelectorAll('[data-aksi]').forEach(function (el) {
    var ev = el.tagName === 'FORM' ? 'submit' : (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' ? 'input' : 'click');
    el.addEventListener(ev, function (e) {
      if (ev !== 'input') e.preventDefault();
      var fn = window.KD_AKSI[el.getAttribute('data-aksi')];
      if (fn) fn(el, e);
    });
  });
  var bar = root.querySelector('.bar-dalam');
  if (bar) setTimeout(function () { bar.style.width = (bar.getAttribute('data-persen') || 0) + '%'; }, 40);
  var fokus = root.querySelector('[data-fokus]');
  if (fokus && fokus.focus) { try { fokus.focus(); } catch (e) {} }
}

/* ---------- helper form ---------- */
function nilai(form, nama) {
  var el = form.elements[nama];
  return el ? String(el.value || '') : '';
}
function butuhLogin() {
  var u = S.userAktif();
  if (!u) { flash('info', 'Masuk dulu untuk membuka halaman itu.'); go('/masuk'); return null; }
  return u;
}
function butuhAdmin() {
  var u = S.userAktif();
  if (!u) { flash('info', 'Masuk dulu untuk membuka halaman itu.'); go('/masuk'); return null; }
  if (u.role !== 'admin') return false;
  return u;
}
function kartuTolak() {
  return '<div class="card sempit"><h1>Akses ditolak</h1>' +
    '<p class="sub">Halaman ini khusus admin.</p>' +
    '<p><a class="btn ghost" href="#/dashboard">Kembali ke dashboard</a></p></div>';
}
function badgeStatus(s) {
  if (s === 'selesai') return '<span class="badge selesai">Selesai</span>';
  if (s === 'mulai') return '<span class="badge mulai">Sedang dipelajari</span>';
  return '<span class="badge belum">Belum mulai</span>';
}
function unduh(namaFile, isi, mime) {
  try {
    var blob = new Blob([isi], { type: mime || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = namaFile;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 300);
    return true;
  } catch (e) { return false; }
}

window.KD_UI = {
  routes: routes, render: render, go: go, flash: flash, toast: toast,
  nilai: nilai, butuhLogin: butuhLogin, butuhAdmin: butuhAdmin,
  kartuTolak: kartuTolak, badgeStatus: badgeStatus, unduh: unduh, parseHash: parseHash
};
window.KD_AKSI = {};
})();
