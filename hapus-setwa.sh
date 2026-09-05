#!/usr/bin/env bash
# hapus-setwa.sh — cabut _setwa.php dari server setelah nomor terisi.
# Skrip itu bisa mengubah setelan tanpa login, jadi tidak boleh menginap.
set -u
cd "$(dirname "$0")"
T=C:/Users/user/AppData/Local/Temp
FTP=$(tr -d '\r\n' < .ftp2)
FUSER=${FTP%%:*}; FPASS=${FTP#*:}
H=juraganprompt.biz.id
B=https://$H/member

echo "=== Hapus _setwa.php ==="
curl -sS -k --ssl-reqd --max-time 40 -u "$FUSER:$FPASS" "ftp://$H/" \
  -Q "-DELE /member/_setwa.php" -o "$T/hw-del.txt" 2>"$T/hw-err.txt" \
  && echo "   DELE terkirim" || { echo "   GAGAL: $(head -1 "$T/hw-err.txt")"; exit 1; }

echo
echo "=== Verifikasi lewat web ==="
K=$(curl -sS -k --max-time 25 -o "$T/hw-x.txt" -w "%{http_code}" \
  "$B/_setwa.php?k=setwa2026&n=081111111111" 2>/dev/null)
echo "   _setwa.php -> $K"
[ "$K" = "404" ] && echo "   OK  hilang, setelan tidak bisa diubah dari luar" \
  || { echo "   MASIH ADA — bahaya"; exit 1; }

echo
echo "=== Nomor tetap tersimpan setelah skrip dihapus? ==="
curl -sS -k --max-time 25 -o "$T/hw-login.html" "$B/login.php?n=$(date +%s)" 2>/dev/null
NOMOR=$(grep -oE 'wa\.me/[0-9]+' "$T/hw-login.html" | head -1)
echo "   tombol di login.php: ${NOMOR:-<tidak ada>}"
[ -n "$NOMOR" ] && echo "   OK  nomor aman di database" || echo "   BAD nomor hilang"
