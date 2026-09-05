#!/usr/bin/env bash
# bangun.sh — kompilasi Tailwind jadi ../tw.css.
#
# Kenapa dikompilasi di sini, bukan CDN:
#  - Hosting bersama tidak punya Node. Pembeli tidak perlu build apa pun,
#    cukup upload tw.css seperti berkas biasa.
#  - CDN Tailwind (cdn.tailwindcss.com) memasang compiler ~300KB di browser
#    pembeli, memblokir render, dan halaman kelas jadi terasa lambat —
#    justru kebalikan dari kesan "premium".
#  - Hasil kompilasi hanya memuat kelas yang benar-benar dipakai
#    (biasanya < 25KB), jadi lebih kecil dari satu gambar tangkapan layar.
set -euo pipefail

# Node di sini program Windows asli, jadi jalur MSYS ("/c/Users/...") tidak
# dikenalinya. Dipakai USERPROFILE yang sudah bergaya Windows, garis miringnya
# dibalik supaya aman dipakai di dalam tanda kutip bash.
RUMAH="${USERPROFILE//\\//}"
TW="$RUMAH/tools/tw/node_modules/tailwindcss/lib/cli.js"
if [ ! -f "$TW" ]; then
  echo "GAGAL: Tailwind belum terpasang."
  echo "Pasang sekali saja:  mkdir -p ~/tools/tw && cd ~/tools/tw && npm init -y && npm i tailwindcss@3.4.17"
  exit 1
fi

cd "$(dirname "$0")"
node "$TW" \
  --config ./tailwind.config.js \
  --input  ./input.css \
  --output ../tw.css \
  --minify

UKURAN=$(wc -c < ../tw.css | tr -d ' ')
echo "tw.css dibangun: ${UKURAN} byte"

# Jaring pengaman: kalau hasilnya mencurigakan kecil, berarti pemindaian
# kelas gagal (jalur content salah) dan halaman akan tampil tanpa gaya.
if [ "$UKURAN" -lt 4000 ]; then
  echo "PERINGATAN: tw.css terlalu kecil — cek jalur 'content' di tailwind.config.js"
  exit 1
fi
