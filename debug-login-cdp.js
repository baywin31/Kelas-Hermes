/* debug-login-cdp.js — cari tahu kenapa login admin di browser nyata gagal.
   Menampilkan judul halaman + pesan flash setelah submit. */
const { buka, tunggu } = require('./cdp-mini.js');
const B = 'http://127.0.0.1:8813';

(async () => {
  const br = await buka();
  try {
    await br.pergi(B + '/login.php');
    const sebelum = await br.eval(`(() => ({
      judul: document.title,
      punyaCsrf: !!document.querySelector('[name=csrf]'),
      aksi: document.querySelector('form').getAttribute('action')
    }))()`);
    console.log('sebelum: ' + JSON.stringify(sebelum));

    await br.eval(`(() => {
      document.querySelector('[name=email]').value = 'admin@demo.id';
      document.querySelector('[name=password]').value = 'demo12345';
      document.querySelector('form').submit();
    })()`);
    await tunggu(2500);

    const sesudah = await br.eval(`(() => ({
      url: location.href,
      judul: document.title,
      flash: (document.querySelector('.flash') || {}).textContent || '(tidak ada)',
      badan: document.body.textContent.replace(/\\s+/g, ' ').slice(0, 260)
    }))()`);
    console.log('sesudah: ' + JSON.stringify(sesudah, null, 1));
  } catch (e) {
    console.log('error: ' + e.message);
  } finally {
    br.tutup();
  }
  process.exit(0);
})();
