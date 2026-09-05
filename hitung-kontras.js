// hitung-kontras.js — rasio kontras WCAG 2.1 untuk pasangan warna yang
// benar-benar dipakai di UI. Ambang: 4.5 untuk teks biasa, 3.0 untuk teks
// besar/tombol dan elemen non-teks.
const pasangan = [
  ['teks utama di latar',      '#f2f7fc', '#25282b', 4.5],
  ['teks sekunder di latar',   '#cfdae5', '#25282b', 4.5],
  ['teks redup di latar',      '#94a3af', '#25282b', 4.5],
  ['teks paling redup',        '#6d7883', '#25282b', 3.0],
  ['teks di tombol aksen',     '#22262a', '#A4D8FF', 4.5],
  ['teks di tombol hover',     '#22262a', '#BFE4FF', 4.5],
  ['tautan di latar',          '#8CCBFA', '#25282b', 4.5],
  ['status ok di latar',       '#7fd8b5', '#25282b', 4.5],
  ['status bahaya di latar',   '#ff9b9e', '#25282b', 4.5],
  ['status warning di latar',  '#f5c97a', '#25282b', 4.5],
  ['aksen sbg elemen',         '#A4D8FF', '#25282b', 3.0],
  ['teks di panel terangkat',  '#f2f7fc', '#2b2f32', 4.5],
];

const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const lum = hex => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const rasio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

let gagal = 0;
console.log('  pasangan                       rasio  ambang  hasil');
for (const [nama, fg, bg, min] of pasangan) {
  const r = rasio(fg, bg);
  const lolos = r >= min;
  if (!lolos) gagal++;
  console.log(
    '  ' + nama.padEnd(28) +
    r.toFixed(2).padStart(6) +
    min.toFixed(1).padStart(8) + '  ' +
    (lolos ? 'lolos' : 'GAGAL')
  );
}
process.exit(gagal === 0 ? 0 : 1);
