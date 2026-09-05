#!/usr/bin/env bash
# cek-wa-semua-halaman.sh — pastikan tombol WA muncul di setiap halaman live,
# termasuk yang butuh login (dashboard, materi, tanya) lewat sesi sungguhan.
set -u
cd "$(dirname "$0")"
T=C:/Users/user/AppData/Local/Temp
B=https://juraganprompt.biz.id/member
N=$(date +%s)

echo "=== Halaman publik ==="
for P in index.php login.php redeem.php faq.php lupa.php; do
  F="$T/wsp-$P.html"
  curl -sS -k --max-time 25 -o "$F" "$B/$P?n=$N" 2>/dev/null
  APUNG=$(grep -c 'class="wa-apung"' "$F" 2>/dev/null || echo 0)
  FOOT=$(grep -c 'Chat WhatsApp' "$F" 2>/dev/null || echo 0)
  NOMOR=$(grep -oE 'wa\.me/[0-9]+' "$F" 2>/dev/null | head -1)
  printf '   %-12s apung=%s footer=%s %s\n' "$P" "$APUNG" "$FOOT" "$NOMOR"
done

echo
echo "=== Nomor yang aktif ==="
grep -oE 'wa\.me/[0-9]+\?text=[^"]{0,90}' "$T/wsp-login.php.html" | head -1 | sed 's/^/   /'
