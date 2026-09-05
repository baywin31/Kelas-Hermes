#!/usr/bin/env bash
# warnai-html.sh — terapkan palet biru langit + abu arang ke mode HTML
# (parts/00-head.html), memakai substitusi yang sama seperti style.css.
set -eu
cd "$(dirname "$0")"
F=parts/00-head.html
cp -f "$F" "$F.bak"

# permukaan: hitam pekat -> abu arang turunan #35393C
sed -i 's/#08090a/#25282b/g' "$F"
sed -i 's/#0c0d0f/#2b2f32/g' "$F"

# aksen ungu -> biru langit
sed -i 's/#5e6ad2/#A4D8FF/g' "$F"
sed -i 's/#7170ff/#BFE4FF/g' "$F"
sed -i 's/#828fff/#8CCBFA/g' "$F"
sed -i 's/#b3b9ff/#BFE4FF/g' "$F"
sed -i 's/#a3adff/#D4EDFF/g' "$F"

# status
sed -i 's/#10b981/#7fd8b5/g' "$F"
sed -i 's/#f2555a/#ff9b9e/g' "$F"
sed -i 's/#f5a623/#f5c97a/g' "$F"
sed -i 's/#229ED9/#A4D8FF/g' "$F"
sed -i 's/#6ee7b7/#9be5c8/g' "$F"
sed -i 's/#4ade9f/#7fd8b5/g' "$F"
sed -i 's/#ff8b8f/#ff9b9e/g' "$F"
sed -i 's/#ffa8ab/#ffbabd/g' "$F"

# rgba ungu -> rgba biru langit
sed -i 's/rgba(94,106,210,\.14)/rgba(164,216,255,.10)/g'  "$F"
sed -i 's/rgba(94,106,210,\.16)/rgba(164,216,255,.14)/g'  "$F"
sed -i 's/rgba(113,112,255,\.18)/rgba(164,216,255,.22)/g' "$F"
sed -i 's/rgba(113,112,255,\.3)/rgba(164,216,255,.34)/g'  "$F"
sed -i 's/rgba(113,112,255,\.28)/rgba(164,216,255,.30)/g' "$F"
sed -i 's/rgba(113,112,255,\.09)/rgba(164,216,255,.10)/g' "$F"
sed -i 's/rgba(113,112,255,\.12)/rgba(164,216,255,.13)/g' "$F"
sed -i 's/rgba(113,112,255,\.32)/rgba(164,216,255,.34)/g' "$F"

# garis & permukaan putih -> berbias biru
sed -i 's/rgba(255,255,255,\.024)/rgba(164,216,255,.035)/g' "$F"
sed -i 's/rgba(255,255,255,\.018)/rgba(164,216,255,.035)/g' "$F"
sed -i 's/rgba(255,255,255,\.05)/rgba(164,216,255,.07)/g'   "$F"
sed -i 's/rgba(255,255,255,\.07)/rgba(164,216,255,.10)/g'   "$F"
sed -i 's/rgba(255,255,255,\.08)/rgba(164,216,255,.14)/g'   "$F"
sed -i 's/rgba(255,255,255,\.06)/rgba(164,216,255,.10)/g'   "$F"
sed -i 's/rgba(255,255,255,\.12)/rgba(164,216,255,.20)/g'   "$F"
sed -i 's/rgba(255,255,255,\.14)/rgba(164,216,255,.24)/g'   "$F"
sed -i 's/rgba(255,255,255,\.02)/rgba(164,216,255,.04)/g'   "$F"
sed -i 's/rgba(255,255,255,\.03)/rgba(164,216,255,.06)/g'   "$F"

# teks di atas tombol terang harus gelap
sed -i 's/color:#fff/color:#22262a/g' "$F"

echo "sisa warna lama: $(grep -c '113,112,255\|94,106,210\|5e6ad2\|7170ff\|08090a' "$F" || true)"
echo "rujukan biru langit: $(grep -c '164,216,255\|A4D8FF' "$F")"
