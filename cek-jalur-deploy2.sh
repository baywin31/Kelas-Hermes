#!/usr/bin/env bash
# cek-jalur-deploy2.sh — uji akun FTP baru (.ftp2) dengan uji penentu:
# upload berkas bertanda unik, lalu AMBIL LEWAT HTTPS. Listing/226 saja
# tidak dipercaya — akun lama pernah balas 226 padahal web 404.
set -u
cd "$(dirname "$0")"
T=C:/Users/user/AppData/Local/Temp

FTP=$(tr -d '\r\n' < .ftp2)
FUSER=${FTP%%:*}
FPASS=${FTP#*:}
H=juraganprompt.biz.id
C="curl -sS -k --ssl-reqd --max-time 40 -u $FUSER:$FPASS"

echo "=== 1. Akun baru mendarat di mana? ==="
if $C "ftp://$H/" -o "$T/d2-root.txt" 2>"$T/d2e1.txt"; then
  awk '{print "   "$NF}' "$T/d2-root.txt" | head -14
  if grep -qw "member" "$T/d2-root.txt"; then
    echo "   >>> 'member' LANGSUNG TERLIHAT di pangkal — akun ini di public_html"
  fi
else
  echo "   GAGAL login/listing:"; head -3 "$T/d2e1.txt" | sed 's/^/   /'
  exit 1
fi

echo
echo "=== 2. Isi folder member ==="
$C "ftp://$H/member/" -o "$T/d2-mem.txt" 2>"$T/d2e2.txt" \
  && awk '{print "   "$NF}' "$T/d2-mem.txt" | head -16 \
  || { echo "   GAGAL:"; head -2 "$T/d2e2.txt" | sed 's/^/   /'; }

echo
echo "=== 3. UJI PENENTU: upload bertanda -> ambil lewat HTTPS ==="
TANDA="kd-probe-$(date +%s)"
echo "$TANDA" > "$T/kd-probe.txt"
rm -f "$T/kd-jalur2.txt"

for TUJUAN in "/member" "/public_html/member"; do
  printf '   %-24s ' "$TUJUAN"
  if $C -T "$T/kd-probe.txt" "ftp://$H$TUJUAN/_kd_probe.txt" -o "$T/d2up.txt" 2>"$T/d2eu.txt"; then
    printf 'ftp=OK  '
  else
    echo "ftp=GAGAL ($(head -1 "$T/d2eu.txt" | cut -c1-58))"
    continue
  fi
  KODE=$(curl -sS -k --max-time 25 -o "$T/d2web.txt" -w "%{http_code}" \
    "https://$H/member/_kd_probe.txt" 2>/dev/null)
  if grep -q "$TANDA" "$T/d2web.txt" 2>/dev/null; then
    echo "web=$KODE TANDA COCOK  >>> JALUR JALAN <<<"
    echo "$TUJUAN" > "$T/kd-jalur2.txt"
    break
  else
    echo "web=$KODE tanda tidak muncul"
  fi
done

echo
echo "=== 4. Bersihkan probe ==="
if [ -f "$T/kd-jalur2.txt" ]; then
  J=$(cat "$T/kd-jalur2.txt")
  $C "ftp://$H/" -Q "-DELE $J/_kd_probe.txt" -o "$T/d2del.txt" 2>/dev/null \
    && echo "   dihapus $J/_kd_probe.txt" || echo "   gagal hapus (hapus manual nanti)"
  echo
  echo "HASIL: JALUR DEPLOY KEBUKA -> $J"
else
  echo "   tidak ada yang perlu dibersihkan"
  echo
  echo "HASIL: masih belum kebuka"
  exit 1
fi
