#!/usr/bin/env bash
# cek-ftp-lagi.sh — apakah FTP sekarang sudah melihat docroot yang benar?
# Kalau folder 'member' muncul di listing, berarti akun FTP sudah dibetulkan
# dan gue bisa deploy/patch sendiri tanpa File Manager.
set -u
cd "$(dirname "$0")"
T="C:/Users/user/AppData/Local/Temp"
U="$(tr -d '\r\n' < .ftp)"
F() { curl -sS -k --ssl-reqd --ftp-pasv -u "$U" "$@"; }

echo "== listing /public_html"
F "ftp://juraganprompt.biz.id/public_html/" -o "$T/pl.txt" -w 'list=%{http_code}\n' --max-time 45
awk '{print $NF}' "$T/pl.txt" 2>/dev/null | tr -d '\r' | head -14
echo
echo "member ada di listing? $(grep -c 'member' "$T/pl.txt" 2>/dev/null)"
