/* ============================================================
   Panel admin bagian 2: editor materi + FAQ, pertanyaan member,
   setelan (Telegram/kontak/quick links), cadangan data.
   ============================================================ */
(function () {
'use strict';
var K = window.KD, S = window.KD_STORE_1, S2 = window.KD_STORE_2;
var U = window.KD_UI, R = U.routes, A = window.KD_AKSI;

function subnav(aktif) {
  var item = [['admin', 'Ringkasan'], ['admin-kode', 'Kode akses'], ['admin-materi', 'Materi'],
    ['admin-tiket', 'Pertanyaan'], ['admin-setelan', 'Setelan'], ['admin-data', 'Data']];
  return '<nav class="subnav">' + item.map(function (i) {
    return '<a class="' + (i[0] === aktif ? 'aktif' : '') + '" href="#/' + i[0] + '">' + i[1] + '</a>';
  }).join('') + '</nav>';
}
function jaga() {
  var u = U.butuhAdmin();
  if (u === null) return { pergi: true };
  if (u === false) return { tolak: U.kartuTolak() };
  return { user: u };
}

/* ---------- editor materi ---------- */
var pratinjau = null;   /* {urutan, html} */

R['admin-materi'] = function (rute) {
  var g = jaga();
  if (g.pergi) return false;
  if (g.tolak) return g.tolak;

  var list = S2.bagianSemua();
  var pilih = rute.query.b ? parseInt(rute.query.b, 10) : (list[0] ? list[0].urutan : 1);
  var b = S2.bagianSatu(pilih);
  var baru = !b;
  if (baru) b = { urutan: pilih, judul: '', ringkas: '', isi_md: '', updated: 0 };

  var h = subnav('admin-materi') +
  '<div class="card"><h1>Materi kelas</h1>' +
    '<p class="sub">Ubah isi Bagian kapan saja — member langsung melihat versi terbaru, tanpa kirim ulang file.</p>' +
    '<div class="row rapat">' +
      list.map(function (x) {
        return '<a class="btn ' + (x.urutan === pilih ? '' : 'ghost') + ' kecil" href="#/admin-materi?b=' + x.urutan + '">Bagian ' + x.urutan + '</a>';
      }).join('') +
      '<a class="btn ghost kecil" href="#/admin-materi?b=' + S2.bagianBaruNomor() + '">+ Bagian baru</a>' +
    '</div>' +
  '</div>' +
  '<div class="card">' +
    '<h2 style="margin-top:0">' + (baru ? 'Bagian baru (nomor ' + pilih + ')' : 'Edit Bagian ' + pilih) + '</h2>' +
    '<form data-aksi="materi-simpan" novalidate>' +
      '<input type="hidden" name="urutan" value="' + pilih + '">' +
      '<label for="judul">Judul</label>' +
      '<input id="judul" name="judul" required maxlength="200" value="' + K.esc(b.judul) + '">' +
      '<label for="ringkas">Ringkasan singkat</label>' +
      '<input id="ringkas" name="ringkas" maxlength="300" value="' + K.esc(b.ringkas) + '">' +
      '<label for="isi_md">Isi materi (Markdown)</label>' +
      '<textarea id="isi_md" name="isi_md" spellcheck="false">' + K.esc(b.isi_md) + '</textarea>' +
      '<p class="hint">Didukung: judul #, daftar, tabel, kutipan &gt;, `kode`, ```blok kode```, ' +
        '**tebal**, *miring*, [tautan](https://…). HTML mentah tidak dieksekusi — disengaja, supaya aman.</p>' +
      '<p class="hint"><strong>Gambar:</strong> ' +
        '<span class="mono">![keterangan](https://…/gambar.png)</span> — kalau ditulis ' +
        'di baris sendiri, keteranganya tampil di bawah gambar. Jalur di hosting ' +
        'sendiri juga boleh, mis. <span class="mono">gambar/langkah-1.png</span>.</p>' +
      '<p class="hint"><strong>Video:</strong> satu baris sendiri ' +
        '<span class="mono">@video https://youtube.com/shorts/XXXX Judul video</span> ' +
        '(judul opsional). Bentuk shorts/, watch?v=, atau youtu.be/ semua boleh; ' +
        'shorts otomatis tegak.</p>' +
      '<div class="row rapat" style="margin-top:18px">' +
        '<button class="btn" type="submit">Simpan materi</button>' +
        '<button class="btn ghost" type="button" data-aksi="materi-pratinjau" data-b="' + pilih + '">Pratinjau</button>' +
        (baru ? '' : '<button class="btn danger" type="button" data-aksi="materi-hapus" data-b="' + pilih + '">Hapus Bagian</button>') +
      '</div>' +
    '</form>' +
    (b.updated ? '<p class="hint">Terakhir diperbarui ' + K.tglJam(b.updated) + '</p>' : '') +
  '</div>';

  if (pratinjau && pratinjau.urutan === pilih) {
    h += '<div class="card"><h2 style="margin-top:0">Pratinjau</h2>' +
      '<div class="isi-materi">' + pratinjau.html + '</div></div>';
  }

  h += '<div class="card"><h2 style="margin-top:0">Halaman FAQ</h2>' +
    '<form data-aksi="faq-simpan" novalidate>' +
      '<textarea name="faq_md" spellcheck="false">' + K.esc(S._get().faq_md) + '</textarea>' +
      '<p style="margin-top:16px"><button class="btn" type="submit">Simpan FAQ</button></p>' +
    '</form></div>';
  return h;
};

A['materi-simpan'] = function (form) {
  var r = S2.bagianSimpan(U.nilai(form, 'urutan'), U.nilai(form, 'judul'),
    U.nilai(form, 'ringkas'), U.nilai(form, 'isi_md'));
  U.flash(r.ok ? 'ok' : 'err', r.ok ? 'Materi tersimpan dan langsung terlihat member.' : K.esc(r.err));
  U.render();
};
A['materi-pratinjau'] = function (el) {
  var ta = document.getElementById('isi_md');
  pratinjau = { urutan: parseInt(el.getAttribute('data-b'), 10), html: K.md(ta ? ta.value : '') };
  U.render();
};
A['materi-hapus'] = function (el) {
  var no = parseInt(el.getAttribute('data-b'), 10);
  if (!window.confirm('Hapus Bagian ' + no + '? Progres member untuk Bagian ini ikut hilang.')) return;
  S2.bagianHapus(no);
  pratinjau = null;
  U.flash('ok', 'Bagian ' + no + ' dihapus.');
  U.go('/admin-materi');
};
A['faq-simpan'] = function (form) {
  S2.faqSimpan(U.nilai(form, 'faq_md'));
  U.flash('ok', 'FAQ tersimpan.');
  U.render();
};

/* ---------- pertanyaan member ---------- */
R['admin-tiket'] = function () {
  var g = jaga();
  if (g.pergi) return false;
  if (g.tolak) return g.tolak;
  var t = S._get().tiket.slice().reverse();
  var h = subnav('admin-tiket') + '<div class="card"><h1>Pertanyaan member</h1>' +
    '<p class="sub" style="margin-bottom:0">Masuk dari tombol "Tanya Admin" di area member.</p></div>';
  if (!t.length) return h + '<div class="card"><p class="muted">Belum ada pertanyaan.</p></div>';
  h += '<div class="card">';
  t.forEach(function (x) {
    h += '<div class="bagian"><div class="isi">' +
      '<h3 style="margin:0 0 2px">' + K.esc(x.nama) + ' <span class="muted small">' + K.esc(x.email) + '</span></h3>' +
      '<p class="small" style="margin:6px 0">' + K.esc(x.isi) + '</p>' +
      '<span class="muted small">' + K.tglJam(x.dibuat) + '</span> ' +
      (x.dibalas ? '<span class="badge selesai">Sudah dibalas</span>' : '<span class="badge belum">Menunggu</span>') +
    '</div><div class="aksi">' +
      '<button class="btn ' + (x.dibalas ? 'ghost' : 'ok') + ' kecil" data-aksi="tiket-tandai" ' +
        'data-id="' + K.esc(x.id) + '" data-nilai="' + (x.dibalas ? '0' : '1') + '">' +
        (x.dibalas ? 'Tandai belum' : 'Tandai dibalas') + '</button>' +
    '</div></div>';
  });
  return h + '</div>';
};
A['tiket-tandai'] = function (el) {
  S2.tiketTandai(el.getAttribute('data-id'), el.getAttribute('data-nilai') === '1');
  U.render();
};

/* ---------- setelan ---------- */
R['admin-setelan'] = function () {
  var g = jaga();
  if (g.pergi) return false;
  if (g.tolak) return g.tolak;
  var links = S2.setelan('links', []);
  var teksLinks = links.map(function (l) {
    return [l.judul || '', l.url || '', l.ket || ''].join(' | ');
  }).join('\n');

  return subnav('admin-setelan') +
  '<div class="card"><h1>Setelan</h1>' +
    '<form data-aksi="setelan-simpan" novalidate>' +
      '<label for="telegram_url">Link grup Telegram</label>' +
      '<input id="telegram_url" name="telegram_url" value="' + K.esc(S2.setelan('telegram_url', '')) + '" placeholder="https://t.me/…">' +
      '<p class="hint">Dipakai tombol besar di dashboard member. Wajib diawali https://</p>' +
      '<label for="admin_kontak">Kontak admin (WA/Telegram pribadi)</label>' +
      '<input id="admin_kontak" name="admin_kontak" value="' + K.esc(S2.setelan('admin_kontak', '')) + '" placeholder="https://t.me/namamu">' +
      '<label for="wa_nomor">Nomor WhatsApp admin</label>' +
      '<input id="wa_nomor" name="wa_nomor" value="' + K.esc(S2.setelan('wa_nomor', '')) + '" placeholder="081234567890 atau 6281234567890">' +
      '<p class="hint">Boleh 08xx, spasi, atau tanda hubung — dirapikan otomatis. Kosongkan kalau belum punya: semua tombol WhatsApp hilang sendiri.' +
        (function () {
          var w = K.waLink(S2.setelan('wa_nomor', ''), S2.setelan('wa_pesan', ''));
          return w ? '<br>Aktif sekarang: <span class="mono">' + K.esc(K.waNormal(S2.setelan('wa_nomor', ''))) +
            '</span> — <a href="' + K.esc(w) + '" target="_blank" rel="noopener">uji tautannya</a>.' : '';
        })() +
      '</p>' +
      '<label for="wa_pesan">Pesan pembuka WhatsApp (opsional)</label>' +
      '<input id="wa_pesan" name="wa_pesan" value="' + K.esc(S2.setelan('wa_pesan', '')) + '" placeholder="Halo admin, saya butuh bantuan soal ' + K.esc(K.APP_NAME) + '.">' +
      '<p class="hint">Terisi otomatis di kotak chat member. Di halaman Tanya Admin, nama &amp; email member ditambahkan sendiri.</p>' +
      '<label for="links">Tautan penting (satu per baris: judul | url | keterangan)</label>' +
      '<textarea class="pendek" id="links" name="links" spellcheck="false">' + K.esc(teksLinks) + '</textarea>' +
      '<p style="margin-top:18px"><button class="btn" type="submit">Simpan setelan</button></p>' +
    '</form>' +
  '</div>';
};
A['setelan-simpan'] = function (form) {
  var baris = U.nilai(form, 'links').split('\n');
  var links = [];
  baris.forEach(function (b) {
    if (!b.trim()) return;
    var p = b.split('|');
    var url = (p[1] || '').trim();
    if (!/^https?:\/\//i.test(url)) return;
    links.push({ judul: (p[0] || url).trim(), url: url, ket: (p[2] || '').trim() });
  });
  // Nomor ngawur ditolak sekarang, bukan dibiarkan jadi tombol yang gagal dibuka.
  var waIn = U.nilai(form, 'wa_nomor').trim();
  var waBersih = waIn === '' ? '' : K.waNormal(waIn);
  if (waIn !== '' && waBersih === '') {
    U.flash('err', 'Nomor WhatsApp tidak masuk akal. Contoh benar: 081234567890 atau 6281234567890.');
    U.render();
    return;
  }
  S2.setelanSimpan({
    telegram_url: U.nilai(form, 'telegram_url').trim(),
    admin_kontak: U.nilai(form, 'admin_kontak').trim(),
    wa_nomor: waBersih,
    wa_pesan: U.nilai(form, 'wa_pesan').trim(),
    links: links
  });
  U.flash('ok', 'Setelan tersimpan.');
  U.render();
};

/* ---------- data / cadangan ---------- */
R['admin-data'] = function () {
  var g = jaga();
  if (g.pergi) return false;
  if (g.tolak) return g.tolak;
  var s = S2.statistik();
  return subnav('admin-data') +
  '<div class="card"><h1>Data &amp; cadangan</h1>' +
    '<p class="sub">Mode HTML menyimpan semuanya di localStorage browser ini. Unduh cadangan rutin — ' +
      'menghapus data browser berarti menghapus member dan kode.</p>' +
    '<div class="row rapat">' +
      '<button class="btn" data-aksi="data-export">Unduh cadangan (.json)</button>' +
      '<button class="btn ghost" data-aksi="data-csv">Unduh kode (.csv)</button>' +
    '</div>' +
    '<label for="impor" style="margin-top:24px">Pulihkan dari cadangan</label>' +
    '<input id="impor" name="impor" type="file" accept=".json,application/json" data-aksi="data-import">' +
    '<p class="hint">Semua data saat ini akan diganti isi berkas cadangan.</p>' +
  '</div>' +
  '<div class="card"><h2 style="margin-top:0">Isi penyimpanan sekarang</h2>' +
    '<table class="data">' +
      '<tr><th style="width:220px">Member</th><td>' + s.member + '</td></tr>' +
      '<tr><th>Kode akses</th><td>' + s.kode_total + ' (' + s.kode_dipakai + ' ditukar)</td></tr>' +
      '<tr><th>Bagian materi</th><td>' + s.bagian + '</td></tr>' +
      '<tr><th>Pertanyaan masuk</th><td>' + S._get().tiket.length + '</td></tr>' +
      '<tr><th>Kunci localStorage</th><td class="mono">' + K.esc(K.LS_KEY) + '</td></tr>' +
    '</table>' +
  '</div>' +
  '<div class="card"><h2 style="margin-top:0">Beda mode HTML vs mode PHP</h2>' +
    '<div class="isi-materi"><ul>' +
      '<li><strong>Mode HTML (berkas ini)</strong> — jalan dengan klik dua kali, tanpa server. Data per browser. ' +
        'Cocok untuk demo ke calon pembeli, pemakaian pribadi, atau kelas yang diakses satu perangkat.</li>' +
      '<li><strong>Mode PHP + MySQL</strong> — dipasang di hosting cPanel. Kode akses dan password tersimpan di server, ' +
        'jadi satu kode benar-benar tidak bisa dipakai dua orang, dan member bisa masuk dari perangkat mana pun.</li>' +
    '</ul></div>' +
  '</div>';
};
A['data-export'] = function () {
  var nama = 'karyawan-digital-cadangan-' + new Date(K.now()).toISOString().slice(0, 10) + '.json';
  U.unduh(nama, S2.exportJson(), 'application/json');
  U.toast('Cadangan diunduh.');
};
A['data-csv'] = function () { U.unduh('kode-akses.csv', S2.kodeCsv(), 'text/csv;charset=utf-8'); };
A['data-import'] = function (el) {
  var f = el.files && el.files[0];
  if (!f) return;
  var rd = new FileReader();
  rd.onload = function () {
    var r = S2.importJson(String(rd.result || ''));
    U.flash(r.ok ? 'ok' : 'err', r.ok ? 'Data berhasil dipulihkan.' : K.esc(r.err));
    U.render();
  };
  rd.readAsText(f);
};
})();
