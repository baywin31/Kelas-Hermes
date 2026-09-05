#!/usr/bin/env bash
# cek4.sh — hipotesis: ada DUA server berbeda (DomaiNesia vs RapidPlex).
# Konek FTP ke masing-masing IP dengan kredensial yang sama, bandingkan isinya.
set -u
T="${LOCALAPPDATA}/Temp/kdcek"; mkdir -p "$T"
U="$(tr -d '\r\n' < .ftp)"

echo "=== 1. nameserver domain ==="
nslookup -type=NS juraganprompt.biz.id 8.8.8.8 2>&1 | grep -iE 'nameserver|server =' | head -6

echo
echo "=== 2. FTP ke tiap IP: bandingkan isi /public_html ==="
for ip in 36.50.77.63 202.155.132.22; do
  echo "--- $ip ---"
  curl -sS -k --ssl-reqd --ftp-pasv --connect-timeout 20 --max-time 60 -u "$U" \
    "ftp://$ip/public_html/" -o "$T/ls_$ip.txt" -w '  kode=%{http_code}\n' 2>&1 | head -3
  awk 'NF>3 {print "  " $1 "  " $5 "  " $NF}' "$T/ls_$ip.txt" 2>/dev/null | head -12
done

echo
echo "=== 3. banner FTP tiap IP ==="
for ip in 36.50.77.63 202.155.132.22; do
  printf '  %-16s ' "$ip"
  curl -sS -k --ssl-reqd --ftp-pasv --connect-timeout 15 --max-time 30 -v -u "$U" \
    "ftp://$ip/" -o /dev/null 2>&1 | grep -iE '^< 220|^< 230' | head -2 | tr '\n' ' '
  echo
done

echo
echo "=== 4. penanda di IP DomaiNesia (36.50.77.63), lalu baca lewat web ==="
R="$(date +%s)"; M="m2-$R.txt"
printf 'M2-%s' "$R" > "$T/$M"
curl -sS -k --ssl-reqd --ftp-pasv --max-time 60 -u "$U" \
  -T "$T/$M" "ftp://36.50.77.63/public_html/$M" -o "$T/o.txt" -w '  unggah=%{http_code}\n'
sleep 2
printf '  baca web: %s\n' "$(curl -sS -k --max-time 20 -o "$T/w.txt" -w '%{http_code}/%{size_download}' "https://juraganprompt.biz.id/$M")"
curl -sS -k --ssl-reqd --ftp-pasv --max-time 40 -u "$U" \
  -Q "-DELE /public_html/$M" "ftp://36.50.77.63/public_html/" -o "$T/o.txt" -w '  hapus=%{http_code}\n'
