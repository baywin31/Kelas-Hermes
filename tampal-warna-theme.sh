#!/usr/bin/env bash
# tampal-warna-theme.sh — daftar warna yang ditulis LANGSUNG di berkas PHP
# (bukan lewat variabel), untuk diperiksa apakah masih terbaca di tema terang.
#
# Kenapa perlu: gaya-lazy.css menyelesaikan warna dari style.css, tapi warna
# yang ditulis langsung di atribut style="..." tidak tersentuh. Di tema terang,
# warna-warna terang itu bisa jadi tidak terbaca. Skrip ini hanya MELAPORKAN —
# tidak mengubah apa pun — supaya keputusannya sadar, bukan kebetulan.
set -u
cd "$(dirname "$0")"

echo "=== WARNA LANGSUNG DI BERKAS PHP ==="
for F in *.php; do
  N=$(grep -oE 'style="[^"]*(#[0-9a-fA-F]{3,8}|rgba?\()[^"]*"' "$F" 2>/dev/null | wc -l | tr -d ' ')
  [ "$N" = "0" ] && continue
  echo
  echo "--- $F ($N tempat) ---"
  grep -oE 'style="[^"]*(#[0-9a-fA-F]{3,8}|rgba?\()[^"]*"' "$F" | sed 's/^style="//; s/"$//' | sort | uniq -c | sort -rn | sed 's/^/    /'
done

echo
echo "=== WARNA LANGSUNG DI BERKAS CSS ==="
for F in *.css; do
  [ "$F" = "gaya-lazy.css" ] && continue
  N=$(grep -oE '#[0-9a-fA-F]{3,8}' "$F" 2>/dev/null | wc -l | tr -d ' ')
  printf '    %-20s %s warna\n' "$F" "$N"
done
echo
echo "Catatan: berkas .css lain sudah ditangani gaya-lazy.css (penimpaan variabel"
echo "         + tampalan beberapa warna langsung). Yang perlu diperiksa mata"
echo "         hanyalah warna di berkas .php di atas."
