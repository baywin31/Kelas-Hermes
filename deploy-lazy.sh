#!/usr/bin/env bash
# deploy-lazy.sh — naikkan versi ponytail ke hosting, lalu buktikan dari luar.
#
# Kenapa berkas terpisah: perintah panjang satu baris sering ditolak alat.
set -u
cd "$(dirname "$0")"
T="$LOCALAPPDATA/Temp"
H=juraganprompt.biz.id
M=https://$H/member
NAMA=tampilan-lazy.html

FTP=$(tr -d '\r\n' < .ftp2)
FU=${FTP%%:*}
FP=${FTP#*:}

LOKAL=$(wc -c < dashboard-lazy.html | tr -d ' ')
echo "=== Naikkan versi ponytail ==="
echo "   $NAMA ($LOKAL b)"
curl -sS -k --ssl-reqd --max-time 90 -u "$FU:$FP" \
  -T dashboard-lazy.html "ftp://$H/member/$NAMA" -o "$T/lz-up.txt" 2>"$T/lz-e.txt" \
  || { echo "   FTP GAGAL: $(head -1 "$T/lz-e.txt" | cut -c1-60)"; exit 1; }

echo "   terkirim, memeriksa dari luar..."
KODE=$(curl -sS -k --max-time 30 -o "$T/lz.html" -w "%{http_code}" "$M/$NAMA?x=$(date +%s)")
WEB=$(wc -c < "$T/lz.html" | tr -d ' ')

echo "   HTTP $KODE   web=$WEB b   lokal=$LOKAL b"
echo "   conic-gradient : $(grep -c 'conic-gradient' "$T/lz.html")"
echo "   blok <script>  : $(grep -c '<script' "$T/lz.html")  (harus 0)"
echo "   prefers-color  : $(grep -c 'prefers-color-scheme' "$T/lz.html")"
echo "   warna Figma    : $(grep -o '#00B8F8' "$T/lz.html" | wc -l | tr -d ' ') kali"

[ "$KODE" = "200" ] || { echo "   GAGAL: tidak terlayani"; exit 1; }
[ "$WEB" = "$LOKAL" ] || { echo "   GAGAL: ukuran tidak sama"; exit 1; }
echo
echo "LIVE: $M/$NAMA"
