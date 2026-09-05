#!/usr/bin/env bash
# cek-siap-deploy.sh — tiga hal yang harus dipastikan sebelum deploy:
#   1. akun FTP nyampe ke docroot yang benar? (upload probe, ambil lewat HTTPS)
#   2. arsip bocor kemarin sudah dihapus?
#   3. /member/ masih kosong?
set -u
cd "$(dirname "$0")"
T="C:/Users/user/AppData/Local/Temp"
U="$(tr -d '\r\n' < .ftp)"
F() { curl -sS -k --ssl-reqd --ftp-pasv --ftp-create-dirs -u "$U" "$@"; }

echo "== 1. Uji tembus docroot"
printf 'PROBE-DEPLOY-%s\n' "$(date +%s)" > "$T/pd.txt"
F -T "$T/pd.txt" "ftp://juraganprompt.biz.id/public_html/" -o "$T/up.txt" \
  -w 'upload=%{http_code}\n' --max-time 60
curl -sSk -o "$T/pdw.txt" -w 'fetch=%{http_code} %{size_download}b\n' --max-time 25 \
  "https://juraganprompt.biz.id/pd.txt"
echo "isi terbaca: $(head -c 40 "$T/pdw.txt" | tr -d '\r\n')"

echo
echo "== 2. Arsip bocor masih ada?"
for f in karyawan-digital-php.rar karyawan-digital-php-upload.zip; do
  curl -sSkI --max-time 20 -o "$T/h.txt" "https://juraganprompt.biz.id/$f"
  echo "$f -> $(grep -m1 -iE '^HTTP' "$T/h.txt" | tr -d '\r')"
done

echo
echo "== 3. Folder /member/"
curl -sSk -o "$T/m.txt" -w 'member=%{http_code} %{size_download}b\n' --max-time 25 \
  "https://juraganprompt.biz.id/member/"
