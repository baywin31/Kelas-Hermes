#!/usr/bin/env bash
# diag7.sh — masuk cPanel via API (akun akunmu) untuk tahu DOCROOT sebenarnya.
set -u
T="${LOCALAPPDATA}/Temp/kddiag"; mkdir -p "$T"
C="$(tr -d '\r\n' < .cpanel)"           # akunmu:password
BASE='https://rho.id.rapidplex.com:2083'

A() { curl -sS -k --max-time 40 -u "$C" "$@"; }

echo "=== 1. uapi DomainInfo::list_domains ==="
A "$BASE/execute/DomainInfo/list_domains" -o "$T/d1.json" -w '  kode=%{http_code} ukuran=%{size_download}\n'
head -c 900 "$T/d1.json" | sed 's/^/  /'; echo

echo
echo "=== 2. uapi DomainInfo::domains_data ==="
A "$BASE/execute/DomainInfo/domains_data?format=hash" -o "$T/d2.json" -w '  kode=%{http_code} ukuran=%{size_download}\n'
grep -oE '"(documentroot|domain|servername|homedir|domain_type)":"[^"]*"' "$T/d2.json" 2>/dev/null | sort -u | head -40 | sed 's/^/  /'

echo
echo "=== 3. Fileman: isi homedir ==="
A "$BASE/execute/Fileman/list_files?dir=%2Fhome%2Fakunmu&types=dir" -o "$T/f1.json" -w '  kode=%{http_code}\n'
grep -oE '"(file|fullpath)":"[^"]*"' "$T/f1.json" 2>/dev/null | sort -u | head -40 | sed 's/^/  /'
