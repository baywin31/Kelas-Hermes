// palet-blok.js — cari blok warna besar di gambar palet dengan menyampel
// beberapa kolom vertikal, lalu ringkas jadi rentang y per warna.
const { execSync } = require('child_process');
const fs = require('fs');
const zlib = require('zlib');

const buf = fs.readFileSync(process.argv[2]);
let pos = 8, w = 0, h = 0, bit = 0, tipe = 0, idat = [];
while (pos < buf.length) {
  const len = buf.readUInt32BE(pos);
  const nama = buf.toString('ascii', pos + 4, pos + 8);
  const data = buf.slice(pos + 8, pos + 8 + len);
  if (nama === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bit = data[8]; tipe = data[9]; }
  else if (nama === 'IDAT') idat.push(data);
  else if (nama === 'IEND') break;
  pos += 12 + len;
}
const kanal = tipe === 6 ? 4 : 3;
const raw = zlib.inflateSync(Buffer.concat(idat));
const stride = w * kanal;
const px = Buffer.alloc(h * stride);
for (let y = 0; y < h; y++) {
  const f = raw[y * (stride + 1)];
  const src = raw.slice(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
  const cur = px.slice(y * stride, (y + 1) * stride);
  const pre = y > 0 ? px.slice((y - 1) * stride, y * stride) : Buffer.alloc(stride);
  for (let i = 0; i < stride; i++) {
    const a = i >= kanal ? cur[i - kanal] : 0, b = pre[i], c = i >= kanal ? pre[i - kanal] : 0;
    let v = src[i];
    if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
    else if (f === 4) {
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
    }
    cur[i] = v & 0xff;
  }
}
const ambil = (x, y) => { const o = y * stride + x * kanal; return [px[o], px[o+1], px[o+2]]; };
const hex = c => '#' + c.map(v => v.toString(16).padStart(2,'0').toUpperCase()).join('');

// Kumpulkan warna solid: hanya piksel yang tetangganya sama (bukan tepi/teks).
const peta = new Map();
const step = 17;
for (let y = 4; y < h - 4; y += step) {
  for (let x = 4; x < w - 4; x += step) {
    const c = ambil(x, y);
    const kiri = ambil(x - 4, y), atas = ambil(x, y - 4);
    const beda = (a, b) => Math.abs(a[0]-b[0]) + Math.abs(a[1]-b[1]) + Math.abs(a[2]-b[2]);
    if (beda(c, kiri) > 12 || beda(c, atas) > 12) continue;
    const k = c.map(v => (v >> 3) << 3).join(',');
    const e = peta.get(k) || { n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += c[0]; e.g += c[1]; e.b += c[2];
    peta.set(k, e);
  }
}
const total = [...peta.values()].reduce((s, d) => s + d.n, 0);
console.log('blok warna solid (>=1%):');
[...peta.values()].sort((a,b) => b.n - a.n).forEach(d => {
  const pct = d.n / total * 100;
  if (pct < 1) return;
  const c = [d.r/d.n, d.g/d.n, d.b/d.n].map(Math.round);
  console.log(`  ${hex(c)}  rgb(${c.join(',')})  ${pct.toFixed(1)}%`);
});
