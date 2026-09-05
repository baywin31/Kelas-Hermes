#!/usr/bin/env bash
# diag5.sh — dua pertanyaan penentu:
#   1) apakah _probe yang tadi diunggah BENAR ada di server (lihat via FTP)
#   2) apakah domain juraganprompt.biz.id menunjuk ke server cPanel yang sama
set -u
T="${LOCALAPPDATA}/Temp/kddiag"; mkdir -p "$T"
U="$(tr -d '\r\n' < .ftp)"   # dibaca dari berkas, bukan ditulis di sini
H='ftp://juraganprompt.biz.id'
F() { curl -sS -k --ssl-reqd --ftp-pasv --connect-timeout 20 --max-time 60 -u "$U" "$@"; }

ipv4() {
  nslookup -type=A "$1" 8.8.8.8 2>/dev/null \
    | sed -n '/Name:/,$p' \
    | grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' | head -3 | tr '\n' ' '
}

echo "=== 1. Apakah _probe benar mendarat? (listing FTP) ==="
F "$H/public_html/" -o "$T/l1.txt" -w '  /public_html kode=%{http_code}\n' 2>/dev/null
grep -iE '_probe|akademi|karyawan' "$T/l1.txt" | sed 's/^/    /'
F "$H/public_html/akademi/" -o "$T/l2.txt" -w '  /public_html/akademi kode=%{http_code}\n' 2>/dev/null
grep -icE '.' "$T/l2.txt" | sed 's/^/    total entri: /'
grep -iE '_probe|login\.php|index\.php' "$T/l2.txt" | sed 's/^/    /'

echo
echo "=== 2. Alamat IPv4 (A record) ==="
for h in juraganprompt.biz.id www.juraganprompt.biz.id rho.id.rapidplex.com; do
  printf '  %-32s %s\n' "$h" "$(ipv4 "$h")"
done

echo
echo "=== 3. Ambil _probe.txt LANGSUNG dari server cPanel (Host header dipaksa) ==="
CP=$(ipv4 rho.id.rapidplex.com | awk '{print $1}')
echo "  IP cPanel: ${CP:-tidak ketemu}"
if [ -n "${CP:-}" ]; then
  curl -sS -k --max-time 25 --resolve "juraganprompt.biz.id:443:$CP" \
    -o "$T/viaip.html" -w '  via-cPanel-IP kode=%{http_code} ukuran=%{size_download}\n' \
    "https://juraganprompt.biz.id/_probe.txt" 2>&1 | head -3
  head -c 100 "$T/viaip.html" 2>/dev/null | tr -d '\r\n' | sed 's/^/    isi: /'; echo
fi

echo
echo "=== 4. Server yang menyajikan domain sekarang ==="
curl -sS -k --max-time 20 -D "$T/h.txt" -o /dev/null "https://juraganprompt.biz.id/akademi/login.php" 2>/dev/null
grep -iE '^(server|x-powered-by|set-cookie)' "$T/h.txt" | cut -c1-90 | sed 's/^/  /'
