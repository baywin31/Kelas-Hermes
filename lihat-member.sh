#!/usr/bin/env bash
# lihat-member.sh — login sebagai demo user lalu tampilkan isi halaman member/admin
# supaya bisa diverifikasi tanpa browser.
# Pakai: bash lihat-member.sh <email> <password> <path1> [path2 ...]
set -u
BASE="http://127.0.0.1:8813"
W="C:/Users/user/AppData/Local/Temp/kd-sesi"
mkdir -p "$W"
J="$W/jar.txt"; rm -f "$J"
EMAIL="$1"; PW="$2"; shift 2

# Ambil token CSRF dari halaman login, lalu login (tanpa -X POST + -L).
curl -sS --max-time 25 -c "$J" -o "$W/login.html" "$BASE/login.php"
TOK=$(grep -oE 'name="csrf" value="[a-f0-9]+"' "$W/login.html" | head -1 | grep -oE '[a-f0-9]{32}')
curl -sS --max-time 25 -b "$J" -c "$J" -L -o "$W/after.html" "$BASE/login.php" \
  --data-urlencode "csrf=$TOK" \
  --data-urlencode "email=$EMAIL" \
  --data-urlencode "password=$PW"

if grep -qi "salah\|gagal" "$W/after.html" && ! grep -qi "Halo," "$W/after.html"; then
  echo "LOGIN GAGAL untuk $EMAIL"; exit 1
fi
echo "LOGIN OK: $EMAIL"

for p in "$@"; do
  F="$W/p.html"
  code=$(curl -sS --max-time 25 -b "$J" -c "$J" -L -o "$F" -w '%{http_code}' "$BASE/$p")
  echo
  echo "== /$p (HTTP $code)"
  grep -oE '<h[123][^>]*>[^<]+' "$F" | sed 's/<[^>]*>//g' | head -10
  grep -oE 'class="btn[^"]*"[^>]*>[^<]+' "$F" | sed 's/^[^>]*>//' | head -8
done
