#!/usr/bin/env bash
# hapus-setup.sh — hapus setup.php dari server setelah instalasi selesai.
# Dipisah dari deploy2.sh supaya tidak pernah terhapus tidak sengaja saat
# deploy biasa. Verifikasi: HTTPS harus balas 404, bukan cuma FTP bilang OK.
set -u
cd "$(dirname "$0")"
T=C:/Users/user/AppData/Local/Temp
FTP=$(tr -d '\r\n' < .ftp2)
FUSER=${FTP%%:*}; FPASS=${FTP#*:}
H=juraganprompt.biz.id
B=https://$H/member

echo "=== Cek dulu: instalasi memang sudah selesai? ==="
curl -sS -k --max-time 25 -o "$T/hs-setup.html" "$B/setup.php" 2>/dev/null
if grep -qi "sudah ada\|sudah pernah" "$T/hs-setup.html"; then
  echo "   OK  setup.php bilang instalasi sudah selesai — aman dihapus"
else
  echo "   STOP setup.php belum menyatakan selesai. Isi ringkas:"
  grep -oE '<h1>[^<]*|<p>[^<]{0,80}' "$T/hs-setup.html" | head -4 | sed 's/^/        /'
  echo "   Admin pertama belum dibuat. Batal — buat admin dulu."
  exit 1
fi

echo
echo "=== Hapus lewat FTP ==="
if curl -sS -k --ssl-reqd --max-time 40 -u "$FUSER:$FPASS" "ftp://$H/" \
     -Q "-DELE /member/setup.php" -o "$T/hs-del.txt" 2>"$T/hs-err.txt"; then
  echo "   perintah DELE terkirim"
else
  echo "   GAGAL: $(head -1 "$T/hs-err.txt")"; exit 1
fi

echo
echo "=== Verifikasi lewat web (yang menentukan) ==="
K=$(curl -sS -k --max-time 25 -o "$T/hs-x.txt" -w "%{http_code}" "$B/setup.php" 2>/dev/null)
echo "   setup.php -> $K"
[ "$K" = "404" ] && echo "   OK  benar-benar hilang" || { echo "   MASIH ADA"; exit 1; }

echo
echo "=== Pastikan app tetap jalan ==="
for P in index.php login.php redeem.php; do
  KK=$(curl -sS -k --max-time 25 -o "$T/hs-p.html" -w "%{http_code}" "$B/$P" 2>/dev/null)
  printf '   %-12s %s\n' "$P" "$KK"
done
