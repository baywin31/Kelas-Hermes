#!/usr/bin/env bash
# diag1.sh — pemetaan awal: koneksi FTP, isi chroot, dan lokasi docroot nyata.
set -u
T="${LOCALAPPDATA}/Temp/kddiag"; mkdir -p "$T"
U="$(tr -d '\r\n' < .ftp)"   # dibaca dari berkas, bukan ditulis di sini

F() { curl -sS -k --ssl-reqd --ftp-pasv --connect-timeout 20 --max-time 60 -u "$U" "$@"; }

echo "=== 1. Coba host FTP: juraganprompt.biz.id ==="
code=$(F "ftp://juraganprompt.biz.id/" -o "$T/ls_a.txt" -w '%{http_code}' 2>"$T/err_a.txt" || echo ERR)
echo "  kode=$code"
head -3 "$T/err_a.txt" | sed 's/^/  err: /'
sed 's/^/  /' "$T/ls_a.txt" | head -30

echo
echo "=== 2. Coba host FTP: rho.id.rapidplex.com ==="
code=$(F "ftp://rho.id.rapidplex.com/" -o "$T/ls_b.txt" -w '%{http_code}' 2>"$T/err_b.txt" || echo ERR)
echo "  kode=$code"
head -3 "$T/err_b.txt" | sed 's/^/  err: /'
sed 's/^/  /' "$T/ls_b.txt" | head -30

echo
echo "=== 3. Detail listing (LIST -l) di host yang jalan ==="
for H in ftp://juraganprompt.biz.id ftp://rho.id.rapidplex.com; do
  c=$(F "$H/" -o "$T/l.txt" -w '%{http_code}' -Q '-' 2>/dev/null || echo ERR)
  if [ "$c" = "226" ] || [ "$c" = "250" ] || [ "$c" = "200" ]; then
    echo "  HOST OK: $H"
    echo "$H" > "$T/host_ok.txt"
    break
  fi
done
cat "$T/host_ok.txt" 2>/dev/null | sed 's/^/  dipakai: /'

echo
echo "=== 4. Susuri kandidat direktori ==="
H="$(cat "$T/host_ok.txt" 2>/dev/null || echo ftp://juraganprompt.biz.id)"
for p in "" /public_html /public_html/member /public_html/akademi /www /htdocs \
         /home /juraganprompt.biz.id /public_html/juraganprompt.biz.id; do
  c=$(F "$H$p/" -o "$T/p.txt" -w '%{http_code}' 2>/dev/null || echo ERR)
  n=$(wc -l < "$T/p.txt" 2>/dev/null | tr -d ' ')
  printf '  %-42s kode=%-5s entri=%s\n' "${p:-/}" "$c" "$n"
done
