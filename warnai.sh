#!/usr/bin/env bash
# warnai.sh — ganti sisa warna ungu/putih hardcoded di style.css jadi palet
# biru langit + abu arang. Dipisah ke skrip supaya bisa diulang dan diperiksa.
set -eu
cd "$(dirname "$0")"
F=style.css
cp -f "$F" "$F.bak"

# aksen ungu lama -> biru langit
sed -i 's/rgba(94,106,210,\.14)/rgba(164,216,255,.10)/g'  "$F"
sed -i 's/rgba(94,106,210,\.16)/rgba(164,216,255,.14)/g'  "$F"
sed -i 's/rgba(113,112,255,\.3)/rgba(164,216,255,.34)/g'  "$F"
sed -i 's/rgba(113,112,255,\.28)/rgba(164,216,255,.30)/g' "$F"
sed -i 's/rgba(113,112,255,\.09)/rgba(164,216,255,.10)/g' "$F"
sed -i 's/rgba(113,112,255,\.12)/rgba(164,216,255,.13)/g' "$F"
sed -i 's/#b3b9ff/#BFE4FF/g' "$F"
sed -i 's/#a3adff/#D4EDFF/g' "$F"

# garis & permukaan putih -> berbias biru langit, biar senada
sed -i 's/rgba(255,255,255,\.12)/rgba(164,216,255,.20)/g'  "$F"
sed -i 's/rgba(255,255,255,\.14)/rgba(164,216,255,.24)/g'  "$F"
sed -i 's/rgba(255,255,255,\.06)/rgba(164,216,255,.10)/g'  "$F"
sed -i 's/rgba(255,255,255,\.02)/rgba(164,216,255,.04)/g'  "$F"
sed -i 's/rgba(255,255,255,\.03)/rgba(164,216,255,.06)/g'  "$F"
sed -i 's/rgba(255,255,255,\.018)/rgba(164,216,255,.035)/g' "$F"

# hijau/merah status disamakan dengan token baru
sed -i 's/rgba(16,185,129,\.12)/rgba(127,216,181,.14)/g' "$F"
sed -i 's/#6ee7b7/#9be5c8/g' "$F"
sed -i 's/rgba(242,85,90,\.12)/rgba(255,155,158,.14)/g'  "$F"
sed -i 's/rgba(242,85,90,\.4)/rgba(255,155,158,.45)/g'   "$F"
sed -i 's/#ff8b8f/#ff9b9e/g' "$F"
sed -i 's/#ffa8ab/#ffbabd/g' "$F"

echo "sisa warna ungu/putih:"
grep -c "113,112,255\|94,106,210\|rgba(255,255,255" "$F" || true
echo "jumlah rujukan biru langit: $(grep -c '164,216,255' "$F")"
