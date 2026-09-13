#!/usr/bin/env bash
# ringkas-lihat.sh — hitung isi tiap Bagian di halaman pratinjau live, supaya
# laporan ke pemilik berisi angka nyata, bukan "sudah live" saja.
set -u
cd "$(dirname "$0")"
T=C:/Users/user/AppData/Local/Temp
B=https://juraganprompt.biz.id/member
K=lihat-bd93f1a7

printf '%-9s %-6s %-9s %-8s %-8s %-8s %s\n' Bagian http byte kartu callout ceklis tabel
for b in 1 2 3 4; do
  C=$(curl -sS -k --max-time 30 -o "$T/lv$b.html" -w "%{http_code}" "$B/_lihat.php?k=$K&b=$b")
  SZ=$(wc -c < "$T/lv$b.html" | tr -d ' ')
  KA=$(grep -o 'kd-sec-isi'      "$T/lv$b.html" | wc -l | tr -d ' ')
  CO=$(grep -o 'kd-callout-isi'  "$T/lv$b.html" | wc -l | tr -d ' ')
  CE=$(grep -o 'kd-cek '         "$T/lv$b.html" | wc -l | tr -d ' ')
  TB=$(grep -o 'kd-tabel'        "$T/lv$b.html" | wc -l | tr -d ' ')
  printf '%-9s %-6s %-9s %-8s %-8s %-8s %s\n' "$b" "$C" "$SZ" "$KA" "$CO" "$CE" "$TB"
done
