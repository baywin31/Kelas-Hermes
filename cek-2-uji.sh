#!/usr/bin/env bash
# cek-2-uji.sh — jalankan ulang 2 uji yang dulu gagal ("login gagal: 401" dan
# "Invalid cookie fields") untuk membuktikan keduanya sudah beres.
#
# Kenapa: notifikasi suite yang telat menampilkan 2 kegagalan dari run LAMA
# (sebelum perbaikan). Perlu dibuktikan dengan run SEGAR, bukan dijelaskan.
set -u
cd "$(cd "$(dirname "$0")" && pwd)"

# Pastikan server lokal hidup — uji ini butuh halaman sungguhan.
if ! curl -s -o /dev/null -m 8 http://127.0.0.1:8813/login.php; then
  echo "menyalakan server lokal 8813..."
  C:/Users/user/tools/php83/php.exe -c C:/Users/user/tools/php83/php.ini \
    -S 127.0.0.1:8813 -t . > /dev/null 2>&1 &
  sleep 4
fi

echo "=== uji-label-batang.js (label B1-B9) ==="
NODE_PATH='C:\Users\user\apps\dompetku\.test\node_modules' node uji-label-batang.js 2>&1 | tail -6

echo
echo "=== ukur-sejajar.js (keselarasan kartu) ==="
NODE_PATH='C:\Users\user\apps\dompetku\.test\node_modules' node ukur-sejajar.js 2>&1 | tail -4

echo
echo "=== potret-dashboard.js (bukti halaman utuh) ==="
NODE_PATH='C:\Users\user\apps\dompetku\.test\node_modules' node potret-dashboard.js 2>&1 | tail -4
