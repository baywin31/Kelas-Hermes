#!/usr/bin/env bash
# deploy-tinymce.sh — naikkan folder tinymce/ (18 berkas, 1,3 MB) ke hosting.
#
# Kenapa skrip terpisah dari deploy2.sh: deploy2.sh hanya mengurus berkas di
# akar folder. TinyMCE punya subfolder (plugins/, skins/, themes/, models/,
# icons/, langs/) yang harus DIBUAT dulu di server — FTP tidak membuat folder
# otomatis, jadi tanpa --ftp-create-dirs semua unggahan gagal senyap dan
# editor visual jadi kotak putih tanpa pesan error.
#
# Setiap berkas diverifikasi lewat HTTPS: ukurannya di web harus sama dengan
# lokal. Unggahan FTP yang "sukses" tapi tidak terlayani pernah terjadi di
# hosting ini, jadi laporan FTP saja tidak dipercaya.
set -u
cd "$(dirname "$0")"
T=C:/Users/user/AppData/Local/Temp

FTP=$(tr -d '\r\n' < .ftp2)
H=juraganprompt.biz.id
TUJUAN=/member
C="curl -sS -k --ssl-reqd --max-time 120 --ftp-create-dirs -u ${FTP%%:*}:${FTP#*:}"

naik=0; gagal=0
echo "=== Naikkan tinymce/ ke https://$H$TUJUAN/ ==="

for F in $(find tinymce -type f | sort); do
  LOKAL=$(wc -c < "$F" | tr -d ' ')
  printf '   %-46s %8sb  ' "$F" "$LOKAL"

  if ! $C -T "$F" "ftp://$H$TUJUAN/$F" -o "$T/tm-up.txt" 2>"$T/tm-e.txt"; then
    echo "FTP GAGAL: $(head -1 "$T/tm-e.txt" | cut -c1-40)"
    gagal=$((gagal+1)); continue
  fi

  SIZE=$(curl -sS -k --max-time 40 -o "$T/tm-web.bin" -w "%{size_download}" \
    "https://$H$TUJUAN/$F?nocache=$(date +%s%N)" 2>/dev/null)
  if [ "$SIZE" = "$LOKAL" ]; then
    echo "OK"; naik=$((naik+1))
  else
    echo "BEDA web=$SIZE"; gagal=$((gagal+1))
  fi
done

echo
echo "naik=$naik gagal=$gagal"
[ "$gagal" -eq 0 ] || exit 1
