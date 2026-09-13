#!/usr/bin/env bash
# hapus-bersih-uji.sh — cabut skrip pemeriksa/penghapus akun dari hosting.
#
# Kenapa wajib: _bersih-uji-live.php bisa MENGHAPUS akun member hanya dengan
# kunci yang tertulis di URL (dan menampilkan daftar email member). Kunci di
# URL bukan pengamanan. Verifikasi lewat HTTP, bukan cuma percaya balasan FTP.
set -u
cd "$(dirname "$0")"
T=C:/Users/user/AppData/Local/Temp

FTP=$(tr -d '\r\n' < .ftp2)
FU=${FTP%%:*}
FP=${FTP#*:}
H=juraganprompt.biz.id
TUJUAN=/member

DAFTAR="_bersih-uji-live.php"

echo "=== Cabut dari hosting ==="
for F in $DAFTAR; do
  printf '   %-26s ' "$F"
  if curl -sS -k --ssl-reqd --max-time 60 -u "$FU:$FP" \
       -Q "DELE $TUJUAN/$F" "ftp://$H/" -o "$T/hbu.txt" 2>"$T/hbu-e.txt"; then
    echo "dicabut"
  else
    echo "FTP: $(head -1 "$T/hbu-e.txt" | cut -c1-40)"
  fi
done

echo
echo "=== Verifikasi lewat HTTP (harus 404) ==="
gagal=0
for F in $DAFTAR; do
  KODE=$(curl -sS -k --max-time 30 -o /dev/null -w "%{http_code}" "https://$H$TUJUAN/$F")
  if [ "$KODE" = "404" ]; then
    echo "   $F → 404 (aman)"
  else
    echo "   $F → $KODE  ← MASIH ADA, cabut manual dari File Manager cPanel"; gagal=$((gagal+1))
  fi
done
[ "$gagal" -eq 0 ] || exit 1
