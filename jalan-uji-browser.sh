#!/usr/bin/env bash
# jalan-uji-browser.sh — uji yang butuh Chromium sungguhan.
#
# Dipisah dari jalan-uji.sh karena tiap berkas menyalakan browser sendiri
# (~15-40 detik), sementara jalan-uji.sh dipakai berkali-kali saat menulis kode.
#
# Rate limit login lokal 8 percobaan per email, dan setiap berkas di sini login
# sekali. Dijalankan berurutan tanpa reset, uji ketiga bisa gagal dengan pesan
# menyesatkan "Email atau password salah" padahal sandinya benar — jadi rate
# limit dikosongkan sebelum SETIAP berkas, bukan sekali di awal.
set -uo pipefail
cd "$(dirname "$0")" || exit 1
B="http://127.0.0.1:8813"
T="$LOCALAPPDATA/Temp"

for f in uji-editor-nyata.js uji-edit-nyata.js ukur-edit-tampilan.js uji-setia-materi.js; do
  curl -sS --max-time 20 -o "$T/rr.txt" "$B/_uji_ratereset.php" >/dev/null 2>&1
  printf "%-24s " "$f"
  node "$f" > "$T/br-$f.txt" 2>&1
  tail -1 "$T/br-$f.txt"
  grep "^BAD" "$T/br-$f.txt" | head -5
done
