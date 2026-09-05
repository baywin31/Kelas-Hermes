/* ============================================================
   Karyawan Digital — mode HTML (satu berkas, tanpa server)
   Data disimpan di localStorage browser ini. Tidak ada backend,
   jadi mode ini untuk demo/offline/1 perangkat. Versi PHP+MySQL
   dipakai kalau kode akses harus benar-benar terkunci di server.
   ============================================================ */
(function () {
'use strict';

var LS_KEY = 'KD_HTML_V1';
var APP_NAME = 'Karyawan Digital';
var COURSE_NAME = 'Hermes Agent';

/* ---------- util ---------- */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
function now() { return window.__appNow ? new Date(window.__appNow).getTime() : Date.now(); }
function tgl(ts) {
  if (!ts) return '—';
  var d = new Date(ts);
  var bl = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return d.getDate() + ' ' + bl[d.getMonth()] + ' ' + d.getFullYear();
}
function tglJam(ts) {
  if (!ts) return '—';
  var d = new Date(ts);
  function p(n) { return (n < 10 ? '0' : '') + n; }
  return tgl(ts) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}
function acak(n) {
  var out = new Uint32Array(n);
  if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(out);
  else for (var i = 0; i < n; i++) out[i] = Math.floor(Math.random() * 4294967296);
  return out;
}
function uid() {
  var a = acak(4), s = '';
  for (var i = 0; i < 4; i++) s += ('00000000' + a[i].toString(16)).slice(-8);
  return s;
}

/* ---------- SHA-256 (untuk hash password, ditulis tangan) ---------- */
var K256 = [
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];

function sha256(msg) {
  function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }
  var bytes = [], i, c;
  for (i = 0; i < msg.length; i++) {
    c = msg.charCodeAt(i);
    if (c < 128) bytes.push(c);
    else if (c < 2048) bytes.push(192 | (c >> 6), 128 | (c & 63));
    else bytes.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63));
  }
  var bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (i = 7; i >= 0; i--) bytes.push((i < 4 ? Math.floor(bitLen / Math.pow(2, 8 * i)) : 0) & 255);

  var H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  var w = new Array(64);
  for (var blk = 0; blk < bytes.length; blk += 64) {
    for (i = 0; i < 16; i++) {
      w[i] = (bytes[blk + i * 4] << 24) | (bytes[blk + i * 4 + 1] << 16) |
             (bytes[blk + i * 4 + 2] << 8) | bytes[blk + i * 4 + 3];
    }
    for (i = 16; i < 64; i++) {
      var s0 = rotr(w[i-15],7) ^ rotr(w[i-15],18) ^ (w[i-15] >>> 3);
      var s1 = rotr(w[i-2],17) ^ rotr(w[i-2],19) ^ (w[i-2] >>> 10);
      w[i] = (w[i-16] + s0 + w[i-7] + s1) | 0;
    }
    var a=H[0],b=H[1],cc=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7];
    for (i = 0; i < 64; i++) {
      var S1 = rotr(e,6) ^ rotr(e,11) ^ rotr(e,25);
      var ch = (e & f) ^ (~e & g);
      var t1 = (h + S1 + ch + K256[i] + w[i]) | 0;
      var S0 = rotr(a,2) ^ rotr(a,13) ^ rotr(a,22);
      var mj = (a & b) ^ (a & cc) ^ (b & cc);
      var t2 = (S0 + mj) | 0;
      h=g; g=f; f=e; e=(d+t1)|0; d=cc; cc=b; b=a; a=(t1+t2)|0;
    }
    H[0]=(H[0]+a)|0; H[1]=(H[1]+b)|0; H[2]=(H[2]+cc)|0; H[3]=(H[3]+d)|0;
    H[4]=(H[4]+e)|0; H[5]=(H[5]+f)|0; H[6]=(H[6]+g)|0; H[7]=(H[7]+h)|0;
  }
  var hex = '';
  for (i = 0; i < 8; i++) hex += ('00000000' + (H[i] >>> 0).toString(16)).slice(-8);
  return hex;
}

/* 600 putaran: cukup memberatkan tebakan massal, masih instan di browser. */
function pwHash(plain, salt) {
  var h = sha256(salt + '|' + plain);
  for (var i = 0; i < 600; i++) h = sha256(h + salt);
  return 's1$' + salt + '$' + h;
}
function pwBuat(plain) { return pwHash(plain, uid().slice(0, 16)); }
function pwCocok(plain, stored) {
  if (!stored) return false;
  var p = String(stored).split('$');
  if (p.length !== 3 || p[0] !== 's1') return false;
  return pwHash(plain, p[1]) === stored;
}

/* ---------- kode akses ---------- */
var KODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';  /* tanpa 0 O 1 I L */
var KODE_PREFIX = 'HRMS';

function kodeGenerate() {
  var r = acak(12), s = KODE_PREFIX;
  for (var b = 0; b < 3; b++) {
    s += '-';
    for (var i = 0; i < 4; i++) s += KODE_ALPHABET[r[b * 4 + i] % KODE_ALPHABET.length];
  }
  return s;
}
function kodeNormalize(raw) {
  var s = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (s.indexOf(KODE_PREFIX) === 0) s = s.slice(KODE_PREFIX.length);
  if (s.length !== 12) return null;
  for (var i = 0; i < 12; i++) if (KODE_ALPHABET.indexOf(s[i]) < 0) return null;
  return KODE_PREFIX + '-' + s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8, 12);
}

/* ---------- markdown → HTML (aman: escape dulu, baru bangun tag) ---------- */
function mdSlug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'bagian';
}
function mdInline(s) {
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, teks, url) {
    if (!/^(https?:\/\/|mailto:)/i.test(url)) return m;
    return '<a href="' + url + '" target="_blank" rel="noopener nofollow">' + teks + '</a>';
  });
  return s;
}
/* ---------- gambar ----------
   Saring URL gambar. Balikan '' kalau tidak aman, supaya pemanggilnya
   membiarkan teks apa adanya (admin langsung sadar salah tulis).
   Ditolak: javascript:/data:/skema lain, //host, dan URL yang memuat
   tanda kutip atau kurung sudut (tanda percobaan kabur dari atribut). */
function imgUrlOk(url) {
  url = String(url || '').trim();
  if (!url || url.length > 500) return '';
  if (/["'<>\s]/.test(url)) return '';
  if (url.indexOf('//') === 0) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return '';
  return url;                       // jalur relatif di hosting sendiri
}

/* Bangun tag gambar. blok=true untuk baris yang hanya berisi gambar →
   dibungkus <figure> dengan keterangan di bawahnya. */
function imgHtml(url, alt, blok) {
  var src = imgUrlOk(url);
  if (!src) return '';
  alt = String(alt || '').trim();
  var tag = '<img src="' + esc(src) + '" alt="' + esc(alt) + '" loading="lazy" decoding="async">';
  if (!blok) return tag;
  var fig = '<figure class="gambar">' + tag;
  if (alt) fig += '<figcaption class="small muted">' + esc(alt) + '</figcaption>';
  return fig + '</figure>';
}

/* ---------- video YouTube ----------
   Ambil ID dari bentuk tautan apa pun. Host dipatok ke YouTube asli supaya
   tautan seperti https://evil.com/youtube.com/shorts/XXX tidak lolos. */
function ytId(url) {
  url = String(url || '').trim();
  var host = '(?:^|https?://)(?:www\\.|m\\.)?';
  var m = new RegExp(host + '(?:youtube\\.com/(?:shorts/|embed/|live/|v/)|youtu\\.be/)([A-Za-z0-9_-]{6,20})', 'i').exec(url);
  if (m) return m[1];
  m = new RegExp(host + 'youtube\\.com/watch\\?(?:[^#]*&)?v=([A-Za-z0-9_-]{6,20})', 'i').exec(url);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(url)) return url;
  return '';
}

/* Bingkai video. Hanya ID hasil saringan yang disisipkan, host dipaku ke
   youtube-nocookie (tidak menaruh cookie iklan sebelum ditonton). Selalu
   disertai tautan biasa untuk jaringan yang memblokir embed. */
function ytEmbed(url, judul) {
  var id = ytId(url);
  if (!id) return '';
  var tegak = /\/shorts\//i.test(String(url));
  return '<div class="video-embed' + (tegak ? ' tegak' : '') + '">' +
    '<iframe src="https://www.youtube-nocookie.com/embed/' + id + '?rel=0"' +
    ' title="' + esc(judul || 'Video tutorial') + '"' +
    ' loading="lazy" referrerpolicy="strict-origin-when-cross-origin"' +
    ' allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"' +
    ' allowfullscreen></iframe></div>' +
    '<p class="video-cap small muted">' +
    '<a href="https://youtu.be/' + id + '" target="_blank" rel="noopener">Buka video ini di YouTube</a></p>';
}

function md(src) {
  var raw = String(src || '').replace(/\r\n/g, '\n');
  var blocks = [];
  raw = raw.replace(/```[a-zA-Z0-9_-]*\n([\s\S]*?)```/g, function (m, isi) {
    blocks.push('<pre><code>' + esc(isi) + '</code></pre>');
    return '\u0000BLOCK' + (blocks.length - 1) + '\u0000';
  });
  /* Baris video "@video <url> [judul]" — diproses sebelum esc() supaya URL
     masih utuh. Yang masuk HTML tetap hanya ID hasil saringan ytId(). */
  raw = raw.replace(/^@video[ \t]+(\S+)[ \t]*(.*)$/gim, function (m, url, judul) {
    var html = ytEmbed(url, judul.trim() || 'Video tutorial');
    if (!html) return m;           // bukan YouTube → biarkan jadi teks biasa
    blocks.push(html);
    return '\u0000BLOCK' + (blocks.length - 1) + '\u0000';
  });
  /* Gambar ![keterangan](url) — juga sebelum esc(), dan HARUS sebelum pola
     tautan [teks](url) di mdInline() yang kalau tidak akan ikut menangkap
     bagian [alt](url) dari sintaks gambar. Baris yang hanya berisi gambar
     jadi <figure>; yang di tengah kalimat cukup <img>. */
  raw = raw.replace(/^!\[([^\]]*)\]\(([^)\s]+)\)[ \t]*$/gm, function (m, alt, url) {
    var html = imgHtml(url, alt, true);
    if (!html) return m;
    blocks.push(html);
    return '\u0000BLOCK' + (blocks.length - 1) + '\u0000';
  });
  raw = raw.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (m, alt, url) {
    var html = imgHtml(url, alt, false);
    if (!html) return m;
    blocks.push(html);
    return '\u0000BLOCK' + (blocks.length - 1) + '\u0000';
  });
  raw = esc(raw);

  var out = [], list = null, tbl = null, lines = raw.split('\n');
  function tutupList() { if (list) { out.push('</' + list + '>'); list = null; } }
  function tutupTabel() {
    if (tbl) {
      out.push('<table><thead><tr>' + tbl.head.map(function (h) { return '<th>' + mdInline(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        tbl.rows.map(function (r) {
          return '<tr>' + r.map(function (c) { return '<td>' + mdInline(c) + '</td>'; }).join('') + '</tr>';
        }).join('') + '</tbody></table>');
      tbl = null;
    }
  }
  function selKolom(line) {
    var t = line.trim().replace(/^\|/, '').replace(/\|$/, '');
    return t.split('|').map(function (x) { return x.trim(); });
  }

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i], trim = line.trim();

    if (trim.indexOf('\u0000BLOCK') === 0) { tutupList(); tutupTabel(); out.push(trim); continue; }
    if (trim === '') { tutupList(); tutupTabel(); continue; }

    /* tabel: | a | b |  disusul  |---|---| */
    if (trim.indexOf('|') === 0 && !tbl && lines[i + 1] && /^\|[\s:|-]+\|?$/.test(lines[i + 1].trim())) {
      tutupList();
      tbl = { head: selKolom(trim), rows: [] };
      i++;
      continue;
    }
    if (tbl) {
      if (trim.indexOf('|') === 0) { tbl.rows.push(selKolom(trim)); continue; }
      tutupTabel();
    }

    var m = /^(#{1,4})\s+(.*)$/.exec(trim);
    if (m) {
      tutupList();
      var lv = Math.min(m[1].length + 1, 5);
      out.push('<h' + lv + ' id="' + mdSlug(m[2]) + '">' + mdInline(m[2]) + '</h' + lv + '>');
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(trim)) { tutupList(); out.push('<hr>'); continue; }
    if (trim.indexOf('&gt; ') === 0) {
      tutupList();
      out.push('<blockquote>' + mdInline(trim.slice(5)) + '</blockquote>');
      continue;
    }
    m = /^\d+\.\s+(.*)$/.exec(trim);
    if (m) {
      if (list !== 'ol') { tutupList(); out.push('<ol>'); list = 'ol'; }
      out.push('<li>' + mdInline(m[1]) + '</li>');
      continue;
    }
    m = /^[-*]\s+(.*)$/.exec(trim);
    if (m) {
      if (list !== 'ul') { tutupList(); out.push('<ul>'); list = 'ul'; }
      out.push('<li>' + mdInline(m[1]) + '</li>');
      continue;
    }
    tutupList();
    out.push('<p>' + mdInline(trim) + '</p>');
  }
  tutupList(); tutupTabel();

  return out.join('\n').replace(/\u0000BLOCK(\d+)\u0000/g, function (m2, n) { return blocks[+n] || ''; });
}
function mdToc(src) {
  var toc = [];
  String(src || '').replace(/\r\n/g, '\n').split('\n').forEach(function (line) {
    var m = /^(#{1,3})\s+(.*)$/.exec(line.trim());
    if (m) toc.push({ level: m[1].length, text: m[2].trim(), id: mdSlug(m[2]) });
  });
  return toc;
}
function mdExcerpt(src, len) {
  len = len || 160;
  // Baris @video adalah penanda, bukan isi bacaan — dibuang lebih dulu supaya
  // URL panjang tidak memakan habis kutipan hasil pencarian.
  var s = String(src || '').replace(/```[\s\S]*?```/g, ' ')
    .replace(/^@video[ \t]+\S+.*$/gim, ' ')
    .replace(/!\[([^\]]*)\]\([^)\s]+\)/g, '$1')
    .replace(/[#*`>[\]()_|-]+/g, ' ')
    .replace(/\s+/g, ' ').trim();
  return s.length > len ? s.slice(0, len) + '…' : s;
}

// ---------- WhatsApp ----------
// Rapikan nomor jadi format wa.me (angka saja, awalan negara).
// Balikan '' kalau tidak masuk akal, supaya tombol tidak pernah muncul rusak.
function waNormal(nomor) {
  var n = String(nomor || '').replace(/\D+/g, '');
  if (!n) return '';
  if (n.indexOf('0') === 0) n = '62' + n.slice(1);
  if (n.indexOf('620') === 0) n = '62' + n.slice(3);
  return (n.length >= 9 && n.length <= 15) ? n : '';
}

function waLink(nomor, pesan) {
  var n = waNormal(nomor);
  if (!n) return '';
  var teks = String(pesan || '').trim() || ('Halo admin, saya butuh bantuan soal ' + APP_NAME + '.');
  return 'https://wa.me/' + n + '?text=' + encodeURIComponent(teks);
}

window.KD = {
  LS_KEY: LS_KEY, APP_NAME: APP_NAME, COURSE_NAME: COURSE_NAME,
  esc: esc, now: now, tgl: tgl, tglJam: tglJam, uid: uid, acak: acak,
  sha256: sha256, pwBuat: pwBuat, pwCocok: pwCocok,
  kodeGenerate: kodeGenerate, kodeNormalize: kodeNormalize,
  KODE_PREFIX: KODE_PREFIX, KODE_ALPHABET: KODE_ALPHABET,
  waNormal: waNormal, waLink: waLink,
  md: md, mdToc: mdToc, mdExcerpt: mdExcerpt, mdSlug: mdSlug,
  ytId: ytId, ytEmbed: ytEmbed,
  imgUrlOk: imgUrlOk, imgHtml: imgHtml
};
})();
