// ambil-palet.js — baca warna nyata dari PNG palet tanpa dependensi:
// PNG di-decode via zlib bawaan Node (IHDR + IDAT + unfilter), lalu disampel
// di grid. Dipakai karena ekstensi GD tidak aktif di PHP portable ini.
const fs = require('fs');
const zlib = require('zlib');

const berkas = process.argv[2];
const buf = fs.readFileSync(berkas);
if (buf.readUInt32BE(0) !== 0x89504e47) { console.error('bukan PNG'); process.exit(1); }

let pos = 8, w = 0, h = 0, bit = 0, tipe = 0, idat = [];
while (pos < buf.length) {
  const len = buf.readUInt32BE(pos);
  const nama = buf.toString('ascii', pos + 4, pos + 8);
  const data = buf.slice(pos + 8, pos + 8 + len);
  if (nama === 'IHDR') {
    w = data.readUInt32BE(0); h = data.readUInt32BE(4);
    bit = data[8]; tipe = data[9];
  } else if (nama === 'IDAT') idat.push(data);
  else if (nama === 'IEND') break;
  pos += 12 + len;
}
if (bit !== 8 || (tipe !== 2 && tipe !== 6)) {
  console.error(`format tak didukung: bit=${bit} tipe=${tipe}`); process.exit(2);
}

const kanal = tipe === 6 ? 4 : 3;
const raw = zlib.inflateSync(Buffer.concat(idat));
const stride = w * kanal;
const px = Buffer.alloc(h * stride);

// Buka filter per baris (spesifikasi PNG: None/Sub/Up/Average/Paeth).
for (let y = 0; y < h; y++) {
  const f = raw[y * (stride + 1)];
  const src = raw.slice(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
  const cur = px.slice(y * stride, (y + 1) * stride);
  const pre = y > 0 ? px.slice((y - 1) * stride, y * stride) : Buffer.alloc(stride);
  for (let i = 0; i < stride; i++) {
    const a = i >= kanal ? cur[i - kanal] : 0, b = pre[i];
    const c = i >= kanal ? pre[i - kanal] : 0;
    let v = src[i];
    if (f === 1) v += a;
    else if (f === 2) v += b;
    else if (f === 3) v += (a + b) >> 1;
    else if (f === 4) {
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
    }
    cur[i] = v & 0xff;
  }
}

const ambil = (x, y) => {
  const o = y * stride + x * kanal;
  return [px[o], px[o + 1], px[o + 2]];
};
const hex = ([r, g, b]) =>
  '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0').toUpperCase()).join('');

console.log(`dimensi: ${w}x${h}\n`);

const KOL = 10, BAR = 24, peta = new Map();
for (let by = 0; by < BAR; by++) {
  for (let bx = 0; bx < KOL; bx++) {
    const [r, g, b] = ambil(Math.floor((bx + 0.5) * w / KOL), Math.floor((by + 0.5) * h / BAR));
    const k = [r, g, b].map(v => (v >> 4) << 4).join(',');
    const e = peta.get(k) || { n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += r; e.g += g; e.b += b;
    peta.set(k, e);
  }
}
console.log('warna dominan:');
[...peta.values()].sort((a, b) => b.n - a.n).slice(0, 14).forEach(d => {
  const c = [d.r / d.n, d.g / d.n, d.b / d.n].map(Math.round);
  const pct = (d.n / (KOL * BAR) * 100).toFixed(1).padStart(5);
  console.log(`  ${hex(c)}  rgb(${c.join(',')})  ${pct}%`);
});

console.log('\nurutan vertikal (x tengah):');
let last = '';
const xt = Math.floor(w / 2);
for (let y = 0; y < h; y += Math.max(1, Math.floor(h / 60))) {
  const c = ambil(xt, y);
  const k = c.map(v => (v >> 4) << 4).join(',');
  if (k !== last) { console.log(`  y=${String(y).padStart(5)}  ${hex(c)}`); last = k; }
}
