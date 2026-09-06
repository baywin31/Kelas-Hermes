/* petik-resep.js — keluarkan resep Tailwind untuk komponen tertentu dari
   ringkasan riset, satu per satu.

   Kenapa perlu: ringkasannya 66 KB. Membacanya utuh membanjiri konteks, dan
   yang dibutuhkan hanya beberapa komponen yang belum diterapkan. */
const fs = require('fs');

const F = process.argv[2];
const nomorMinta = process.argv.slice(3).map(Number);

const teks = fs.readFileSync(F, 'utf8');
const data = JSON.parse(teks.slice(teks.indexOf('{'), teks.lastIndexOf('}') + 1));

nomorMinta.forEach((n) => {
  const k = data.components[n - 1];
  if (!k) { console.log('#' + n + ' tidak ada'); return; }
  console.log('\n########## ' + n + '. ' + k.name + ' ##########');
  if (k.used_by) console.log('DIPAKAI OLEH: ' + k.used_by);
  if (k.why_premium) console.log('KENAPA MAHAL: ' + k.why_premium);
  if (k.structure) console.log('BENTUK: ' + k.structure);
  if (k.tailwind_recipe) console.log('RESEP:\n' + k.tailwind_recipe);
});
