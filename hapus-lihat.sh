#!/usr/bin/env bash
# hapus-lihat.sh — cabut halaman pratinjau _lihat.php dari hosting.
#
# Kenapa skrip terpisah: halaman itu membuka satu Bagian materi berbayar ke
# siapa pun yang tahu kuncinya. Selama masih ada di server, itu kebocoran
# produk. Jalankan ini begitu pemilik selesai melihat.
set -u
cd "$(dirname "$0")"
T=C:/Users/user/AppData/Local/Temp

FTP=$(tr -d '\r\n' < .ftp2)
H=juraganprompt.biz.id
C="curl -sS -k --ssl-reqd --max-time 60 -u ${FTP%%:*}:${FTP#*:}"

$C "ftp://$H/member/" -Q "-DELE /member/_lihat.php" -o "$T/hl.txt" >/dev/null 2>&1

KODE=$(curl -sS -k --max-time 25 -o /dev/null -w "%{http_code}" \
  "https://$H/member/_lihat.php?k=lihat-bd93f1a7")

if [ "$KODE" = "404" ]; then
  echo "AMAN: _lihat.php sudah tidak ada di hosting (404)."
else
  echo "MASIH ADA: http=$KODE — hapus manual lewat File Manager cPanel."
  exit 1
fi
