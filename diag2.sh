#!/usr/bin/env bash
# diag2.sh — isi /public_html + cek docroot web.
set -u
T="${LOCALAPPDATA}/Temp/kddiag"; mkdir -p "$T"
U="$(tr -d '\r\n' < .ftp)"   # dibaca dari berkas, bukan ditulis di sini
H='ftp://juraganprompt.biz.id'
F() { curl -sS -k --ssl-reqd --ftp-pasv --connect-timeout 20 --max-time 60 -u "$U" "$@"; }
W() { curl -sS -k --max-time 25 "$@"; }

echo "=== isi /public_html ==="
F "$H/public_html/" -o "$T/ph.txt" -w '  kode=%{http_code}\n' 2>/dev/null
sed 's/^/  /' "$T/ph.txt"

echo
echo "=== uji tulis: taruh penanda di /public_html/_probe.txt ==="
echo "probe-ok-$(date +%s)" > "$T/probe.txt"
F -T "$T/probe.txt" "$H/public_html/_probe.txt" -o "$T/o.txt" -w '  upload=%{http_code}\n' 2>&1 | head -3

echo
echo "=== baca lewat web (apakah /public_html = docroot?) ==="
W -o "$T/probe_web.txt" -w '  https://juraganprompt.biz.id/_probe.txt -> kode=%{http_code} ukuran=%{size_download}\n' \
  "https://juraganprompt.biz.id/_probe.txt"
sed 's/^/  isi: /' "$T/probe_web.txt" | head -2
