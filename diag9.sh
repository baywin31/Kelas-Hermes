#!/usr/bin/env bash
# diag9.sh — (a) bersihkan penanda uji, (b) uji FTP ke IP yang MENYAJIKAN domain.
set -u
T="${LOCALAPPDATA}/Temp/kddiag"; mkdir -p "$T"
U="$(tr -d '\r\n' < .ftp)"   # dibaca dari berkas, bukan ditulis di sini
LIVE=36.50.77.63
H='ftp://juraganprompt.biz.id'
F() { curl -sS -k --ssl-reqd --ftp-pasv --connect-timeout 20 --max-time 60 -u "$U" "$@"; }

echo "=== 1. Hapus penanda uji dari server FTP ==="
for p in /public_html/_probe.txt /public_html/akademi/_probe.txt \
         /public_html/akademi/_probe.php /public_html/karyawan/_probe.php; do
  c=$(F "$H$(dirname "$p")/" -Q "-DELE $p" -o /dev/null -w '%{http_code}' 2>/dev/null || echo ERR)
  printf '  %-42s %s\n' "$p" "$c"
done

echo
echo "=== 2. FTP langsung ke IP live (36.50.77.63) ==="
F "ftp://$LIVE/" -o "$T/live.txt" -w '  kode=%{http_code}\n' 2>"$T/le.txt"
head -2 "$T/le.txt" | sed 's/^/  err: /'
sed 's/^/    /' "$T/live.txt" 2>/dev/null | head -20

echo
echo "=== 3. Verifikasi penanda sudah hilang ==="
F "$H/public_html/" -o "$T/v.txt" -w '  kode=%{http_code}\n' 2>/dev/null
grep -c '_probe' "$T/v.txt" 2>/dev/null | sed 's/^/  sisa penanda di public_html: /'
F "$H/public_html/akademi/" -o "$T/v2.txt" -w '  kode=%{http_code}\n' 2>/dev/null
grep -c '_probe' "$T/v2.txt" 2>/dev/null | sed 's/^/  sisa penanda di akademi: /'
