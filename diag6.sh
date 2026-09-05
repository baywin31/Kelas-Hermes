#!/usr/bin/env bash
# diag6.sh — cari URL yang MENYAJIKAN public_html di server rapidplex,
# dan pastikan siapa pemilik 404 page.
set -u
T="${LOCALAPPDATA}/Temp/kddiag"; mkdir -p "$T"
CP=202.155.132.22      # rho.id.rapidplex.com  (server FTP/cPanel kita)
DN=36.50.77.63         # tempat DNS juraganprompt.biz.id menunjuk sekarang

echo "=== 1. URL kandidat di server rapidplex ==="
try() { # $1=url  $2..=extra curl args
  local url="$1"; shift
  printf '  %-52s ' "$url"
  curl -sS -k --max-time 20 -o "$T/t.html" -w 'kode=%{http_code} ukuran=%{size_download}' "$@" "$url" 2>&1 | tail -1
  grep -qi 'probe' "$T/t.html" 2>/dev/null && printf '  <-- PENANDA KETEMU!'
  echo
}
try "https://rho.id.rapidplex.com/~akunmu/_probe.txt"
try "http://rho.id.rapidplex.com/~akunmu/_probe.txt"
try "https://juraganprompt.biz.id/_probe.txt" --resolve "juraganprompt.biz.id:443:$CP"
try "http://juraganprompt.biz.id/_probe.txt"  --resolve "juraganprompt.biz.id:80:$CP"
try "http://juraganprompt.biz.id/akademi/_probe.txt" --resolve "juraganprompt.biz.id:80:$CP"

echo
echo "=== 2. Siapa server di tiap IP? ==="
for ip in "$CP" "$DN"; do
  s=$(curl -sS -k --max-time 15 -D - -o /dev/null "http://$ip/" 2>/dev/null | grep -i '^server:' | tr -d '\r' | head -1)
  printf '  %-16s %s\n' "$ip" "${s:-(tidak jawab)}"
done

echo
echo "=== 3. Isi teks 404 dari masing-masing jalur (60 char) ==="
curl -sS -k --max-time 20 -o "$T/a.html" "https://juraganprompt.biz.id/_probe.txt" 2>/dev/null
sed -e 's/<[^>]*>/ /g' -e 's/  */ /g' "$T/a.html" | tr -d '\n' | cut -c1-140 | sed 's/^/  via-DNS : /'; echo
curl -sS -k --max-time 20 --resolve "juraganprompt.biz.id:443:$CP" -o "$T/b.html" "https://juraganprompt.biz.id/_probe.txt" 2>/dev/null
sed -e 's/<[^>]*>/ /g' -e 's/  */ /g' "$T/b.html" | tr -d '\n' | cut -c1-140 | sed 's/^/  via-cPanel: /'; echo
