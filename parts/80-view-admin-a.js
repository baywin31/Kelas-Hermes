/* ============================================================
   Panel admin: ringkasan, kode akses, materi, tiket, setelan, data.
   Semua halaman admin memeriksa role; member dapat kartu "Akses ditolak".
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

/* ---------- ringkasan ---------- */
R.admin = function () {
  var g = jaga();
  if (g.pergi) return false;
  if (g.tolak) return g.tolak;
  var s = S2.statistik(), st = S._get();
  var akhir = st.audit.slice(-12).reverse();

  return subnav('admin') +
  '<div class="card"><h1>Panel admin</h1>' +
    '<p class="sub" style="margin-bottom:0">Kelola kode akses, materi, dan pertanyaan member dari satu tempat.</p></div>' +
  '<div class="stat">' +
    '<div class="box"><b>' + s.member + '</b><span>Member terdaftar</span></div>' +
    '<div class="box"><b>' + s.kode_total + '</b><span>Kode dibuat</span></div>' +
    '<div class="box"><b>' + s.kode_dipakai + '</b><span>Kode ditukar</span></div>' +
    '<div class="box"><b>' + s.kode_sisa + '</b><span>Kode siap kirim</span></div>' +
    '<div class="box"><b>' + s.tuntas + '</b><span>Member tuntas 100%</span></div>' +
    '<div class="box"><b>' + s.tiket_baru + '</b><span>Pertanyaan baru</span></div>' +
  '</div>' +
  '<div class="card tight"><div class="row">' +
    '<a class="btn blok" href="#/admin-kode">Generate kode</a>' +
    '<a class="btn ghost blok" href="#/admin-materi">Edit materi</a>' +
    '<a class="btn ghost blok" href="#/admin-tiket">Lihat pertanyaan</a>' +
  '</div></div>' +
  '<div class="card"><h2 style="margin-top:0">Member</h2>' + tabelMember() + '</div>' +
  '<div class="card"><h2 style="margin-top:0">Aktivitas terakhir</h2>' +
    (akhir.length
      ? '<div class="tabel-scroll"><table class="data"><thead><tr><th>Waktu</th><th>Peristiwa</th><th>Detail</th></tr></thead><tbody>' +
        akhir.map(function (a) {
          return '<tr><td class="muted small">' + K.tglJam(a.ts) + '</td><td class="mono">' + K.esc(a.ev) +
            '</td><td class="muted small">' + K.esc(a.detail) + '</td></tr>';
        }).join('') + '</tbody></table></div>'
      : '<p class="muted">Belum ada aktivitas.</p>') +
  '</div>';
};

function tabelMember() {
  var st = S._get();
  var member = st.users.filter(function (u) { return u.role === 'member'; })
    .sort(function (a, b) { return b.dibuat - a.dibuat; });
  if (!member.length) return '<p class="muted">Belum ada member yang menukar kode.</p>';
  return '<div class="tabel-scroll"><table class="data"><thead><tr>' +
    '<th>Nama</th><th>Email</th><th>Kode</th><th>Gabung</th><th>Progres</th></tr></thead><tbody>' +
    member.map(function (u) {
      var p = S2.progresPersen(u.id);
      return '<tr><td>' + K.esc(u.nama) + '</td><td class="small">' + K.esc(u.email) + '</td>' +
        '<td class="mono">' + K.esc(u.kode || '—') + '</td>' +
        '<td class="muted small">' + K.tgl(u.dibuat) + '</td>' +
        '<td>' + p.selesai + '/' + p.total + ' <span class="muted small">(' + p.persen + '%)</span></td></tr>';
    }).join('') + '</tbody></table></div>';
}

/* ---------- kode akses ---------- */
var kodeBaru = [];
var kodeFilter = { q: '', status: 'semua' };

R['admin-kode'] = function () {
  var g = jaga();
  if (g.pergi) return false;
  if (g.tolak) return g.tolak;
  var st = S._get();

  var h = subnav('admin-kode') +
  '<div class="card"><h1>Kode akses</h1>' +
    '<p class="sub">Buat kode per transaksi, lalu kirim ke pembeli. Satu kode hanya bisa dipakai satu kali.</p>' +
    '<form data-aksi="kode-buat" novalidate><div class="row">' +
      '<div style="flex:0 1 130px"><label for="jumlah">Jumlah</label>' +
        '<input id="jumlah" name="jumlah" type="number" min="1" max="500" value="10"></div>' +
      '<div><label for="batch">Batch (opsional)</label>' +
        '<input id="batch" name="batch" maxlength="60" placeholder="misal: lynk-okt"></div>' +
      '<div><label for="note">Catatan (opsional)</label>' +
        '<input id="note" name="note" maxlength="120" placeholder="misal: order #1234"></div>' +
    '</div><p style="margin-top:16px"><button class="btn" type="submit">Generate Kode Baru</button></p></form>';

  if (kodeBaru.length) {
    h += '<h3>' + kodeBaru.length + ' kode baru</h3>' +
      '<div class="kode-list" id="kode-baru">' + K.esc(kodeBaru.join('\n')) + '</div>' +
      '<div class="row rapat" style="margin-top:12px">' +
        '<button class="btn ghost kecil" data-aksi="kode-copy">Copy semua</button>' +
        '<button class="btn ghost kecil" data-aksi="kode-csv">Unduh CSV semua kode</button>' +
      '</div>';
  }
  h += '</div>';

  /* filter + daftar */
  var rows = st.kode.slice().sort(function (a, b) { return b.dibuat - a.dibuat; });
  var q = kodeFilter.q.trim().toUpperCase();
  if (q) rows = rows.filter(function (k) {
    var u = k.dipakaiOleh ? S.cariUserId(k.dipakaiOleh) : null;
    return (k.kode + ' ' + (k.batch || '') + ' ' + (k.note || '') + ' ' +
      (u ? u.email + ' ' + u.nama : '')).toUpperCase().indexOf(q) >= 0;
  });
  if (kodeFilter.status !== 'semua') rows = rows.filter(function (k) {
    if (kodeFilter.status === 'dipakai') return !!k.dipakaiOleh;
    if (kodeFilter.status === 'bebas') return !k.dipakaiOleh && !k.dicabut;
    return !!k.dicabut;
  });

  h += '<div class="card"><h2 style="margin-top:0">Semua kode (' + st.kode.length + ')</h2>' +
    '<form data-aksi="kode-filter"><div class="row">' +
      '<input name="q" placeholder="cari kode / email / batch" value="' + K.esc(kodeFilter.q) + '">' +
      '<select name="status" style="flex:0 1 170px">' +
        ['semua', 'bebas', 'dipakai', 'dicabut'].map(function (s) {
          return '<option value="' + s + '"' + (kodeFilter.status === s ? ' selected' : '') + '>' +
            (s === 'semua' ? 'Semua status' : s.charAt(0).toUpperCase() + s.slice(1)) + '</option>';
        }).join('') +
      '</select>' +
      '<button class="btn ghost" type="submit" style="flex:0 0 auto">Terapkan</button>' +
    '</div></form>';

  if (!rows.length) {
    h += '<p class="muted" style="margin-top:16px">Tidak ada kode yang cocok.</p>';
  } else {
    h += '<div class="tabel-scroll" style="margin-top:14px"><table class="data"><thead><tr>' +
      '<th>Kode</th><th>Status</th><th>Batch</th><th>Dibuat</th><th>Ditukar</th><th>Member</th><th></th>' +
      '</tr></thead><tbody>' +
      rows.slice(0, 200).map(function (k) {
        var u = k.dipakaiOleh ? S.cariUserId(k.dipakaiOleh) : null;
        var badge = k.dicabut ? '<span class="badge cabut">Dicabut</span>'
          : (k.dipakaiOleh ? '<span class="badge pakai">Dipakai</span>' : '<span class="badge bebas">Bebas</span>');
        return '<tr><td class="mono">' + K.esc(k.kode) + '</td><td>' + badge + '</td>' +
          '<td class="small muted">' + K.esc(k.batch || '—') + '</td>' +
          '<td class="small muted">' + K.tgl(k.dibuat) + '</td>' +
          '<td class="small muted">' + (k.dipakaiPada ? K.tgl(k.dipakaiPada) : '—') + '</td>' +
          '<td class="small">' + (u ? K.esc(u.email) : '—') + '</td>' +
          '<td>' + (k.dipakaiOleh ? '' :
            '<button class="btn ' + (k.dicabut ? 'ghost' : 'danger') + ' kecil" data-aksi="kode-cabut" ' +
            'data-kode="' + K.esc(k.kode) + '" data-nilai="' + (k.dicabut ? '0' : '1') + '">' +
            (k.dicabut ? 'Aktifkan' : 'Cabut') + '</button>') + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      (rows.length > 200 ? '<p class="hint">Menampilkan 200 teratas dari ' + rows.length + '.</p>' : '');
  }
  h += '</div>';
  return h;
};

A['kode-buat'] = function (form) {
  kodeBaru = S.buatKode(U.nilai(form, 'jumlah'), U.nilai(form, 'batch'), U.nilai(form, 'note'));
  U.flash('ok', kodeBaru.length + ' kode berhasil dibuat.');
  U.render();
};
A['kode-filter'] = function (form) {
  kodeFilter.q = U.nilai(form, 'q');
  kodeFilter.status = U.nilai(form, 'status') || 'semua';
  U.render();
};
A['kode-cabut'] = function (el) {
  S.cabutKode(el.getAttribute('data-kode'), el.getAttribute('data-nilai') === '1');
  U.render();
};
A['kode-copy'] = function () {
  var teks = kodeBaru.join('\n');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(teks).then(function () { U.toast('Kode dicopy.'); },
      function () { U.toast('Gagal copy — pilih manual dari kotak.'); });
  } else U.toast('Browser ini tidak mendukung copy otomatis.');
};
A['kode-csv'] = function () {
  U.unduh('kode-akses.csv', S2.kodeCsv(), 'text/csv;charset=utf-8');
};
})();
