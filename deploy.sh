#!/usr/bin/env bash
# deploy.sh — unggah app ke hosting via FTPS.
#
# Pakai:
#   bash deploy.sh                       # unggah ke $TUJUAN default
#   TUJUAN=/public_html/member bash deploy.sh
#
# Kredensial dibaca dari file .ftp (satu baris: user:password) supaya tidak
# tertulis di dalam skrip. Buat file itu dulu:
#   printf 'admin@domainmu.com:PASSWORD' > .ftp
set -eu

HOST="${HOST:-ftp://juraganprompt.biz.id}"
TUJUAN="${TUJUAN:-/public_html/member}"
CRED_FILE="${CRED_FILE:-.ftp}"

[ -s "$CRED_FILE" ] || { echo "File $CRED_FILE belum ada (isi: user:password)"; exit 1; }
U="$(tr -d '\r\n' < "$CRED_FILE")"

# -k: sertifikat FTPS hosting ini tidak cocok dengan nama domainnya
# (SEC_E_WRONG_PRINCIPAL). Kanal tetap dienkripsi karena --ssl-reqd.
# -o ke file, BUKAN /dev/null: curl native Windows gagal menulis /dev/null
# (error 23) dan menutup koneksi sebelum perintah -Q terkirim.
OUT="${LOCALAPPDATA:-/tmp}/Temp/kd_deploy_out.txt"
F() { curl -sS -k --ssl-reqd --ftp-pasv --ftp-create-dirs -u "$U" "$@"; }

# Berkas yang diunggah. File uji dan konfigurasi lokal sengaja dikecualikan.
FILES="
_boot.php _kode.php _markdown.php _progress.php _seed.php _theme.php
index.php redeem.php login.php logout.php lupa.php reset.php
dashboard.php materi.php catatan_simpan.php cetak.php cari.php faq.php
tanya.php profil.php
admin.php admin_kode.php admin_kode_csv.php admin_materi.php admin_setelan.php
setup.php style.css app.js
"

echo "Tujuan: $HOST$TUJUAN"
GAGAL=0
for f in $FILES; do
  [ -f "$f" ] || { echo "  LEWAT (tidak ada): $f"; continue; }
  code=$(F -T "$f" "$HOST$TUJUAN/$f" -o "$OUT" -w '%{http_code}' 2>"$OUT.err" || echo ERR)
  case "$code" in
    226|250) printf '  OK   %s\n' "$f" ;;
    *)       printf '  GAGAL %s (kode=%s) %s\n' "$f" "$code" "$(head -1 "$OUT.err" 2>/dev/null)"
             GAGAL=$((GAGAL+1)) ;;
  esac
done

# _config.php diunggah dari _config.prod.php agar setelan lokal tidak ikut.
if [ -f _config.prod.php ]; then
  code=$(F -T _config.prod.php "$HOST$TUJUAN/_config.php" -o "$OUT" -w '%{http_code}' 2>"$OUT.err" || echo ERR)
  case "$code" in
    226|250) echo "  OK   _config.php (dari _config.prod.php)" ;;
    *)       echo "  GAGAL _config.php (kode=$code)"; GAGAL=$((GAGAL+1)) ;;
  esac
fi

echo
if [ "$GAGAL" -eq 0 ]; then
  echo "Semua berkas terunggah."
else
  echo "$GAGAL berkas gagal."
fi

echo
echo "Verifikasi lewat FTP (daftar isi tujuan):"
F "$HOST$TUJUAN/" -o "$OUT" -w '' 2>/dev/null || true
awk '{print "  " $NF}' "$OUT" 2>/dev/null | head -40

echo
echo "Langkah berikutnya:"
echo "  1. Buka https://<domain>/member/setup.php di browser, isi form admin pertama."
echo "  2. Setelah muncul 'Instalasi selesai', HAPUS setup.php dari server."
echo "  3. Masuk sebagai admin, buka Setelan, isi link Telegram."
[ "$GAGAL" -eq 0 ]
