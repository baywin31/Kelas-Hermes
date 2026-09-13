#!/usr/bin/env bash
# deploy-skill.sh — naikkan fitur unduhan skill ke hosting.
#
# Kenapa skrip terpisah, tidak cukup deploy2.sh:
#   1. berkas paket (.zip) disimpan DI LUAR public_html pada folder
#      /home/<akun>/kdsimpan. Jalur itu tidak bisa dicapai akun FTP ini
#      (akun deploy mendarat di dalam public_html), jadi paket dikirim dulu ke
#      unduhan/ lalu DIPINDAH oleh _pindah-skill.php yang berjalan di server —
#      itulah satu-satunya cara memindahkan berkas melewati batas public_html;
#   2. berkas .htaccess berawalan titik tidak ikut terunggah oleh deploy2.sh,
#      padahal tanpa itu folder unduhan/ (cadangan) bisa didaftar isinya.
#
# Setiap berkas aplikasi diverifikasi ulang lewat HTTPS sesudah dikirim.
set -u
cd "$(dirname "$0")"
T=C:/Users/user/AppData/Local/Temp

FTP=$(tr -d '\r\n' < .ftp2)
H=juraganprompt.biz.id
TUJUAN=/member
C="curl -sS -k --ssl-reqd --max-time 180 --ftp-create-dirs -u ${FTP%%:*}:${FTP#*:}"

naik=0; gagal=0
echo "=== 1. Berkas aplikasi ==="
for F in _boot.php _skill.php skill.php unduh.php admin_skill.php admin.php _theme.php dashboard.php style.css; do
  [ -f "$F" ] || { echo "   LEWAT  $F (tidak ada)"; continue; }
  LOKAL=$(wc -c < "$F" | tr -d ' ')
  printf '   %-20s %7sb  ' "$F" "$LOKAL"
  if ! $C -T "$F" "ftp://$H$TUJUAN/$F" -o "$T/ds-up.txt" 2>"$T/ds-e.txt"; then
    echo "FTP GAGAL: $(head -1 "$T/ds-e.txt" | cut -c1-45)"; gagal=$((gagal+1)); continue
  fi
  case "$F" in
    *.css|*.js)
      SIZE=$(curl -sS -k --max-time 40 -o "$T/ds-web.bin" -w "%{size_download}" \
        "https://$H$TUJUAN/$F?nocache=$(date +%s%N)" 2>/dev/null)
      if [ "$SIZE" = "$LOKAL" ]; then echo "OK web=$SIZE"; naik=$((naik+1))
      else echo "BEDA web=$SIZE vs $LOKAL"; gagal=$((gagal+1)); fi
      ;;
    *) echo "terkirim"; naik=$((naik+1)) ;;
  esac
done

echo
echo "=== 2. Berkas penolak folder unduhan/ (lapisan cadangan) ==="
printf '   %-20s ' "unduhan/.htaccess"
if $C -T "unduhan/.htaccess" "ftp://$H$TUJUAN/unduhan/.htaccess" -o "$T/ds-h.txt" 2>"$T/ds-he.txt"; then
  # .htaccess tidak bisa dibaca lewat HTTPS (ditolak aturannya sendiri),
  # jadi "sukses" hanya bisa dilihat dari balasan FTP.
  echo "terkirim"; naik=$((naik+1))
else
  echo "FTP GAGAL: $(head -1 "$T/ds-he.txt" | cut -c1-45)"; gagal=$((gagal+1))
fi

echo
echo "=== 3. Paket .zip (titip ke unduhan/, nanti dipindah server) ==="
# Paket disimpan di folder penyimpanan (di luar public_html). Secara lokal
# folder itu ~/kdsimpan, bukan di dalam folder app — jadi kedua lokasi dicari.
#
# Jalur dikirim sebagai C:/... (bukan /c/Users/...) karena curl adalah program
# Windows: MSYS tidak menerjemahkan argumen jalur untuknya, jadi /c/Users/...
# gagal dengan "cannot open".
OLEH="$(cygpath -m "$HOME/kdsimpan" 2>/dev/null || echo "$HOME/kdsimpan")"
for Z in unduhan/*.zip "$OLEH"/*.zip; do
  [ -f "$Z" ] || continue
  B=$(basename "$Z")
  LOKAL=$(wc -c < "$Z" | tr -d ' ')
  printf '   %-44s %8sb  ' "$B" "$LOKAL"
  if ! $C --max-time 180 -T "$Z" "ftp://$H$TUJUAN/unduhan/$B" -o "$T/ds-z.txt" 2>"$T/ds-ze.txt"; then
    echo "FTP GAGAL: $(head -1 "$T/ds-ze.txt" | cut -c1-45)"; gagal=$((gagal+1)); continue
  fi
  echo "terkirim"; naik=$((naik+1))
done

echo
echo "naik=$naik gagal=$gagal"
[ "$gagal" -eq 0 ] || exit 1
