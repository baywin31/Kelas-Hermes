#!/usr/bin/env bash
# diag-kerangka.sh — apa isi respons yang gagal itu?
set -uo pipefail
T="$LOCALAPPDATA/Temp/kd-diag2"

echo "=== ukuran tiap respons ==="
for f in p1 p2 p3 p4; do printf "%-4s " "$f"; wc -c < "$T/$f.html" 2>/dev/null || echo "-"; done

echo
echo "=== 300 karakter pertama p3.html (yang gagal) ==="
head -c 300 "$T/p3.html" 2>/dev/null
echo

echo
echo "=== ada pesan CSRF / 403? ==="
grep -oiE "csrf|kedaluwarsa|403|forbidden|halaman ini khusus" "$T/p3.html" 2>/dev/null | sort -u | head -5
