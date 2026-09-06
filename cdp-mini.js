/* cdp-mini.js — klien Chrome DevTools Protocol seminimal mungkin.
 *
 * Kenapa ditulis sendiri: `browser_exec` di mesin ini menolak alamat
 * 127.0.0.1 ("URL targets a private or internal address"), jadi app lokal tidak
 * bisa diuji lewat jalur itu. Playwright juga tidak terpasang sebagai modul —
 * yang ada hanya BINER chromium-nya (dari cache ms-playwright). Node 22 sudah
 * punya WebSocket bawaan, jadi cukup bicara langsung ke CDP tanpa dependensi
 * apa pun.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CHROME = [
  path.join(os.homedir(), 'AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'),
  path.join(os.homedir(), 'AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe')
].find((p) => fs.existsSync(p));

async function tunggu(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function ambilJson(url, batas = 20000) {
  const habis = Date.now() + batas;
  for (;;) {
    try {
      const r = await fetch(url);
      if (r.ok) return await r.json();
    } catch (e) { /* browser belum siap */ }
    if (Date.now() > habis) throw new Error('browser tidak menjawab: ' + url);
    await tunggu(200);
  }
}

class Sesi {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.tunda = new Map();
    this.pendengar = [];
    ws.addEventListener('message', (ev) => {
      const p = JSON.parse(ev.data);
      if (p.id && this.tunda.has(p.id)) {
        const { ya, tidak } = this.tunda.get(p.id);
        this.tunda.delete(p.id);
        if (p.error) tidak(new Error(p.error.message));
        else ya(p.result);
        return;
      }
      this.pendengar.forEach((f) => f(p));
    });
  }

  kirim(method, params = {}, sessionId) {
    const id = ++this.id;
    const pesan = { id, method, params };
    if (sessionId) pesan.sessionId = sessionId;
    this.ws.send(JSON.stringify(pesan));
    return new Promise((ya, tidak) => {
      this.tunda.set(id, { ya, tidak });
      setTimeout(() => {
        if (this.tunda.has(id)) { this.tunda.delete(id); tidak(new Error('timeout: ' + method)); }
      }, 30000);
    });
  }

  pada(f) { this.pendengar.push(f); }
}

async function buka(opsi = {}) {
  if (!CHROME) throw new Error('biner chromium tidak ditemukan di cache ms-playwright');
  const port = opsi.port || 9333;
  // Profil baru per proses. Sebelumnya nama folder hanya berdasar port, jadi
  // dua uji yang jalan berdekatan saling menghapus profil satu sama lain dan
  // salah satunya mati dengan EBUSY/ENOTEMPTY di rimraf — kegagalan yang
  // kelihatan seperti bug app padahal murni tabrakan berkas.
  const profil = path.join(os.tmpdir(), 'kd-cdp-profil-' + port + '-' + process.pid);
  fs.rmSync(profil, { recursive: true, force: true });

  const anak = spawn(CHROME, [
    '--headless=new',
    '--remote-debugging-port=' + port,
    '--user-data-dir=' + profil,
    '--no-first-run', '--no-default-browser-check',
    '--disable-gpu', '--disable-dev-shm-usage',
    '--window-size=1400,1000',
    'about:blank'
  ], { stdio: 'ignore' });

  const versi = await ambilJson('http://127.0.0.1:' + port + '/json/version');
  const ws = new WebSocket(versi.webSocketDebuggerUrl);
  await new Promise((ya, tidak) => {
    ws.addEventListener('open', ya, { once: true });
    ws.addEventListener('error', () => tidak(new Error('gagal konek CDP')), { once: true });
  });

  const sesi = new Sesi(ws);
  const { targetId } = await sesi.kirim('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await sesi.kirim('Target.attachToTarget', { targetId, flatten: true });

  await sesi.kirim('Page.enable', {}, sessionId);
  await sesi.kirim('Runtime.enable', {}, sessionId);

  const galat = [];
  sesi.pada((p) => {
    if (p.method === 'Runtime.exceptionThrown') {
      const d = p.params.exceptionDetails;
      galat.push((d.exception && (d.exception.description || d.exception.value)) || d.text);
    }
    if (p.method === 'Runtime.consoleAPICalled' && p.params.type === 'error') {
      galat.push('console.error: ' + p.params.args.map((a) => a.value || a.description).join(' '));
    }
  });

  const eval_ = async (ekspresi) => {
    const r = await sesi.kirim('Runtime.evaluate', {
      expression: ekspresi, returnByValue: true, awaitPromise: true
    }, sessionId);
    if (r.exceptionDetails) {
      throw new Error('JS error: ' + (r.exceptionDetails.exception
        ? r.exceptionDetails.exception.description : r.exceptionDetails.text));
    }
    return r.result.value;
  };

  const pergi = async (url) => {
    await sesi.kirim('Page.navigate', { url }, sessionId);
    // Menunggu load event lebih andal daripada jeda tetap.
    await new Promise((ya) => {
      const t = setTimeout(ya, 15000);
      const f = (p) => { if (p.method === 'Page.loadEventFired') { clearTimeout(t); ya(); } };
      sesi.pada(f);
    });
  };

  // Profil ikut dibersihkan supaya folder temp tidak menumpuk satu folder
  // Chromium (~30 MB) per proses uji.
  const tutup = () => {
    try { ws.close(); } catch (e) {}
    try { anak.kill(); } catch (e) {}
    try { fs.rmSync(profil, { recursive: true, force: true, maxRetries: 3 }); } catch (e) {}
  };

  return { sesi, sessionId, eval: eval_, pergi, tutup, galat, tunggu };
}

module.exports = { buka, tunggu, CHROME };
