/* md-editor.js — jembatan dua arah antara Markdown (format simpanan) dan HTML
   (yang dimengerti TinyMCE).

   Kenapa tidak menyimpan HTML saja: _markdown.php sengaja meng-escape SELURUH
   HTML sebelum membangun tag sendiri, jadi tidak ada satu pun tag dari admin
   yang bisa lolos ke halaman member. Itu satu-satunya alasan XSS tidak mungkin
   di app ini. Menyimpan HTML berarti membuang perlindungan itu dan menulis
   sanitizer sendiri tanpa Composer — jauh lebih berisiko daripada
   mengonversi dua arah di sisi editor.

   Konsekuensi: format di database TIDAK berubah sama sekali. Materi lama tetap
   terbuka, semua uji lama tetap berlaku, cetak.php tidak tersentuh.

   Dipakai di dua tempat:
   - browser  : window.KDMD
   - Node/uji : module.exports
*/
(function (akar) {
  'use strict';

  /* ---------------- alat kecil ---------------- */

  var e = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };
  var unesc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
  };

  /* ---------------- inline: markdown -> html ---------------- */

  function inlineKeHtml(s) {
    s = e(s);
    // Kode lebih dulu: isi di dalam backtick tidak boleh diproses aturan lain.
    var kode = [];
    s = s.replace(/`([^`]+)`/g, function (_, isi) {
      kode.push(isi);
      return '\u0000K' + (kode.length - 1) + '\u0000';
    });
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, teks, url) {
      if (!/^(https?:\/\/|mailto:)/i.test(unesc(url))) return m;
      return '<a href="' + url + '">' + teks + '</a>';
    });
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
    s = s.replace(/\u0000K(\d+)\u0000/g, function (_, i) {
      return '<code>' + kode[+i] + '</code>';
    });
    return s;
  }

  /* ---------------- inline: html -> markdown ---------------- */

  function inlineKeMd(node) {
    var hasil = '';
    var anak = node.childNodes;
    for (var i = 0; i < anak.length; i++) {
      var n = anak[i];
      if (n.nodeType === 3) {                       // teks
        // Baris baru di dalam paragraf HTML tidak berarti apa-apa di markdown,
        // dan kalau dibiarkan akan memecah paragraf jadi dua saat disimpan.
        hasil += n.nodeValue.replace(/\s*\n\s*/g, ' ');
        continue;
      }
      if (n.nodeType !== 1) continue;
      var tag = n.nodeName.toLowerCase();
      var isi = inlineKeMd(n);

      if (tag === 'strong' || tag === 'b') hasil += isi.trim() ? '**' + isi + '**' : '';
      else if (tag === 'em' || tag === 'i') hasil += isi.trim() ? '*' + isi + '*' : '';
      else if (tag === 'code') hasil += '`' + n.textContent + '`';
      else if (tag === 'a') {
        var href = n.getAttribute('href') || '';
        hasil += /^(https?:\/\/|mailto:)/i.test(href) ? '[' + isi + '](' + href + ')' : isi;
      } else if (tag === 'br') hasil += ' ';
      else hasil += isi;                            // span, font, dsb: buang tagnya
    }
    return hasil;
  }

  /* ---------------- blok: markdown -> html (untuk TinyMCE) ----------------

     Sintaks khusus app ini (kartu :::, @video, gambar) TIDAK dibiarkan jadi
     teks mentah di editor, karena itu justru yang mau dihindari user. Masing-
     masing jadi elemen sendiri yang bisa diklik:

       :::aman Judul   -> <div class="kd-kartu" data-jenis="aman"> ... </div>
       @video URL      -> <div class="kd-video" data-url="…" contenteditable="false">
       ![alt](url)     -> <figure class="kd-gambar"><img><figcaption>

     Blok kode disimpan sebagai <pre class="kd-kode" data-bahasa="bash">, sesuai
     yang dimengerti plugin codesample.
  */

  var JENIS = ['cerita', 'salah', 'tips', 'awas', 'insight', 'hasil', 'catat',
               'waktu', 'aman', 'periksa', 'opsional'];

  function mdKeHtml(md) {
    md = String(md == null ? '' : md).replace(/\r\n/g, '\n');
    var baris = md.split('\n');
    var out = [];
    var i = 0;

    var tutupDaftar = function (jenis) {
      if (jenis) out.push(jenis === 'ol' ? '</ol>' : '</ul>');
    };

    var daftar = null;   // 'ul' | 'ol' | 'ceklis'

    while (i < baris.length) {
      var t = baris[i];
      var trim = t.trim();

      // Blok kode ``` — dikumpulkan apa adanya.
      var mKode = trim.match(/^```([a-zA-Z0-9_-]*)$/);
      if (mKode) {
        tutupDaftar(daftar); daftar = null;
        var isiKode = [];
        i++;
        while (i < baris.length && baris[i].trim() !== '```') { isiKode.push(baris[i]); i++; }
        i++;
        // Bahasa disimpan APA ADANYA, termasuk saat tidak ditulis. Sebelumnya
        // fence kosong dipaksa jadi language-text dan saat disimpan pulang
        // sebagai "```text" — label di halaman member berubah dari "teks" jadi
        // "text" tanpa admin menyentuh apa pun.
        out.push('<pre class="kd-kode' + (mKode[1] ? ' language-' + mKode[1] : '') + '">'
                 + e(isiKode.join('\n')) + '</pre>');
        continue;
      }

      // Kartu ::: — isinya dikonversi rekursif supaya di dalamnya tetap bisa
      // ada daftar, tebal, tabel.
      var mKartu = trim.match(/^:::[ \t]*([a-z]+)[ \t]*(.*)$/);
      if (mKartu && JENIS.indexOf(mKartu[1]) !== -1) {
        tutupDaftar(daftar); daftar = null;
        var isiKartu = [];
        i++;
        while (i < baris.length && baris[i].trim() !== ':::') { isiKartu.push(baris[i]); i++; }
        i++;
        out.push('<div class="kd-kartu" data-jenis="' + e(mKartu[1]) + '">'
                 + '<p class="kd-kartu-judul">' + inlineKeHtml(mKartu[2]) + '</p>'
                 + mdKeHtml(isiKartu.join('\n'))
                 + '</div>');
        continue;
      }

      // @video URL [judul]
      var mVid = trim.match(/^@video\s+(\S+)[ \t]*(.*)$/i);
      if (mVid) {
        tutupDaftar(daftar); daftar = null;
        out.push('<div class="kd-video" data-url="' + e(mVid[1]) + '"'
                 + ' data-judul="' + e(mVid[2]) + '" contenteditable="false">'
                 + '&#9654; Video: ' + e(mVid[2] || mVid[1]) + '</div>');
        i++; continue;
      }

      // Gambar sendirian di satu baris
      var mImg = trim.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
      if (mImg) {
        tutupDaftar(daftar); daftar = null;
        out.push('<figure class="kd-gambar"><img src="' + e(mImg[2]) + '" alt="' + e(mImg[1]) + '">'
                 + (mImg[1] ? '<figcaption>' + e(mImg[1]) + '</figcaption>' : '')
                 + '</figure>');
        i++; continue;
      }

      // Tabel
      if (trim.charAt(0) === '|' && i + 1 < baris.length
          && /^\|[\s:|-]+\|$/.test(baris[i + 1].trim())) {
        tutupDaftar(daftar); daftar = null;
        var tb = [];
        while (i < baris.length && baris[i].trim().charAt(0) === '|') { tb.push(baris[i].trim()); i++; }
        out.push(tabelKeHtml(tb));
        continue;
      }

      // Heading
      var mH = trim.match(/^(#{1,4})\s+(.*)$/);
      if (mH) {
        tutupDaftar(daftar); daftar = null;
        var lv = Math.min(mH[1].length + 1, 5);   // "##" di materi = h3 di editor
        out.push('<h' + lv + '>' + inlineKeHtml(mH[2]) + '</h' + lv + '>');
        i++; continue;
      }

      // Garis pemisah
      if (/^(-{3,}|\*{3,})$/.test(trim)) {
        tutupDaftar(daftar); daftar = null;
        out.push('<hr>'); i++; continue;
      }

      // Kutipan
      if (/^>\s?/.test(trim)) {
        tutupDaftar(daftar); daftar = null;
        out.push('<blockquote><p>' + inlineKeHtml(trim.replace(/^>\s?/, '')) + '</p></blockquote>');
        i++; continue;
      }

      // Checklist — harus sebelum daftar biasa
      var mCek = trim.match(/^[-*]\s+\[([ xX])\]\s*(.*)$/);
      if (mCek) {
        if (daftar !== 'ceklis') { tutupDaftar(daftar); out.push('<ul class="kd-ceklis">'); daftar = 'ceklis'; }
        out.push('<li data-cek="' + (mCek[1].toLowerCase() === 'x' ? '1' : '0') + '">'
                 + inlineKeHtml(mCek[2]) + '</li>');
        i++; continue;
      }

      // Daftar bernomor
      var mOl = trim.match(/^\d+\.\s+(.*)$/);
      if (mOl) {
        if (daftar !== 'ol') { tutupDaftar(daftar); out.push('<ol>'); daftar = 'ol'; }
        out.push('<li>' + inlineKeHtml(mOl[1]) + '</li>');
        i++; continue;
      }

      // Daftar biasa
      var mUl = trim.match(/^[-*]\s+(.*)$/);
      if (mUl) {
        if (daftar !== 'ul') { tutupDaftar(daftar); out.push('<ul>'); daftar = 'ul'; }
        out.push('<li>' + inlineKeHtml(mUl[1]) + '</li>');
        i++; continue;
      }

      if (trim === '') { tutupDaftar(daftar); daftar = null; i++; continue; }

      // Paragraf: SATU BARIS = SATU <p>.
      //
      // Ini menyalin perilaku _markdown.php (baris 238), bukan aturan Markdown
      // umum. Markdown standar menggabungkan baris berurutan jadi satu
      // paragraf; _markdown.php tidak. Kalau di sini digabung, tiga baris
      // dialog berurutan di Bagian 3 pulang jadi satu baris — hasil render
      // berubah walau tidak ada error. Sumber kebenarannya PHP, bukan spek.
      tutupDaftar(daftar); daftar = null;
      out.push('<p>' + inlineKeHtml(trim) + '</p>');
      i++;
    }
    tutupDaftar(daftar);
    return out.join('\n');
  }

  function tabelKeHtml(baris) {
    var sel = function (s) {
      return s.replace(/^\||\|$/g, '').split('|').map(function (x) { return x.trim(); });
    };
    var h = sel(baris[0]);
    var html = '<table><thead><tr>';
    h.forEach(function (c) { html += '<th>' + inlineKeHtml(c) + '</th>'; });
    html += '</tr></thead><tbody>';
    for (var i = 2; i < baris.length; i++) {
      html += '<tr>';
      sel(baris[i]).forEach(function (c) { html += '<td>' + inlineKeHtml(c) + '</td>'; });
      html += '</tr>';
    }
    return html + '</tbody></table>';
  }

  /* ---------------- blok: html -> markdown (yang DISIMPAN) ----------------

     Ini arah yang menentukan: hasilnya masuk database dan dibaca
     _markdown.php. Aturannya ketat — apa pun yang tidak dikenali dibuang
     tagnya dan hanya teksnya yang bertahan, sehingga tidak ada cara HTML
     nyasar ikut tersimpan.
  */

  function htmlKeMd(html) {
    var doc;
    if (typeof DOMParser !== 'undefined') {
      doc = new DOMParser().parseFromString('<div id="akar">' + html + '</div>', 'text/html');
    } else {
      // Jalur uji di Node (jsdom disuntik lewat KDMD._doc).
      doc = akar.KDMD._doc(html);
    }
    var akarEl = doc.getElementById('akar');
    return rapikan(blokKeMd(akarEl, ''));
  }

  function rapikan(s) {
    return String(s)
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\n+/, '')
      .replace(/\n+$/, '') + '\n';
  }

  function blokKeMd(induk, indenLi) {
    var hasil = '';
    var anak = induk.childNodes;

    for (var i = 0; i < anak.length; i++) {
      var n = anak[i];

      if (n.nodeType === 3) {
        // Teks langsung di antara blok: hanya dipakai kalau bukan spasi kosong.
        var t = n.nodeValue.replace(/\s+/g, ' ').trim();
        if (t) hasil += t + '\n\n';
        continue;
      }
      if (n.nodeType !== 1) continue;

      var tag = n.nodeName.toLowerCase();
      var kls = n.getAttribute('class') || '';

      // --- elemen khusus app ini, dikenali dari class ---

      if (kls.indexOf('kd-video') !== -1) {
        var url = n.getAttribute('data-url') || '';
        var jud = n.getAttribute('data-judul') || '';
        if (url) hasil += '@video ' + url + (jud ? ' ' + jud : '') + '\n\n';
        continue;
      }

      if (tag === 'figure' || n.querySelector && (tag === 'figure')) {
        var img = n.querySelector('img');
        if (img) {
          var cap = n.querySelector('figcaption');
          var alt = (cap ? cap.textContent : img.getAttribute('alt') || '').trim();
          hasil += '![' + alt + '](' + (img.getAttribute('src') || '') + ')\n\n';
        }
        continue;
      }

      if (kls.indexOf('kd-kartu') !== -1) {
        var jenis = n.getAttribute('data-jenis') || 'catat';
        if (JENIS.indexOf(jenis) === -1) jenis = 'catat';
        // Judul kartu diambil dari elemen judulnya, lalu elemen itu dilepas
        // dari salinan supaya tidak ikut terbaca dua kali sebagai isi.
        var salin = n.cloneNode(true);
        var jd = salin.querySelector('.kd-kartu-judul');
        var judul = '';
        if (jd) { judul = inlineKeMd(jd).trim(); jd.parentNode.removeChild(jd); }
        hasil += ':::' + jenis + (judul ? ' ' + judul : '') + '\n'
               + rapikan(blokKeMd(salin, '')).replace(/\n$/, '') + '\n:::\n\n';
        continue;
      }

      // --- elemen HTML biasa ---

      if (/^h[1-6]$/.test(tag)) {
        var lv = Math.max(1, parseInt(tag.slice(1), 10) - 1);   // h3 editor -> "##"
        hasil += new Array(lv + 1).join('#') + ' ' + inlineKeMd(n).trim() + '\n\n';
        continue;
      }

      if (tag === 'pre') {
        // Tanpa language- berarti fence tanpa label — jangan ditambahi.
        var bahasa = (kls.match(/language-([a-zA-Z0-9_-]+)/) || [, ''])[1];
        var kodeEl = n.querySelector('code') || n;
        hasil += '```' + bahasa + '\n' + kodeEl.textContent.replace(/\n$/, '') + '\n```\n\n';
        continue;
      }

      if (tag === 'blockquote') {
        var isiKutip = rapikan(blokKeMd(n, '')).replace(/\n$/, '');
        isiKutip.split('\n').forEach(function (b) {
          hasil += (b.trim() ? '> ' + b : '>') + '\n';
        });
        hasil += '\n';
        continue;
      }

      if (tag === 'hr') { hasil += '---\n\n'; continue; }

      if (tag === 'ul' || tag === 'ol') {
        hasil += daftarKeMd(n, indenLi) + '\n';
        continue;
      }

      if (tag === 'table') { hasil += tabelKeMd(n) + '\n'; continue; }

      if (tag === 'p' || tag === 'div') {
        // <div> polos dari paste dianggap paragraf; kalau isinya blok lain,
        // rekursi yang menanganinya.
        var punyaBlok = n.querySelector('p,div,ul,ol,table,pre,blockquote,h1,h2,h3,h4,h5,h6,figure');
        if (punyaBlok) { hasil += blokKeMd(n, indenLi); continue; }
        var par = inlineKeMd(n).replace(/\s+/g, ' ').trim();
        if (par) hasil += par + '\n\n';
        continue;
      }

      if (tag === 'br') { continue; }

      // Tag tak dikenal: ambil isinya, buang tagnya.
      var sisa = inlineKeMd(n).trim();
      if (sisa) hasil += sisa + '\n\n';
    }
    return hasil;
  }

  function daftarKeMd(el, inden) {
    var kls = el.getAttribute('class') || '';
    var ceklis = kls.indexOf('kd-ceklis') !== -1;
    var urut = el.nodeName.toLowerCase() === 'ol';
    var out = '';
    var no = 1;

    for (var i = 0; i < el.childNodes.length; i++) {
      var li = el.childNodes[i];
      if (li.nodeType !== 1 || li.nodeName.toLowerCase() !== 'li') continue;

      // Daftar bersarang ditangani terpisah supaya indennya benar.
      var salin = li.cloneNode(true);
      var sarang = [];
      var sub = salin.querySelectorAll('ul,ol');
      for (var j = 0; j < sub.length; j++) {
        if (sub[j].parentNode === salin) {
          sarang.push(sub[j]);
          sub[j].parentNode.removeChild(sub[j]);
        }
      }

      var teks = inlineKeMd(salin).replace(/\s+/g, ' ').trim();
      var tanda;
      if (ceklis) {
        // Status centang ikut disimpan: kalau tidak, semua checklist yang sudah
        // ditandai [x] berubah jadi [ ] setiap kali admin menyimpan.
        tanda = '- [' + (li.getAttribute('data-cek') === '1' ? 'x' : ' ') + '] ';
      } else if (urut) {
        tanda = (no++) + '. ';
      } else {
        tanda = '- ';
      }
      out += inden + tanda + teks + '\n';

      sarang.forEach(function (s) { out += daftarKeMd(s, inden + '  '); });
    }
    return out;
  }

  function tabelKeMd(tabel) {
    var baris = [];
    var trs = tabel.querySelectorAll('tr');
    for (var i = 0; i < trs.length; i++) {
      var sel = trs[i].querySelectorAll('th,td');
      var kol = [];
      for (var j = 0; j < sel.length; j++) {
        // Pipa di dalam sel akan memecah tabel jadi kolom palsu.
        kol.push(inlineKeMd(sel[j]).replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim());
      }
      if (kol.length) baris.push('| ' + kol.join(' | ') + ' |');
    }
    if (!baris.length) return '';
    // _markdown.php WAJIB melihat baris pemisah di posisi kedua, kalau tidak
    // tabelnya dirender sebagai paragraf penuh tanda pipa.
    var jml = (baris[0].match(/\|/g) || []).length - 1;
    var pemisah = '|' + new Array(jml + 1).join(' --- |');
    baris.splice(1, 0, pemisah);
    return baris.join('\n') + '\n';
  }

  akar.KDMD = { _inlineKeHtml: inlineKeHtml, _inlineKeMd: inlineKeMd, _e: e, _unesc: unesc,
                mdKeHtml: mdKeHtml, htmlKeMd: htmlKeMd, JENIS: JENIS };
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));

if (typeof module !== 'undefined' && module.exports) {
  module.exports = (typeof window !== 'undefined' ? window : globalThis).KDMD;
}
