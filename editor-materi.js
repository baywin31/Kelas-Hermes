/* editor-materi.js — pasang TinyMCE di editor materi admin.

   Yang membuat pemasangan ini tidak sesederhana "selector: textarea":

   1. Format simpanan TETAP Markdown. TinyMCE bekerja di elemen terpisah;
      textarea asli (name="isi_md") tetap satu-satunya yang dikirim ke server,
      diisi ulang dari editor tepat sebelum submit. Jadi tidak ada perubahan di
      sisi PHP, database, cetak.php, maupun uji-uji lama.

   2. Sintaks khusus app ini punya tombolnya sendiri (kartu :::, @video,
      checklist). Kalau tidak, admin tetap harus mengetik pagar manual —
      dan itu justru masalah yang mau dihilangkan.

   3. Mode Markdown tetap ada. Sekali tombol. Editor visual bagus untuk
      menulis, tapi kalau ada satu hal yang tidak bisa dilakukan lewat toolbar,
      admin tidak boleh terkunci.
*/
(function () {
  'use strict';

  var ta = document.getElementById('isi_md');
  if (!ta || typeof tinymce === 'undefined' || !window.KDMD) return;

  var form = ta.form;
  var KUNCI = 'kd_mode_editor';

  /* ---------- kerangka HTML di sekitar editor ---------- */

  var bar = document.createElement('div');
  bar.className = 'kd-ed-bar';
  bar.innerHTML =
    '<span class="kd-ed-tab" data-mode="visual">Tulis visual</span>' +
    '<span class="kd-ed-tab" data-mode="markdown">Markdown</span>' +
    '<span class="kd-ed-nb">Formatnya tetap Markdown — yang berubah cuma cara mengetiknya.</span>';
  ta.parentNode.insertBefore(bar, ta);

  var kotak = document.createElement('div');
  kotak.className = 'kd-ed-visual';
  // Tanpa name= : elemen ini tidak boleh ikut terkirim ke server.
  kotak.innerHTML = '<textarea id="isi_wysiwyg"></textarea>';
  ta.parentNode.insertBefore(kotak, ta);

  var mode = 'visual';
  try { mode = localStorage.getItem(KUNCI) || 'visual'; } catch (e) {}

  /* ---------- gaya isi di dalam iframe editor ----------
     Iframe TinyMCE tidak mewarisi style.css halaman. Kartu harus tetap
     terlihat seperti kartu di sini, kalau tidak admin menulis buta. */

  var WARNA = {
    cerita: '#A4D8FF', salah: '#ff9b9b', tips: '#8be9c0', awas: '#ffc46b',
    insight: '#c9a7ff', hasil: '#8CCBFA', catat: '#cfdae5', waktu: '#ffd98c',
    aman: '#5fd3c4', periksa: '#c3e88d', opsional: '#9fb3c8'
  };
  var gayaKartu = '';
  Object.keys(WARNA).forEach(function (j) {
    gayaKartu += '.kd-kartu[data-jenis="' + j + '"]{border-left-color:' + WARNA[j] + '}'
      + '.kd-kartu[data-jenis="' + j + '"]::before{color:' + WARNA[j] + '}';
  });

  var ISI_CSS = [
    'body{background:#25282b;color:#f2f7fc;font:15px/1.7 system-ui,Segoe UI,sans-serif;',
    '     padding:16px 18px;max-width:none}',
    'h2,h3,h4,h5{color:#fff;line-height:1.3;margin:1.4em 0 .5em}',
    'h3{font-size:1.35em}h4{font-size:1.12em}h5{font-size:1em}',
    'a{color:#A4D8FF}',
    'code{background:#33383c;padding:1px 5px;border-radius:4px;font-size:.92em}',
    'pre.kd-kode{background:#1d2023;border:1px solid rgba(164,216,255,.14);border-radius:8px;',
    '     padding:12px 14px;overflow:auto;font:13px/1.6 ui-monospace,Consolas,monospace}',
    'blockquote{border-left:3px solid rgba(164,216,255,.35);margin:1em 0;padding:.2em 0 .2em 14px;color:#cfdae5}',
    'hr{border:0;border-top:1px solid rgba(164,216,255,.14);margin:1.6em 0}',
    'table{border-collapse:collapse;width:100%;margin:1em 0;font-size:.95em}',
    'th,td{border:1px solid rgba(164,216,255,.18);padding:7px 10px;text-align:left}',
    'th{background:rgba(164,216,255,.08);color:#fff}',
    /* kartu :::  */
    '.kd-kartu{position:relative;border-left:3px solid #A4D8FF;background:#2b2f32;',
    '     border-radius:0 8px 8px 0;padding:26px 16px 6px;margin:1.2em 0}',
    '.kd-kartu::before{content:attr(data-jenis);position:absolute;top:6px;left:14px;',
    '     font:600 10px/1 ui-monospace,Consolas,monospace;letter-spacing:.14em;text-transform:uppercase}',
    '.kd-kartu-judul{font-weight:700;color:#fff;margin:0 0 .5em}',
    gayaKartu,
    /* checklist */
    'ul.kd-ceklis{list-style:none;padding-left:0}',
    'ul.kd-ceklis li{position:relative;padding-left:28px;margin:.4em 0}',
    'ul.kd-ceklis li::before{content:"";position:absolute;left:2px;top:.28em;width:15px;height:15px;',
    '     border:1.5px solid #6d7883;border-radius:4px}',
    'ul.kd-ceklis li[data-cek="1"]::before{background:#A4D8FF;border-color:#A4D8FF}',
    'ul.kd-ceklis li[data-cek="1"]::after{content:"";position:absolute;left:6px;top:.5em;width:6px;height:3px;',
    '     border-left:2px solid #22262a;border-bottom:2px solid #22262a;transform:rotate(-45deg)}',
    /* video & gambar */
    '.kd-video{border:1px dashed #A4D8FF;border-radius:8px;background:rgba(164,216,255,.06);',
    '     color:#A4D8FF;padding:14px;margin:1.2em 0;font-weight:600;text-align:center;cursor:pointer}',
    '.kd-gambar{margin:1.2em 0}',
    '.kd-gambar img{max-width:100%;border-radius:8px;display:block}',
    '.kd-gambar figcaption{color:#94a3af;font-size:.88em;margin-top:6px}'
  ].join('');

  /* ---------- daftar kartu untuk menu ---------- */

  var KARTU = [
    ['cerita',   'Cerita pembuka'],
    ['salah',    'Cara yang salah'],
    ['tips',     'Tips'],
    ['awas',     'Awas / hati-hati'],
    ['insight',  'Yang jarang dibahas'],
    ['hasil',    'Janji hasil akhir'],
    ['catat',    'Catatan'],
    ['waktu',    'Perkiraan waktu'],
    ['aman',     'Kartu penenang (aman)'],
    ['periksa',  'Titik periksa'],
    ['opsional', 'Boleh dilewati']
  ];

  /* ---------- init ---------- */

  tinymce.init({
    selector: '#isi_wysiwyg',
    // license_key wajib disebut di v6+, kalau tidak muncul spanduk peringatan
    // di atas toolbar. 'gpl' sah untuk build MIT/GPL yang di-self-host.
    license_key: 'gpl',
    base_url: 'tinymce',
    suffix: '.min',
    skin: 'oxide-dark',
    content_css: 'dark',
    content_style: ISI_CSS,
    language: 'id',
    language_url: 'tinymce/langs/id.js',

    height: 520,
    menubar: false,
    branding: false,
    promotion: false,
    statusbar: true,
    elementpath: false,
    resize: true,
    browser_spellcheck: true,
    contextmenu: 'link table',

    plugins: 'lists link table code codesample searchreplace fullscreen wordcount autoresize',
    autoresize_bottom_margin: 24,
    min_height: 420,
    max_height: 900,

    toolbar: [
      'undo redo | blocks | bold italic kdkode | bullist numlist kdceklis'
      + ' | kdkartu | kdvideo kdgambar | link table kdkodeblok | removeformat'
      + ' | searchreplace fullscreen kdkerangka'
    ].join(''),

    // Daftar blok dibatasi ke yang PUNYA arti di _markdown.php. h1 dibuang:
    // "# judul" akan bertabrakan dengan judul Bagian yang sudah dicetak
    // materi.php, jadi kalau dibiarkan admin bisa bikin dua judul besar.
    block_formats: 'Paragraf=p; Judul kartu (##)=h3; Sub-kartu (###)=h4; Judul kecil (####)=h5',

    // Tempel dari Word/Google Docs: ambil isinya, buang gayanya. Kalau style
    // ikut masuk, hasil konversi ke markdown jadi penuh <span> kosong.
    paste_as_text: false,
    paste_webkit_styles: 'none',
    paste_merge_formats: true,

    // JANGAN pakai valid_elements penuh: menuliskannya sendiri berarti
    // membuang daftar bawaan, dan tabel langsung rusak karena colgroup/col
    // serta atribut colspan/scope tidak ikut disebut. Pembersihan sudah
    // dilakukan di htmlKeMd() — apa pun yang tidak dikenal kehilangan tagnya
    // saat disimpan. Di sini cukup TAMBAHKAN elemen khusus app ini supaya
    // tidak dibuang, dan tolak elemen yang memang tidak boleh ada.
    extended_valid_elements: 'div[class|data-jenis|data-url|data-judul|contenteditable],'
      + 'li[data-cek],pre[class],figure[class],figcaption,img[src|alt]',
    invalid_elements: 'script,iframe,object,embed,form,input,button,style,noscript',

    // URL relatif seperti "gambar/langkah-1.png" harus tetap apa adanya.
    // Tanpa ini TinyMCE mengubahnya jadi bentuk lain dan gambar hilang setelah
    // disimpan.
    convert_urls: false,
    relative_urls: false,
    remove_script_host: false,

    // Pilihan bahasa blok kode dibatasi ke yang benar-benar dipakai materi.
    codesample_languages: [
      { text: 'Terminal / Bash', value: 'bash' },
      { text: 'Teks biasa', value: 'text' },
      { text: 'JSON', value: 'json' },
      { text: 'YAML', value: 'yaml' },
      { text: 'PHP', value: 'php' },
      { text: 'JavaScript', value: 'javascript' },
      { text: 'HTML', value: 'markup' }
    ],

    // Dipanggil setelah iframe editor benar-benar siap. setContent() sebelum
    // titik ini diam-diam tidak berefek.
    init_instance_callback: function (ed) {
      window.KD_ED = ed;
      ed.setContent(window.KDMD.mdKeHtml(ta.value));
      if (mode === 'markdown') { kotak.style.display = 'none'; ta.style.display = ''; }
      else { kotak.style.display = ''; ta.style.display = 'none'; }
      simpanMode();
    },

    setup: function (ed) {
      /* --- tombol: kode inline --- */
      ed.ui.registry.addToggleButton('kdkode', {
        icon: 'sourcecode',
        tooltip: 'Kode dalam kalimat (`kode`)',
        onAction: function () { ed.execCommand('mceToggleFormat', false, 'code'); },
        onSetup: function (api) {
          return ed.formatter.formatChanged('code', function (ada) { api.setActive(ada); }).unbind;
        }
      });

      /* --- tombol: checklist ---
         Checklist BUKAN daftar biasa. Yang membedakan hanya class kd-ceklis di
         <ul> dan data-cek di <li>; TinyMCE tidak punya konsep ini, jadi kita
         ubah daftar yang sedang aktif. */
      ed.ui.registry.addToggleButton('kdceklis', {
        icon: 'checklist',
        tooltip: 'Checklist (kotak centang)',
        onAction: function () {
          var li = ed.dom.getParent(ed.selection.getNode(), 'li');
          if (!li) { ed.execCommand('InsertUnorderedList'); li = ed.dom.getParent(ed.selection.getNode(), 'li'); }
          var ul = li && ed.dom.getParent(li, 'ul');
          if (!ul) return;
          if (ed.dom.hasClass(ul, 'kd-ceklis')) {
            ed.dom.removeClass(ul, 'kd-ceklis');
            ed.dom.select('li', ul).forEach(function (x) { ed.dom.setAttrib(x, 'data-cek', null); });
          } else {
            ed.dom.addClass(ul, 'kd-ceklis');
            ed.dom.select('li', ul).forEach(function (x) {
              if (!x.getAttribute('data-cek')) ed.dom.setAttrib(x, 'data-cek', '0');
            });
          }
          ed.nodeChanged();
        },
        onSetup: function (api) {
          var pantau = function () {
            var ul = ed.dom.getParent(ed.selection.getNode(), 'ul');
            api.setActive(!!(ul && ed.dom.hasClass(ul, 'kd-ceklis')));
          };
          ed.on('NodeChange', pantau);
          return function () { ed.off('NodeChange', pantau); };
        }
      });

      /* --- klik kotak checklist = centang/batal ---
         Ini yang bikin editor terasa "beres": status [x] diubah dengan klik,
         bukan dengan mengetik x di dalam kurung. */
      ed.on('click', function (ev) {
        var li = ed.dom.getParent(ev.target, 'li');
        if (!li) return;
        var ul = ed.dom.getParent(li, 'ul');
        if (!ul || !ed.dom.hasClass(ul, 'kd-ceklis')) return;
        // Hanya area kotak di kiri (28px pertama), supaya mengedit teks tidak
        // ikut mencentang.
        var kotakLi = li.getBoundingClientRect();
        if (ev.clientX - kotakLi.left > 26) return;
        ed.dom.setAttrib(li, 'data-cek', li.getAttribute('data-cek') === '1' ? '0' : '1');
        ed.undoManager.add();
      });

      /* --- menu kartu ::: ---
         Satu tombol dengan 11 pilihan. Kartu dibuat sebagai <div> berisi
         paragraf judul + paragraf isi; keduanya tetap bisa diedit langsung. */
      ed.ui.registry.addMenuButton('kdkartu', {
        icon: 'comment-add',
        tooltip: 'Sisipkan kartu berwarna (:::)',
        fetch: function (kirim) {
          kirim(KARTU.map(function (k) {
            return {
              type: 'menuitem',
              text: k[1] + '  (' + k[0] + ')',
              onAction: function () { sisipKartu(ed, k[0], k[1]); }
            };
          }));
        }
      });

      /* --- video --- */
      ed.ui.registry.addButton('kdvideo', {
        icon: 'embed',
        tooltip: 'Sisipkan video YouTube (@video)',
        onAction: function () { dialogVideo(ed); }
      });

      /* --- gambar --- */
      ed.ui.registry.addButton('kdgambar', {
        icon: 'image',
        tooltip: 'Sisipkan gambar',
        onAction: function () { dialogGambar(ed); }
      });

      /* --- blok kode --- */
      ed.ui.registry.addButton('kdkodeblok', {
        icon: 'code-sample',
        tooltip: 'Blok kode / isi terminal',
        onAction: function () { ed.execCommand('CodeSample'); }
      });

      /* --- kerangka modul ---
         Tombol lama di HTML mengisi <textarea>; di mode visual isinya harus
         lewat konversi markdown dulu, kalau tidak pagar ::: masuk sebagai teks. */
      ed.ui.registry.addButton('kdkerangka', {
        icon: 'template',
        tooltip: 'Sisipkan kerangka modul lengkap',
        onAction: function () {
          var sumber = document.getElementById('kerangka-modul');
          if (!sumber) return;
          var html = window.KDMD.mdKeHtml(sumber.value);
          if (ed.getContent({ format: 'text' }).trim() === '') ed.setContent(html);
          else ed.insertContent('<p></p>' + html);
        }
      });

      window.KD_ED = ed;
    }
  });

  /* ---------- penyisipan kartu ---------- */

  function sisipKartu(ed, jenis, label) {
    var pilihan = ed.selection.getContent({ format: 'html' });
    var isi = pilihan && pilihan.replace(/<[^>]*>/g, '').trim()
      ? pilihan
      : '<p>Tulis isi kartu di sini.</p>';
    ed.insertContent(
      '<div class="kd-kartu" data-jenis="' + jenis + '">'
      + '<p class="kd-kartu-judul">' + label + '</p>'
      + isi + '</div><p></p>'
    );
  }

  /* ---------- dialog video ---------- */

  function dialogVideo(ed) {
    ed.windowManager.open({
      title: 'Sisipkan video YouTube',
      body: {
        type: 'panel',
        items: [
          { type: 'input', name: 'url', label: 'Tautan YouTube',
            placeholder: 'https://youtube.com/shorts/XXXX atau youtu.be/XXXX' },
          { type: 'input', name: 'judul', label: 'Judul video (opsional)' },
          { type: 'htmlpanel',
            html: '<p style="margin:.2em 0;font-size:12px;opacity:.75">Bentuk apa pun boleh: '
                + 'shorts/, watch?v=, atau youtu.be/. Shorts otomatis dipasang tegak.</p>' }
        ]
      },
      buttons: [
        { type: 'cancel', text: 'Batal' },
        { type: 'submit', text: 'Sisipkan', primary: true }
      ],
      onSubmit: function (dlg) {
        var d = dlg.getData();
        var url = (d.url || '').trim();
        if (!url) { dlg.close(); return; }
        var jud = (d.judul || '').trim();
        ed.insertContent(
          '<div class="kd-video" data-url="' + ed.dom.encode(url) + '"'
          + ' data-judul="' + ed.dom.encode(jud) + '" contenteditable="false">'
          + '\u25b6 Video: ' + ed.dom.encode(jud || url) + '</div><p></p>'
        );
        dlg.close();
      }
    });
  }

  /* ---------- dialog gambar ---------- */

  function dialogGambar(ed) {
    ed.windowManager.open({
      title: 'Sisipkan gambar',
      body: {
        type: 'panel',
        items: [
          { type: 'input', name: 'src', label: 'Alamat gambar',
            placeholder: 'https://…/gambar.png atau gambar/langkah-1.png' },
          { type: 'input', name: 'alt', label: 'Keterangan (tampil di bawah gambar)' }
        ]
      },
      buttons: [
        { type: 'cancel', text: 'Batal' },
        { type: 'submit', text: 'Sisipkan', primary: true }
      ],
      onSubmit: function (dlg) {
        var d = dlg.getData();
        var src = (d.src || '').trim();
        if (!src) { dlg.close(); return; }
        var alt = (d.alt || '').trim();
        ed.insertContent(
          '<figure class="kd-gambar"><img src="' + ed.dom.encode(src) + '"'
          + ' alt="' + ed.dom.encode(alt) + '">'
          + (alt ? '<figcaption>' + ed.dom.encode(alt) + '</figcaption>' : '')
          + '</figure><p></p>'
        );
        dlg.close();
      }
    });
  }

  window.KD_EDITOR = { ISI_CSS: ISI_CSS, WARNA: WARNA, KARTU: KARTU,
                       bar: bar, ta: ta, mode: mode, KUNCI: KUNCI };

  /* ---------- ganti mode: visual <-> markdown ----------

     Aturan yang tidak boleh dilanggar: SATU sumber kebenaran pada satu waktu.
     Saat pindah mode, isi dipindahkan dulu, baru tampilannya ditukar. Kalau
     dibalik, tulisan terakhir hilang tanpa jejak — dan itu jenis bug yang
     baru terasa setelah admin kehilangan satu jam kerja.
  */

  function keVisual() {
    var ed = window.KD_ED;
    if (ed) ed.setContent(window.KDMD.mdKeHtml(ta.value));
    kotak.style.display = '';
    ta.style.display = 'none';
    mode = 'visual';
    simpanMode();
  }

  function keMarkdown() {
    var ed = window.KD_ED;
    if (ed) ta.value = window.KDMD.htmlKeMd(ed.getContent());
    kotak.style.display = 'none';
    ta.style.display = '';
    mode = 'markdown';
    simpanMode();
  }

  function simpanMode() {
    try { localStorage.setItem(KUNCI, mode); } catch (e) {}
    bar.querySelectorAll('.kd-ed-tab').forEach(function (t) {
      var aktif = t.getAttribute('data-mode') === mode;
      t.classList.toggle('aktif', aktif);
      t.setAttribute('aria-pressed', aktif ? 'true' : 'false');
    });
    // Petunjuk mengikuti mode: daftar sintaks pagar ::: tidak berguna di mode
    // visual, dan sebaliknya penjelasan toolbar tidak berguna di mode markdown.
    document.querySelectorAll('[data-hint-md]').forEach(function (p) {
      p.hidden = (mode !== 'markdown');
    });
    document.querySelectorAll('[data-hint-visual]').forEach(function (p) {
      p.hidden = (mode !== 'visual');
    });
  }

  bar.querySelectorAll('.kd-ed-tab').forEach(function (t) {
    t.setAttribute('role', 'button');
    t.setAttribute('tabindex', '0');
    var jalan = function () {
      if (t.getAttribute('data-mode') === 'visual') keVisual(); else keMarkdown();
    };
    t.addEventListener('click', jalan);
    t.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); jalan(); }
    });
  });

  /* ---------- sebelum submit: textarea WAJIB berisi markdown terbaru ----------

     Ini titik paling rawan seluruh fitur. Tombol "Simpan" dan "Pratinjau"
     mengirim name="isi_md" — kalau editor visual sedang aktif dan isinya
     belum dipindahkan, server menerima teks LAMA dan seolah-olah editannya
     hilang. Karena itu pemindahan dilakukan di event submit form, bukan di
     handler tombol: apa pun yang men-submit form (klik, Enter, script) tetap
     lewat sini.
  */
  if (form) {
    form.addEventListener('submit', function () {
      if (mode === 'visual' && window.KD_ED) {
        ta.value = window.KDMD.htmlKeMd(window.KD_ED.getContent());
      }
    });
  }

  /* Ctrl+S = simpan, kebiasaan yang otomatis dicoba orang saat mengedit teks
     panjang. Tanpa ini browser membuka dialog "simpan halaman". */
  document.addEventListener('keydown', function (ev) {
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') {
      var tombol = form && form.querySelector('button[value="simpan"]');
      if (tombol) { ev.preventDefault(); tombol.click(); }
    }
  });

  /* Isi awal + tampilan awal dipasang lewat init_instance_callback (lihat init
     di atas), bukan lewat polling: TinyMCE menyiapkan iframe secara asinkron,
     dan setContent() sebelum itu selesai akan hilang tanpa error. */
})();
