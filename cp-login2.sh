#!/usr/bin/env bash
# cp-login2.sh — coba login cPanel dengan kombinasi kredensial yang SUDAH diberi
# user, kalau-kalau password cPanel = password FTP.
# Cuma 1 percobaan supaya tidak kena proteksi brute-force (cPHulk).
set -u
cd "$(dirname "$0")"
W="C:/Users/user/AppData/Local/Temp/kd-cp"; mkdir -p "$W"
HOST="https://juraganprompt.biz.id:2083"
CU="$(cut -d: -f1 .cpanel | tr -d '\r\n')"
FP="$(cut -d: -f2- .ftp | tr -d '\r\n')"

CODE=$(curl -sSk -c "$W/c2.txt" -o "$W/l2.json" -w '%{http_code}' --max-time 45 \
  --data-urlencode "user=$CU" --data-urlencode "pass=$FP" \
  "$HOST/login/?login_only=1")
echo "cpanel-user + ftp-pass -> http=$CODE"
head -c 160 "$W/l2.json"; echo
