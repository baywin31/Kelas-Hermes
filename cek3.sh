#!/usr/bin/env bash
# cek3.sh — cari tahu DI MANA folder FTP /public_html itu tersaji.
# Uploads satu penanda unik, lalu coba baca lewat berbagai IP + Host header.
set -u
T="${LOCALAPPDATA}/Temp/kdcek"; mkdir -p "$T"
U="$(tr -d '\r\n' < .ftp)"
H="ftp://juraganprompt.biz.id"
F() { curl -sS -k --ssl-reqd --ftp-pasv -u "$U" "$@"; }
R="$(date +%s)"
M="mark-$R.txt"

echo "=== 1. unggah penanda $M ke /public_html/ ==="
printf 'MARK-%s' "$R" > "$T/$M"
F -T "$T/$M" "$H/public_html/$M" -o "$T/o.txt" -w 'unggah=%{http_code}\n'

echo
echo "=== 2. coba baca penanda + karyawan/index.html di semua kombinasi ==="
IPS="36.50.77.63 202.155.132.22"
HOSTS="juraganprompt.biz.id www.juraganprompt.biz.id"
for ip in $IPS; do
  for h in $HOSTS; do
    for proto in https http; do
      for path in "/$M" "/karyawan/index.html"; do
        c=$(curl -sS -k --max-time 15 --resolve "$h:443:$ip" --resolve "$h:80:$ip" \
             -o "$T/r.html" -w '%{http_code}/%{size_download}' "$proto://$h$path" 2>/dev/null || echo ERR)
        printf '  %-16s %-28s %-6s %-24s %s\n' "$ip" "$h" "$proto" "$path" "$c"
      done
    done
  done
done

echo
echo "=== 3. lewat hostname server (tanpa domain) ==="
for base in "https://rho.id.rapidplex.com/~akunmu" "http://rho.id.rapidplex.com/~akunmu" \
            "http://36.50.77.63/~akunmu" "http://202.155.132.22/~akunmu"; do
  c=$(curl -sS -k --max-time 15 -o "$T/r.html" -w '%{http_code}/%{size_download}' "$base/$M" 2>/dev/null || echo ERR)
  printf '  %-46s %s\n' "$base/$M" "$c"
done

echo
echo "=== 4. isi halaman 404 itu apa (kasih tahu server mana yang jawab) ==="
curl -sS -k --max-time 20 -D "$T/h404.txt" -o "$T/b404.html" "https://juraganprompt.biz.id/$M"
grep -iE '^(HTTP/|server|x-|content-type|location)' "$T/h404.txt" | head -10
echo "--- 12 baris awal body ---"
head -12 "$T/b404.html"

echo
echo "=== 5. header halaman yang TERSAJI (root + akademi) ==="
for p in "/" "/akademi/login.php"; do
  echo "--- $p ---"
  curl -sS -k --max-time 20 -D - -o /dev/null "https://juraganprompt.biz.id$p" 2>/dev/null \
    | grep -iE '^(HTTP/|server|last-modified|x-|content-type|location)' | head -8
done

echo
echo "=== 6. bersihkan penanda ==="
F -Q "-DELE /public_html/$M" "$H/public_html/" -o "$T/o.txt" -w 'hapus=%{http_code}\n'
