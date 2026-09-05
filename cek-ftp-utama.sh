#!/usr/bin/env bash
# cek-ftp-utama.sh — coba FTP pakai akun cPanel UTAMA (akunmu), bukan sub-akun
# admin@ yang terkurung. Akun utama biasanya melihat /home/<user> apa adanya,
# termasuk public_html yang benar-benar disajikan Apache.
set -u
cd "$(dirname "$0")"
T="C:/Users/user/AppData/Local/Temp"
CU="$(cut -d: -f1 .cpanel | tr -d '\r\n')"
CP="$(cut -d: -f2- .cpanel | tr -d '\r\n')"

echo "== login FTP sebagai $CU"
curl -sS -k --ssl-reqd --ftp-pasv -u "$CU:$CP" "ftp://juraganprompt.biz.id/" \
  -o "$T/u_root.txt" -w 'list-root=%{http_code}\n' --max-time 60
echo "--- isi home:"
cat "$T/u_root.txt" 2>/dev/null | head -20
