#!/usr/bin/env bash
# cek1.sh — cek ulang apakah /public_html benar-benar bukan docroot,
# atau sebenarnya cuma efek cache DomaiNesia.
set -u
T="${LOCALAPPDATA}/Temp"
U="$(tr -d '\r\n' < .ftp)"
H="ftp://juraganprompt.biz.id"
F() { curl -sS -k --ssl-reqd --ftp-pasv -u "$U" "$@"; }
W() { curl -sS -k --max-time 25 "$@"; }
R=$RANDOM$RANDOM

echo "=== 1. root dengan cache-buster (?v=$R) ==="
W -D "$T/h1.txt" -o "$T/root_bust.html" -w 'kode=%{http_code} ukuran=%{size_download}\n' \
  "https://juraganprompt.biz.id/?v=$R"
grep -iE '^(x-|age:|cache-control|server|content-length)' "$T/h1.txt" | head -12

echo
echo "=== 2. root tanpa query ==="
W -o "$T/root_plain.html" -w 'kode=%{http_code} ukuran=%{size_download}\n' \
  "https://juraganprompt.biz.id/"

echo
echo "=== 3. bandingkan dengan index.html yang SUDAH DIHAPUS (dari backup) ==="
B="/c/Users/user/backup-hosting/juraganprompt-public_html-20260901-212106/index.html"
for f in "$T/root_bust.html" "$T/root_plain.html" "$B"; do
  printf '%s  %s\n' "$(md5sum < "$f" | cut -c1-32)" "$(basename "$f")"
done

echo
echo "=== 4. akademi/login.php: versi FTP vs versi ONLINE ==="
F "$H/public_html/akademi/login.php" -o "$T/ak_ftp.php" -w 'ftp=%{http_code} ukuran=%{size_download}\n'
W -o "$T/ak_web.html" -w 'web=%{http_code} ukuran=%{size_download}\n' \
  "https://juraganprompt.biz.id/akademi/login.php"
echo "--- 6 baris awal versi FTP ---"; head -6 "$T/ak_ftp.php"
echo "--- 6 baris awal versi ONLINE ---"; head -6 "$T/ak_web.html"

echo
echo "=== 5. cari folder lain di dalam chroot FTP ==="
F "$H/" -o "$T/ls_root.txt" -w 'list_root=%{http_code}\n'
cat "$T/ls_root.txt"
echo "--- coba path docroot alternatif ---"
for p in /juraganprompt.biz.id /www /domains /home /public_html/juraganprompt.biz.id; do
  c=$(F "$H$p/" -o "$T/ls_x.txt" -w '%{http_code}' 2>/dev/null || echo ERR)
  printf '  %-38s %s  %s\n' "$p" "$c" "$(tr '\n' ' ' < "$T/ls_x.txt" | cut -c1-70)"
done
