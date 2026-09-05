#!/usr/bin/env bash
# cek-jalur-deploy.sh — tentukan sekali untuk selamanya: apakah akun FTP ini
# bisa menulis ke folder yang BENAR-BENAR dilayani web?
#
# Cara: upload berkas bertanda unik, lalu ambil lewat HTTPS. Kalau tandanya
# muncul di web, jalur deploy kebuka. Listing folder saja tidak cukup —
# dulu FTP membalas 226 (sukses) padahal berkasnya tidak pernah dilayani.
set -u
cd "$(dirname "$0")"
T=C:/Users/user/AppData/Local/Temp

FTP=$(cat .ftp)
FUSER=${FTP%%:*}
FPASS=${FTP#*:}
H=juraganprompt.biz.id
C="curl -sS -k --ssl-reqd --max-time 40 -u $FUSER:$FPASS"

TANDA="kd-probe-$(date +%s)"
echo "$TANDA" > "$T/kd-probe.txt"
NAMA="_kd_probe.txt"

echo "=== 1. Di mana akun FTP ini mendarat? ==="
$C "ftp://$H/" -o "$T/ls-root.txt" 2>"$T/e1.txt" \
  && echo "isi folder pangkal:" && awk '{print "   "$NF}' "$T/ls-root.txt" | head -12 \
  || { echo "   GAGAL listing pangkal:"; head -2 "$T/e1.txt" | sed 's/^/   /'; }

echo
echo "=== 2. Apakah /public_html sekarang punya folder 'member'? ==="
if $C "ftp://$H/public_html/" -o "$T/ls-ph.txt" 2>"$T/e2.txt"; then
  awk '{print "   "$NF}' "$T/ls-ph.txt" | head -20
  if grep -qw "member" "$T/ls-ph.txt"; then
    echo "   >>> 'member' TERLIHAT — pertanda bagus"
  else
    echo "   >>> 'member' TIDAK ADA — ini kemungkinan folder kembar"
  fi
else
  echo "   GAGAL:"; head -2 "$T/e2.txt" | sed 's/^/   /'
fi

echo
echo "=== 3. Isi /public_html/member lewat FTP ==="
$C "ftp://$H/public_html/member/" -o "$T/ls-mem.txt" 2>"$T/e3.txt" \
  && awk '{print "   "$NF}' "$T/ls-mem.txt" | head -14 \
  || { echo "   GAGAL:"; head -2 "$T/e3.txt" | sed 's/^/   /'; }

echo
echo "=== 4. UJI PENENTU: upload bertanda lalu ambil lewat web ==="
for TUJUAN in "/public_html/member" "/member"; do
  printf '%-26s ' "upload ke $TUJUAN"
  if $C -T "$T/kd-probe.txt" "ftp://$H$TUJUAN/$NAMA" -o "$T/up.txt" 2>"$T/eu.txt"; then
    echo -n "ftp=OK  "
  else
    echo "ftp=GAGAL ($(head -1 "$T/eu.txt" | cut -c1-60))"
    continue
  fi
  KODE=$(curl -sS -k --max-time 25 -o "$T/web.txt" -w "%{http_code}" \
    "https://$H/member/$NAMA" 2>/dev/null)
  if grep -q "$TANDA" "$T/web.txt" 2>/dev/null; then
    echo "web=$KODE TANDA COCOK  >>> JALUR INI JALAN <<<"
    echo "$TUJUAN" > "$T/kd-jalur-benar.txt"
  else
    echo "web=$KODE tanda tidak muncul (bukan folder yang dilayani)"
  fi
done

echo
echo "=== 5. Bersihkan berkas probe ==="
for TUJUAN in "/public_html/member" "/member"; do
  $C "ftp://$H/" -Q "-DELE $TUJUAN/$NAMA" -o "$T/del.txt" 2>/dev/null \
    && echo "   dihapus: $TUJUAN/$NAMA" || echo "   tidak ada/gagal hapus: $TUJUAN/$NAMA"
done

echo
if [ -f "$T/kd-jalur-benar.txt" ]; then
  echo "HASIL: jalur deploy KEBUKA -> $(cat "$T/kd-jalur-benar.txt")"
else
  echo "HASIL: belum ada jalur FTP yang benar-benar dilayani web"
fi
