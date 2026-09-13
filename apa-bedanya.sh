#!/usr/bin/env bash
# apa-bedanya.sh — tunjukkan PERSIS apa yang berbeda antara aset lokal dan live.
#
# Kenapa perlu sebelum deploy: ukuran sama tapi hash beda itu mencurigakan
# (bisa cuma akhiran baris CRLF/LF, bisa perubahan nyata). Dan style.css lokal
# lebih besar 6,7 KB — itu pekerjaan dari sesi lain yang belum pernah dideploy.
# Mengirim ke produksi tanpa tahu isinya sama dengan menebak.
set -uo pipefail
cd "$(dirname "$0")"
T="${LOCALAPPDATA}/Temp/kd-banding"

for f in tw.css app.js style.css; do
  echo "################ $f ################"
  [ -f "$T/$f" ] || { echo "belum diunduh, jalankan banding-live.sh dulu"; continue; }

  LL=$(wc -l < "$f" | tr -d ' '); LS=$(wc -l < "$T/$f" | tr -d ' ')
  echo "baris: lokal=$LL live=$LS"

  # Cek akhiran baris: kalau bedanya cuma CR, isinya sebenarnya identik.
  CRL=$(grep -c $'\r' "$f" 2>/dev/null || echo 0)
  CRS=$(grep -c $'\r' "$T/$f" 2>/dev/null || echo 0)
  echo "baris ber-CR: lokal=$CRL live=$CRS"

  # Banding setelah CR dinormalkan.
  tr -d '\r' < "$f" > "$T/n-lokal.txt"
  tr -d '\r' < "$T/$f" > "$T/n-live.txt"
  if cmp -s "$T/n-lokal.txt" "$T/n-live.txt"; then
    echo "HASIL: isi IDENTIK, bedanya cuma akhiran baris (CRLF vs LF)"
  else
    echo "HASIL: isi BENAR-BENAR berbeda"
    echo "--- baris yang hanya ada di LOKAL (maks 12) ---"
    diff "$T/n-live.txt" "$T/n-lokal.txt" | grep '^>' | head -12 | cut -c1-110
    echo "--- baris yang hanya ada di LIVE (maks 6) ---"
    diff "$T/n-live.txt" "$T/n-lokal.txt" | grep '^<' | head -6 | cut -c1-110
  fi
  echo
done
