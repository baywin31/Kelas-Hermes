#!/usr/bin/env bash
# siapkan-akun-uji.sh — pastikan akun uji ada SEBELUM uji yang butuh login.
#
# Kenapa: uji potret/keselarasan perlu masuk sebagai member. Akun uji dibuat oleh
# _uji_akun.php, tapi berkas itu hanya berjalan saat diminta. Kalau tidak
# dipanggil dulu, uji gagal dengan "login gagal: 401" — padahal halamannya sehat.
#
# Skrip ini memanggil _uji_akun.php, lalu MEMERIKSA bahwa akunnya benar-benar
# bisa dipakai (bukan cuma "berkasnya ada").
set -u
APP="$(cd "$(dirname "$0")" && pwd)"
PHP="C:/Users/user/tools/php83/php.exe"
INI="C:/Users/user/tools/php83/php.ini"
PORT="${1:-8813}"

if ! curl -s -o /dev/null -m 5 "http://127.0.0.1:$PORT/login.php"; then
  echo "server lokal belum jalan di port $PORT"
  exit 1
fi

KELUARAN=$(curl -s -m 20 "http://127.0.0.1:$PORT/_uji_akun.php")
if ! echo "$KELUARAN" | grep -q "verify: OK"; then
  echo "akun uji GAGAL dibuat:"
  echo "$KELUARAN" | head -5
  exit 1
fi

# Buktikan benar-benar bisa login (bukan cuma katanya).
JAR="$LOCALAPPDATA/Temp/jar-uji.txt"
rm -f "$JAR"
CSRF=$(curl -s -c "$JAR" -m 15 "http://127.0.0.1:$PORT/login.php" \
  | grep -oE 'name="csrf"[^>]*value="[^"]+"' | head -1 | sed 's/.*value="//;s/"//')
if [ -z "$CSRF" ]; then echo "token csrf tidak ketemu"; exit 1; fi

KODE=$(curl -s -b "$JAR" -c "$JAR" -m 20 -o /dev/null -w "%{http_code}" \
  -d "email=budi%40demo.id&password=demo12345&csrf=$CSRF" \
  "http://127.0.0.1:$PORT/login.php")

if [ "$KODE" = "302" ] && grep -q "kdsess" "$JAR" 2>/dev/null; then
  echo "akun uji siap (login member berhasil)"
  exit 0
fi

echo "akun uji ada tapi login gagal (HTTP $KODE)"
exit 1
