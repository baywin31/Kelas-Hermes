#!/usr/bin/env bash
# banding-live.sh — bandingkan SETIAP berkas produksi lokal dengan yang dilayani
# hosting, supaya pertanyaan "kenapa belum ada perubahan" dijawab dengan daftar
# berkas, bukan dugaan.
#
# Cara banding: ukuran + hash. Ukuran saja tidak cukup (dua berkas beda isi bisa
# sama besar), hash saja tidak informatif (tidak kelihatan mana yang lebih baru).
set -uo pipefail
cd "$(dirname "$0")"

BASE="https://juraganprompt.biz.id/member"
T="${LOCALAPPDATA}/Temp/kd-banding"; mkdir -p "$T"

# Berkas yang benar-benar dilayani ke pengunjung. Skrip uji, deploy, dan alat
# lokal tidak ikut karena memang tidak boleh ada di server.
BERKAS="
style.css tw.css app.js
index.php masuk.php keluar.php redeem.php lupa.php reset.php
dashboard.php materi.php cetak.php faq.php catatan.php profil.php
admin.php admin_materi.php admin_kode.php admin_member.php admin_setelan.php
_boot.php _theme.php _komponen.php _markdown.php _kode.php _mail.php
_seed.php _db.php _auth.php _csrf.php _ratelimit.php
"

printf "%-22s %9s %9s  %s\n" BERKAS LOKAL LIVE STATUS
printf "%-22s %9s %9s  %s\n" "----------------------" "--------" "--------" "------"

BEDA=0; HILANG=0; SAMA=0
for f in $BERKAS; do
  [ -f "$f" ] || continue
  LOK=$(wc -c < "$f" | tr -d ' ')

  # PHP tidak bisa diunduh isinya (dieksekusi di server), jadi hanya CSS/JS yang
  # bisa dibandingkan byte-per-byte. Untuk PHP kita cuma bisa cek dia ada.
  case "$f" in
    *.css|*.js)
      KODE=$(curl -sS -k --max-time 30 "$BASE/$f" -o "$T/$f" -w "%{http_code}" 2>/dev/null)
      if [ "$KODE" != "200" ]; then
        printf "%-22s %9s %9s  HILANG (http %s)\n" "$f" "$LOK" "-" "$KODE"; HILANG=$((HILANG+1)); continue
      fi
      SRV=$(wc -c < "$T/$f" | tr -d ' ')
      HL=$(sha1sum "$f" | cut -c1-8); HS=$(sha1sum "$T/$f" | cut -c1-8)
      if [ "$HL" = "$HS" ]; then
        printf "%-22s %9s %9s  sama\n" "$f" "$LOK" "$SRV"; SAMA=$((SAMA+1))
      else
        printf "%-22s %9s %9s  *** BEDA ***\n" "$f" "$LOK" "$SRV"; BEDA=$((BEDA+1))
      fi
      ;;
    *)
      KODE=$(curl -sS -k --max-time 30 "$BASE/$f" -o "$T/x.html" -w "%{http_code}" 2>/dev/null)
      case "$KODE" in
        200|302) printf "%-22s %9s %9s  ada (php, isi tak terbaca)\n" "$f" "$LOK" "-" ;;
        *)       printf "%-22s %9s %9s  HILANG (http %s)\n" "$f" "$LOK" "-" "$KODE"; HILANG=$((HILANG+1)) ;;
      esac
      ;;
  esac
done

echo
echo "aset beda: $BEDA   hilang: $HILANG   sama: $SAMA"
[ "$BEDA" -gt 0 ] && echo "-> berkas BEDA harus dideploy, dan versi ?v= di _theme.php harus dinaikkan."
exit 0
