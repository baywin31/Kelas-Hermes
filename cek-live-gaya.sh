#!/usr/bin/env bash
# cek-live-gaya.sh — buktikan gaya baru benar-benar hidup di hosting, dan
# aplikasi lama tetap sehat.
#
# Kenapa: "FTP bilang sukses" bukan bukti halaman terlayani. Semua diambil
# ulang dari internet, bukan dari berkas lokal.
set -u
cd "$(dirname "$0")"
T="$LOCALAPPDATA/Temp"
H=juraganprompt.biz.id
M=https://$H/member

GAGAL=0
lulus(){ printf '  OK    %s\n' "$1"; }
gagal(){ printf ' GAGAL  %s\n' "$1"; GAGAL=$((GAGAL+1)); }

echo "=== 1. BERKAS TAMPILAN TERLAYANI ==="
for F in gaya-lazy.css style.css; do
  KODE=$(curl -sS -k --max-time 25 -o "$T/cg-$F" -w "%{http_code}" "$M/$F?x=$(date +%s)")
  LOKAL=$(wc -c < "$F" | tr -d ' ')
  WEB=$(wc -c < "$T/cg-$F" | tr -d ' ')
  if [ "$KODE" = "200" ] && [ "$WEB" = "$LOKAL" ]; then
    lulus "$F  HTTP 200, $WEB b (sama dengan lokal)"
  else
    gagal "$F  HTTP $KODE, web=$WEB lokal=$LOKAL"
  fi
done

echo
echo "=== 2. ISI GAYA BARU BENAR ==="
CEK="prefers-color-scheme:yg tema ikut setelan sistem"
CEK="$CEK|--lz-isi:yg isi grafik ada"
CEK="$CEK|conic-gradient:yg cincin tanpa SVG"
CEK="$CEK|lz-lencana-premium:yg lencana premium ikut tema"
CEK="$CEK|#00B8F8:yg aksen dari file Figma"
OLDIFS=$IFS; IFS='|'
for B in $CEK; do
  POLA="${B%%:*}"; NAMA="${B#*:}"
  J=$(grep -o -e "$POLA" "$T/cg-gaya-lazy.css" | wc -l | tr -d ' ')
  if [ "$J" -gt 0 ]; then lulus "$NAMA ($J kali)"; else gagal "$NAMA tidak ketemu"; fi
done
IFS=$OLDIFS
# --topbar-bg dipindahkan ke style.css (gaya-lazy.css hanya menimpa nilainya).
J=$(grep -o -e "--topbar-bg" "$T/cg-style.css" | wc -l | tr -d ' ')
[ "$J" -gt 0 ] && lulus "bilah atas ikut tema ($J tempat di style.css)" || gagal "bilah atas tidak ikut tema"
# gaya-lazy.css harus benar-benar menimpa nilainya untuk tema gelap.
grep -q -e "topbar" "$T/cg-gaya-lazy.css" && lulus "gaya-lazy.css menimpa warna bilah atas" || gagal "bilah atas tidak ikut tema"

echo
echo "=== 3. HALAMAN DI BALIK LOGIN ==="
curl -sS -k --max-time 25 -o "$T/cg-dash.html" -w "  dashboard.php HTTP %{http_code}\n" "$M/dashboard.php"
J=$(grep -c 'redirect\|Masuk\|login' "$T/cg-dash.html" | head -1)
# 302 -> halaman login. Itu normal: dashboard hanya untuk member yang masuk.
KODE=$(curl -sS -k --max-time 25 -o /dev/null -w "%{http_code}" "$M/dashboard.php")
[ "$KODE" = "302" ] && lulus "dashboard.php 302 (normal, di balik login)" || gagal "dashboard.php $KODE (harus 302)"

echo
echo "=== 4. APLIKASI LAIN TETAP SEHAT ==="
for P in index.php login.php redeem.php faq.php cari.php; do
  K=$(curl -sS -k --max-time 25 -o /dev/null -w "%{http_code}" "$M/$P")
  case "$K" in
    200) lulus "$P 200" ;;
    302) lulus "$P 302 (normal)" ;;
    *)   gagal "$P $K" ;;
  esac
done

echo
echo "=== 5. HALAMAN PERCOBAAN LAMA MASIH ADA ==="
for P in tampilan-baru.html tampilan-lazy.html; do
  K=$(curl -sS -k --max-time 25 -o /dev/null -w "%{http_code}" "$M/$P")
  [ "$K" = "200" ] && lulus "$P 200" || gagal "$P $K"
done

echo
echo "=== 6. LAPISAN LAMA TIDAK HILANG ==="
if grep -q "style.css?v=11" "$T/cg-dash.html" 2>/dev/null; then :; fi
K=$(curl -sS -k --max-time 25 -o "$T/cg-login.html" "$M/login.php")
for L in "style.css?v=11" "tw.css?v=2" "tampilan-v2.css?v=1" "gaya-lazy.css?v=1"; do
  grep -q "$L" "$T/cg-login.html" && lulus "urutan CSS memuat $L" || gagal "tidak memuat $L"
done

echo
echo "==================================================="
echo "LULUS: $((GAGAL==0 ? 1 : 0)) gagal → total gagal: $GAGAL"
echo "==================================================="
[ "$GAGAL" -eq 0 ]
