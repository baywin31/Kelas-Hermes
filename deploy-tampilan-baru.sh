#!/usr/bin/env bash
# deploy-tampilan-baru.sh — naikkan HALAMAN PERCOBAAN gaya baru ke /member,
# supaya bisa dilihat langsung dari website/HP.
#
# Kenapa berkas terpisah, bukan langsung mengganti dashboard.php: pemilik belum
# memilih tema (terang seperti referensi Figma, atau gelap seperti aplikasi
# sekarang). Halaman percobaan ini memuat data contoh, jadi aman dinaikkan
# lebih dulu — aplikasi aslinya sama sekali tidak tersentuh.
#
# Sumbernya berkas MANDIRI (CSS sudah tertanam), jadi cukup satu berkas.
set -u
cd "$(dirname "$0")"
T=C:/Users/user/AppData/Local/Temp

SUMBER=pratinjau/dashboard-baru.html
NAMA=tampilan-baru.html

if [ ! -f "$SUMBER" ]; then
  echo "Tidak ada $SUMBER — jalankan dulu: node siap-pratinjau-baru.js"
  exit 1
fi

FTP=$(tr -d '\r\n' < .ftp2)
FUSER=${FTP%%:*}
FPASS=${FTP#*:}
H=juraganprompt.biz.id
TUJUAN=/member

LOKAL=$(wc -c < "$SUMBER" | tr -d ' ')
echo "=== Naikkan halaman percobaan ==="
echo "   sumber : $SUMBER ($LOKAL b)"
echo "   tujuan : https://$H$TUJUAN/$NAMA"

if ! curl -sS -k --ssl-reqd --max-time 90 -u "$FUSER:$FPASS" \
     -T "$SUMBER" "ftp://$H$TUJUAN/$NAMA" -o "$T/tb-up.txt" 2>"$T/tb-e.txt"; then
  echo "   FTP GAGAL: $(head -1 "$T/tb-e.txt" | cut -c1-70)"
  exit 1
fi

echo "   terkirim, memeriksa dari luar..."

KODE=$(curl -sS -k --max-time 30 -o "$T/tb-web.html" -w "%{http_code}" \
  "https://$H$TUJUAN/$NAMA?nocache=$(date +%s)" 2>/dev/null)
WEB=$(wc -c < "$T/tb-web.html" | tr -d ' ')
PENANDA=$(grep -c "Karyawan" "$T/tb-web.html" 2>/dev/null | head -1)
PENANDA=${PENANDA:-0}

echo "   HTTP $KODE   web=$WEB b   lokal=$LOKAL b   penanda=$PENANDA"

[ "$KODE" = "200" ] || { echo "   GAGAL: halaman tidak terlayani"; exit 1; }
[ "$PENANDA" -gt 0 ] || { echo "   GAGAL: isi tidak cocok"; exit 1; }
[ "$WEB" -gt 5000 ] || { echo "   GAGAL: berkas terpotong"; exit 1; }

echo
echo "LIVE: https://$H$TUJUAN/$NAMA"
