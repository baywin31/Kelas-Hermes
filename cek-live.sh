#!/usr/bin/env bash
# cek-live.sh — periksa app yang sudah diunggah user ke hosting.
set -u
T="C:/Users/user/AppData/Local/Temp/kd-live"; mkdir -p "$T"
B="https://juraganprompt.biz.id/member"

echo "== halaman utama app"
for p in "" "index.php" "setup.php" "login.php" "redeem.php" "dashboard.php" "admin.php"; do
  c=$(curl -sSk -o "$T/p.html" -w '%{http_code} %{size_download}b' --max-time 30 "$B/$p")
  t=$(grep -oiE '<title>[^<]*' "$T/p.html" 2>/dev/null | head -1 | cut -c8-55)
  echo "/$p -> $c | $t"
done

echo
echo "== arsip bocor sudah dihapus?"
for f in karyawan-digital-php.rar karyawan-digital-php-upload.zip; do
  c=$(curl -sSkI -o "$T/h.txt" -w '%{http_code}' --max-time 25 "https://juraganprompt.biz.id/$f")
  echo "$f -> $c"
done

echo
echo "== sisa berkas yang harus hilang"
for f in _config.contoh.php _uji_demo.php member.zip; do
  c=$(curl -sSk -o "$T/x.txt" -w '%{http_code}' --max-time 25 "$B/$f")
  echo "$f -> $c"
done
