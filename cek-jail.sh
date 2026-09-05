#!/usr/bin/env bash
# cek-jail.sh — akun FTP admin@ terkurung (chroot) atau tidak?
set -u
cd "$(dirname "$0")"
T="C:/Users/user/AppData/Local/Temp"
U="$(tr -d '\r\n' < .ftp)"
F() { curl -sS -k --ssl-reqd --ftp-pasv -u "$U" "$@"; }

echo "== A. absolut /home/akunmu/"
F "ftp://juraganprompt.biz.id/%2Fhome/akunmu/" -o "$T/jA.txt" -w 'A=%{http_code}\n' --max-time 45
head -5 "$T/jA.txt" 2>/dev/null

echo "== B. relatif ../../"
F "ftp://juraganprompt.biz.id/../../" -o "$T/jB.txt" -w 'B=%{http_code}\n' --max-time 45
head -5 "$T/jB.txt" 2>/dev/null

echo "== C. absolut docroot"
F "ftp://juraganprompt.biz.id/%2Fhome/akunmu/public_html/" -o "$T/jC.txt" -w 'C=%{http_code}\n' --max-time 45
grep -icE "generator_prompt|admin-kb" "$T/jC.txt" 2>/dev/null
