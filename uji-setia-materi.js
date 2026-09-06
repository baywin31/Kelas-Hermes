/* uji-setia-materi.js — uji KESETIAAN pada materi nyata yang sudah live.
 *
 * Pertanyaan yang dijawab: kalau admin membuka Bagian 1–4 di editor visual lalu
 * menekan Simpan TANPA mengubah apa pun, apakah markdown-nya tetap sama?
 *
 * Kenapa ini uji terpenting: seluruh materi kelas sudah ditulis dan sudah live.
 * Editor visual yang "hampir setia" berarti setiap kali admin menyentuh satu
 * huruf, bagian lain diam-diam rusak — kartu hilang, tabel pecah, video jadi
 * teks. Kerusakan itu tidak melempar error, jadi hanya kelihatan lewat
 * perbandingan karakter per karakter.
 *
 * Materi lolos kalau markdown setelah bolak-balik SAMA PERSIS, atau bedanya
 * hanya hal yang tidak mengubah hasil render (jumlah baris kosong berlebih).
 *
 * Jalankan (server 8813 hidup): node uji-setia-materi.js
 */
const { buka, tunggu } = require('./cdp-mini.js');
const fs = require('fs');
const path = require('path');
const os = require('os');

const B = 'http://127.0.0.1:8813';
let lulus = 0, gagal = 0;
const ok = (n, b, x) => {
  if (b) { lulus++; console.log('OK   ' + n); }
  else { gagal++; console.log('BAD  ' + n + (x !== undefined ? '\n     ' + x : '')); }
};

// Normalisasi yang SAH: hanya hal yang tidak mempengaruhi hasil md_to_html().
// Sengaja tidak menormalkan apa pun yang lain — kalau kartu atau tabel berubah,
// uji harus gagal, bukan disamarkan.
const rapikan = (s) => String(s)
  .replace(/\r\n/g, '\n')
  .replace(/[ \t]+$/gm, '')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

(async () => {
  try { await fetch(B + '/_uji_ratereset.php'); } catch (e) {}
  try { await fetch(B + '/_uji_akun.php'); } catch (e) {}

  const br = await buka();
  const T = os.tmpdir();
  try {
    await br.pergi(B + '/login.php');
    await br.eval(`(() => {
      document.querySelector('[name=email]').value = 'admin@demo.id';
      document.querySelector('[name=password]').value = 'demo12345';
      document.querySelector('form').submit();
    })()`);
    await tunggu(1200);

    for (const b of [1, 2, 3, 4]) {
      console.log('\n=== Bagian ' + b + ' ===');
      await br.pergi(B + '/admin_materi.php?b=' + b);
      const siap = await br.eval(`(async () => {
        for (let i = 0; i < 80; i++) {
          if (window.KD_ED && document.querySelector('.tox-tinymce')) return 'siap';
          await new Promise(r => setTimeout(r, 250));
        }
        return 'tidak siap';
      })()`);
      if (siap !== 'siap') { ok('B' + b + ': editor siap', false, siap); continue; }

      // Markdown asli dari database = isi textarea sebelum apa pun disentuh.
      // Diambil dari atribut defaultValue supaya pasti nilai dari server.
      const asli = await br.eval('document.getElementById("isi_md").defaultValue');

      // Paksa perjalanan lengkap: markdown -> HTML editor -> markdown lagi.
      const balik = await br.eval(`(() => {
        const ed = window.KD_ED;
        ed.setContent(window.KDMD.mdKeHtml(document.getElementById('isi_md').defaultValue));
        return window.KDMD.htmlKeMd(ed.getContent());
      })()`);

      const a = rapikan(asli), z = rapikan(balik);
      const sama = a === z;

      // Yang menentukan lulus/gagal adalah HASIL RENDER, bukan teks markdown.
      // Perbedaan seperti "|---|---|" vs "| --- | --- |" atau "```text" vs "```"
      // tidak mengubah satu piksel pun di halaman member — menolaknya sama
      // dengan menolak editor karena selera penulisan pipa.
      const fd = new URLSearchParams({ md_a: asli, md_b: balik });
      const jawab = await (await fetch(B + '/_uji_bandingrender.php', {
        method: 'POST', body: fd
      })).text();
      const renderSama = /^sama: YA/m.test(jawab);

      ok('B' + b + ': hasil render IDENTIK setelah bolak-balik editor visual',
        renderSama, jawab.split('\n').slice(0, 6).join('\n     '));

      if (renderSama && !sama) {
        console.log('     (teks markdown berbeda kosmetik saja — render sama persis)');
      }

      if (!renderSama) {
        // Simpan keduanya supaya bisa dibandingkan tanpa menebak.
        fs.writeFileSync(path.join(T, 'setia-b' + b + '-asli.md'), a);
        fs.writeFileSync(path.join(T, 'setia-b' + b + '-balik.md'), z);
        const la = a.split('\n'), lz = z.split('\n');
        let beda = 0;
        for (let i = 0; i < Math.max(la.length, lz.length) && beda < 6; i++) {
          if (la[i] !== lz[i]) {
            beda++;
            console.log('     baris ' + (i + 1));
            console.log('       asli : ' + JSON.stringify((la[i] || '').slice(0, 110)));
            console.log('       balik: ' + JSON.stringify((lz[i] || '').slice(0, 110)));
          }
        }
        console.log('     (berkas lengkap di ' + T + '\\setia-b' + b + '-*.md)');
      }

      // Selain sama-atau-tidak, hitung unsur pentingnya. Kalau jumlahnya
      // berubah, ada yang benar-benar hilang — bukan sekadar spasi.
      const hitung = (s) => ({
        kartu: (s.match(/^:::[a-z]+ /gm) || []).length,
        tutup: (s.match(/^:::$/gm) || []).length,
        judul2: (s.match(/^## /gm) || []).length,
        judul3: (s.match(/^### /gm) || []).length,
        cek: (s.match(/^- \[[ x]\] /gm) || []).length,
        tabel: (s.match(/^\|/gm) || []).length,
        video: (s.match(/^@video /gm) || []).length,
        gambar: (s.match(/^!\[/gm) || []).length,
        kode: (s.match(/^```/gm) || []).length
      });
      const ha = hitung(a), hz = hitung(z);
      Object.keys(ha).forEach((k) => {
        ok('B' + b + ': jumlah ' + k + ' tetap (' + ha[k] + ')', ha[k] === hz[k],
          'asli=' + ha[k] + ' balik=' + hz[k]);
      });
    }

    console.log('\n-----');
    console.log('LULUS=' + lulus + ' GAGAL=' + gagal);
  } catch (e) {
    console.log('BAD  uji berhenti: ' + e.message);
    gagal++;
  } finally {
    br.tutup();
  }
  process.exit(gagal ? 1 : 0);
})();
