#!/usr/bin/env bash
# uji-warna.sh — periksa palet baru benar-benar terpasang & kontras aman.
# Kontras dihitung pakai rumus WCAG (relative luminance), bukan dikira-kira.
set -u
D="$(cd "$(dirname "$0")" && pwd)"
LULUS=0; GAGAL=0
ok()  { echo "OK   $1"; LULUS=$((LULUS+1)); }
bad() { echo "GAGAL $1"; GAGAL=$((GAGAL+1)); }

F="$D/style.css"

echo "### Token palet"
grep -q -- "--accent:#A4D8FF" "$F" && ok "accent = #A4D8FF (biru langit user)" || bad "accent bukan #A4D8FF"
grep -q -- "--bg:#25282b"     "$F" && ok "bg diturunkan dari #35393C" || bad "bg salah"
grep -q -- "--on-accent"      "$F" && ok "ada token teks-di-atas-aksen" || bad "on-accent tidak ada"

echo
echo "### Tidak ada sisa warna lama"
n=$(grep -c "113,112,255\|94,106,210\|5e6ad2\|7170ff" "$F" || true)
[ "$n" = "0" ] && ok "warna ungu lama habis" || bad "masih ada $n rujukan ungu"
n=$(grep -c "color:#fff" "$F" || true)
[ "$n" = "0" ] && ok "tidak ada teks putih di atas tombol terang" || bad "masih ada $n color:#fff"

echo
echo "### Print stylesheet tetap utuh"
grep -q "@media print" "$F" && ok "blok @media print ada" || bad "blok print hilang"
grep -q "body{background:#fff" "$F" && ok "halaman cetak berlatar putih" || bad "cetak tidak putih"

echo
echo "### Kontras WCAG"
# Node adalah program Windows asli: jalur MSYS (/c/Users/...) tidak dikenali,
# jadi dipakai jalur bergaya C:/Users/... 
node "C:/Users/user/apps/karyawan-digital-php/hitung-kontras.js" && ok "semua pasangan warna lolos ambang" || bad "ada pasangan gagal kontras"

echo
echo "-----"
echo "LULUS=$LULUS GAGAL=$GAGAL"
[ "$GAGAL" -eq 0 ]
