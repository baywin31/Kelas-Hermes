#!/usr/bin/env bash
# banding-php.sh — bandingkan UKURAN berkas PHP di hosting dengan lokal lewat
# daftar FTP.
#
# Kenapa perlu: deploy2.sh tidak bisa memverifikasi berkas PHP lewat HTTPS
# (server mengeksekusinya, jadi yang terkirim bukan kodenya). Akibatnya PHP
# yang gagal naik bisa lolos tanpa terdeteksi — itu penyebab keluhan
# "gua belum lihat ada perubahan": berkasnya memang masih versi lama di server.
# Daftar FTP memberi ukuran byte berkas apa adanya, jadi bisa dibandingkan.
set -u
cd "$(dirname "$0")"
T=C:/Users/user/AppData/Local/Temp

FTP=$(tr -d '\r\n' < .ftp2)
H=juraganprompt.biz.id

curl -sS -k --ssl-reqd --max-time 60 -u "${FTP%%:*}:${FTP#*:}" \
  "ftp://$H/member/" -o "$T/bp-list.txt" || { echo "FTP gagal"; exit 1; }

BERKAS="${*:-}"
if [ -z "$BERKAS" ]; then
  BERKAS=$(ls -1 *.php | grep -vE '^_uji_|^_config' )
fi

sama=0; beda=0; hilang=0
printf '%-24s %10s %10s  %s\n' berkas lokal server status
for F in $BERKAS; do
  [ -f "$F" ] || continue
  LOKAL=$(wc -c < "$F" | tr -d ' ')
  # Format daftar FTP Unix: kolom ke-5 = ukuran, kolom terakhir = nama.
  SRV=$(awk -v f="$F" '$NF == f { print $5 }' "$T/bp-list.txt" | head -1)

  if [ -z "$SRV" ]; then
    printf '%-24s %10s %10s  %s\n' "$F" "$LOKAL" "-" "TIDAK ADA DI SERVER"
    hilang=$((hilang+1))
  elif [ "$SRV" = "$LOKAL" ]; then
    printf '%-24s %10s %10s  %s\n' "$F" "$LOKAL" "$SRV" "sama"
    sama=$((sama+1))
  else
    printf '%-24s %10s %10s  %s\n' "$F" "$LOKAL" "$SRV" "BEDA -> perlu deploy"
    beda=$((beda+1))
  fi
done

echo
echo "sama=$sama  beda=$beda  hilang=$hilang"
[ "$beda" -eq 0 ] && [ "$hilang" -eq 0 ] || exit 1
