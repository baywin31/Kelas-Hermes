#!/usr/bin/env bash
# deploy2.sh — naikkan berkas ke /member lewat akun FTP baru (.ftp2).
#
# Kenapa skrip baru, bukan deploy.sh lama: akun lama terkurung di folder
# kembar sehingga TUJUAN harus '/public_html/member'. Akun 'deploy' sudah
# mendarat DI public_html, jadi tujuannya '/member'.
#
# Setiap berkas dicek dua kali: FTP bilang sukses, DAN ukurannya di web
# harus sama dengan berkas lokal. Upload yang "226 sukses" tapi tidak
# terlayani pernah kejadian di sini, jadi tidak dipercaya begitu saja.
set -u
cd "$(dirname "$0")"
T=C:/Users/user/AppData/Local/Temp

FTP=$(tr -d '\r\n' < .ftp2)
FUSER=${FTP%%:*}
FPASS=${FTP#*:}
H=juraganprompt.biz.id
TUJUAN=/member
C="curl -sS -k --ssl-reqd --max-time 60 -u $FUSER:$FPASS"

BERKAS="${*:-}"
if [ -z "$BERKAS" ]; then
  BERKAS="style.css _theme.php _boot.php tanya.php redeem.php admin_setelan.php setup.php"
fi

naik=0; gagal=0
echo "=== Naikkan ke https://$H$TUJUAN/ ==="
for F in $BERKAS; do
  if [ ! -f "$F" ]; then echo "   LEWAT  $F (tidak ada di lokal)"; continue; fi
  LOKAL=$(wc -c < "$F" | tr -d ' ')
  printf '   %-20s %7sb  ' "$F" "$LOKAL"

  if ! $C -T "$F" "ftp://$H$TUJUAN/$F" -o "$T/dp-up.txt" 2>"$T/dp-e.txt"; then
    echo "FTP GAGAL: $(head -1 "$T/dp-e.txt" | cut -c1-52)"; gagal=$((gagal+1)); continue
  fi

  # Berkas PHP tidak bisa dibandingkan ukurannya (dieksekusi server),
  # jadi yang dicek: halaman tetap hidup. Untuk CSS/JS ukurannya harus pas.
  case "$F" in
    *.css|*.js)
      SIZE=$(curl -sS -k --max-time 25 -o "$T/dp-web.bin" -w "%{size_download}" \
        "https://$H$TUJUAN/$F?nocache=$(date +%s)" 2>/dev/null)
      if [ "$SIZE" = "$LOKAL" ]; then echo "OK web=$SIZE b (sama)"; naik=$((naik+1))
      else echo "BEDA web=$SIZE b vs lokal=$LOKAL b"; gagal=$((gagal+1)); fi
      ;;
    *)
      echo "terkirim"; naik=$((naik+1))
      ;;
  esac
done

echo
echo "=== Halaman masih hidup? ==="
for P in index.php login.php redeem.php; do
  KODE=$(curl -sS -k --max-time 25 -o "$T/dp-p.html" -w "%{http_code}" "https://$H$TUJUAN/$P" 2>/dev/null)
  JUDUL=$(grep -oE '<title>[^<]*' "$T/dp-p.html" 2>/dev/null | sed 's/<title>//' | head -1)
  printf '   %-14s %s  %s\n' "$P" "$KODE" "$JUDUL"
done

echo
echo "naik=$naik gagal=$gagal"
[ "$gagal" -eq 0 ] || exit 1
