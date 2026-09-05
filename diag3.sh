#!/usr/bin/env bash
# diag3.sh — kenapa file di /public_html tidak tersaji: DNS, server, dan bukti /akademi.
set -u
T="${LOCALAPPDATA}/Temp/kddiag"; mkdir -p "$T"
W() { curl -sS -k --max-time 25 "$@"; }

echo "=== 1. DNS ==="
for h in juraganprompt.biz.id www.juraganprompt.biz.id rho.id.rapidplex.com; do
  ip=$(nslookup "$h" 8.8.8.8 2>/dev/null | awk '/^Address/{a=$2} END{print a}')
  printf '  %-34s %s\n' "$h" "${ip:-tidak ada}"
done

echo
echo "=== 2. Header root domain ==="
W -D "$T/hroot.txt" -o "$T/root.html" -w '  kode=%{http_code} ukuran=%{size_download}\n' "https://juraganprompt.biz.id/"
grep -iE '^(server|x-powered|location|content-type|cf-|x-cache)' "$T/hroot.txt" | sed 's/^/    /' | head -10

echo
echo "=== 3. Apakah /akademi/ tersaji lewat web? ==="
for p in /akademi/ /akademi/login.php /karyawan/ /_probe.txt; do
  W -D "$T/h.txt" -o "$T/x.html" -w "  %-24s kode=%{http_code} ukuran=%{size_download}\n" "https://juraganprompt.biz.id$p" 2>/dev/null
  printf '  %-24s ' "$p"
  W -o "$T/x.html" -w 'kode=%{http_code} ukuran=%{size_download}' "https://juraganprompt.biz.id$p"
  loc=$(W -D - -o /dev/null "https://juraganprompt.biz.id$p" 2>/dev/null | grep -i '^location:' | tr -d '\r' | head -1)
  echo "  $loc"
done

echo
echo "=== 4. Judul halaman 404 (biar tau ini server siapa) ==="
grep -oE '<title>[^<]*|Server: [^<]*|nginx|LiteSpeed|Apache|rapidplex|cPanel' "$T/root.html" 2>/dev/null | sort -u | head -8 | sed 's/^/  /'

echo
echo "=== 5. Coba lewat IP hosting langsung (Host header) ==="
IP=$(nslookup rho.id.rapidplex.com 8.8.8.8 2>/dev/null | awk '/^Address/{a=$2} END{print a}')
echo "  IP rho: ${IP:-?}"
if [ -n "${IP:-}" ]; then
  W --resolve "juraganprompt.biz.id:443:$IP" -o "$T/viaip.html" \
    -w '  via-IP kode=%{http_code} ukuran=%{size_download}\n' "https://juraganprompt.biz.id/_probe.txt"
  head -c 120 "$T/viaip.html" | sed 's/^/    /'
fi
