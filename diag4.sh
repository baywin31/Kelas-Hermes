#!/usr/bin/env bash
# diag4.sh — uji pasti: apakah /public_html benar docroot? Pakai /akademi (yang jelas tersaji).
set -u
T="${LOCALAPPDATA}/Temp/kddiag"; mkdir -p "$T"
U="$(tr -d '\r\n' < .ftp)"   # dibaca dari berkas, bukan ditulis di sini
H='ftp://juraganprompt.biz.id'
B='https://juraganprompt.biz.id'
S="probe$(date +%s)"
F() { curl -sS -k --ssl-reqd --ftp-pasv --connect-timeout 20 --max-time 60 -u "$U" "$@"; }
W() { curl -sS -k --max-time 25 "$@"; }

printf '%s\n' "$S" > "$T/p.txt"
printf '<?php echo "PHPOK-%s";\n' "$S" > "$T/p.php"

echo "=== A. unggah penanda ke /public_html/akademi/ ==="
F -T "$T/p.txt" "$H/public_html/akademi/_probe.txt" -o "$T/o" -w '  txt upload=%{http_code}\n' 2>&1 | head -2
F -T "$T/p.php" "$H/public_html/akademi/_probe.php" -o "$T/o" -w '  php upload=%{http_code}\n' 2>&1 | head -2

echo
echo "=== B. baca lewat web ==="
for p in /akademi/_probe.txt /akademi/_probe.php; do
  printf '  %-22s ' "$p"
  W -o "$T/r" -w 'kode=%{http_code} ukuran=%{size_download} ' "$B$p"
  head -c 60 "$T/r" | tr -d '\r\n' | sed 's/^/isi=/'
  echo
done

echo
echo "=== C. unggah index.php ke /public_html/karyawan/ dan baca ==="
F -T "$T/p.php" "$H/public_html/karyawan/_probe.php" -o "$T/o" -w '  upload=%{http_code}\n' 2>&1 | head -2
printf '  %-22s ' "/karyawan/_probe.php"
W -o "$T/r2" -w 'kode=%{http_code} ukuran=%{size_download} ' "$B/karyawan/_probe.php"
head -c 60 "$T/r2" | tr -d '\r\n' | sed 's/^/isi=/'
echo

echo
echo "=== D. bandingkan akademi/login.php: FTP vs WEB ==="
F "$H/public_html/akademi/login.php" -o "$T/lf.php" -w '  ftp kode=%{http_code} ukuran=%{size_download}\n' 2>/dev/null
W -o "$T/lw.html" -w '  web kode=%{http_code} ukuran=%{size_download}\n' "$B/akademi/login.php"
echo "  md5 ftp: $(md5sum < "$T/lf.php" | cut -c1-32)"
echo "  md5 web: $(md5sum < "$T/lw.html" | cut -c1-32)"
