#!/usr/bin/env bash
# hapus-setvid.sh — cabut _setvid.php dari server.
# Skrip itu bisa mengubah isi materi tanpa login, jadi tidak boleh menginap
# walau sudah dikunci ?k=. Dipisah dari deploy2.sh supaya tidak pernah
# terhapus tidak sengaja saat deploy biasa.
set -u
cd "$(dirname "$0")" || exit 1
# .ftp2 formatnya satu baris "user:password" (sama seperti hapus-setwa.sh),
# bukan berkas berisi variabel — jangan di-source.
T=C:/Users/user/AppData/Local/Temp
FTP=$(tr -d '\r\n' < .ftp2)
FTP_USER=${FTP%%:*}; FTP_PASS=${FTP#*:}
HOST=juraganprompt.biz.id
BASE=https://$HOST/member

echo "=== Hapus _setvid.php dari /member ==="
curl -sS -k --max-time 40 --ftp-ssl -u "$FTP_USER:$FTP_PASS" \
  -Q "-DELE /member/_setvid.php" "ftp://$HOST/member/" -o "$T/hs-vid.txt" 2>&1 \
  && echo "   perintah DELE terkirim" || echo "   DELE dilaporkan gagal (cek di bawah)"

echo
echo "=== Bukti dari web, bukan dari balasan FTP ==="
CODE=$(curl -sS -k --max-time 30 -o "$T/hs-cek.html" -w "%{http_code}" "$BASE/_setvid.php?k=setvid2026")
if [ "$CODE" = "404" ]; then
  echo "   _setvid.php -> 404  AMAN (sudah tidak ada)"
else
  echo "   _setvid.php -> $CODE  MASIH ADA — hapus manual dari File Manager!"
fi

echo
echo "=== Video harus tetap ada (tersimpan di database, bukan di skrip) ==="
LOG=$(curl -sS -k --max-time 30 -o "$T/hs-login.html" -w "%{http_code}" "$BASE/login.php")
echo "   login.php -> $LOG"
