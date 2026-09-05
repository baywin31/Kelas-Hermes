#!/usr/bin/env bash
# diag8.sh — uji penentu: login FTP sebagai user cPanel utama (akunmu)
# supaya terlihat SELURUH home dir, bukan cuma chroot public_html.
set -u
T="${LOCALAPPDATA}/Temp/kddiag"; mkdir -p "$T"
CP="$(tr -d '\r\n' < .cpanel)"          # isi berkas: akun:sandi (tidak ditulis di sini)

G() { curl -sS -k --ssl-reqd --ftp-pasv --connect-timeout 20 --max-time 60 "$@"; }

echo "=== 1. FTP sebagai akunmu @ rho.id.rapidplex.com ==="
G -u "$CP" "ftp://rho.id.rapidplex.com/" -o "$T/m1.txt" -w '  kode=%{http_code}\n' 2>"$T/e1.txt"
head -2 "$T/e1.txt" | sed 's/^/  err: /'
sed 's/^/    /' "$T/m1.txt" | head -40

echo
echo "=== 2. FTP sebagai akunmu @ juraganprompt.biz.id ==="
G -u "$CP" "ftp://juraganprompt.biz.id/" -o "$T/m2.txt" -w '  kode=%{http_code}\n' 2>"$T/e2.txt"
head -2 "$T/e2.txt" | sed 's/^/  err: /'
sed 's/^/    /' "$T/m2.txt" | head -40

echo
echo "=== 3. Login cPanel resmi (POST /login) ==="
curl -sS -k --max-time 40 -c "$T/cj.txt" \
  -d "user=$(cut -d: -f1 <<<"$CP")" \
  --data-urlencode "pass=$(cut -d: -f2- <<<"$CP")" \
  -d "login_theme=jupiter" \
  "https://rho.id.rapidplex.com:2083/login/?login_only=1" \
  -o "$T/login.json" -w '  kode=%{http_code}\n' 2>&1 | tail -2
head -c 400 "$T/login.json" | sed 's/^/  /'; echo
