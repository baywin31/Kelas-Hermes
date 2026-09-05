#!/usr/bin/env bash
# jalan-uji.sh — jalankan seluruh rangkaian uji mode PHP dan cetak ringkasannya.
# Berkas terpisah supaya tidak ada perintah panjang yang perlu ditempel inline.
set -uo pipefail
cd "$(dirname "$0")" || exit 1
T="$LOCALAPPDATA/Temp"

curl -sS -o "$T/x.txt" --max-time 20 "http://127.0.0.1:8813/_uji_ratereset.php" >/dev/null 2>&1
curl -sS -o "$T/x.txt" --max-time 20 "http://127.0.0.1:8813/_uji_akun.php" >/dev/null 2>&1

GAGAL_TOTAL=0
for s in uji-isi.sh uji-kartu.sh uji-kerangka.sh uji-video.sh uji-gambar.sh \
         uji-wa.sh uji-warna.sh uji-ratelimit.sh uji-pasang.sh; do
  printf "%-18s " "$s"
  if bash "$s" > "$T/r-$s.txt" 2>&1; then
    tail -1 "$T/r-$s.txt"
  else
    echo "GAGAL:"
    grep -E "^GAGAL" "$T/r-$s.txt" | head -6
    GAGAL_TOTAL=$((GAGAL_TOTAL+1))
  fi
done

printf "%-18s " "uji-portable.sh"; bash uji-portable.sh 2>&1 | tail -1
printf "%-18s " "cek-kelas.js";    node cek-kelas.js 2>&1 | tail -1
printf "%-18s " "kontras-kartu.js"; node kontras-kartu.js 2>&1 | tail -1

echo
echo "berkas uji yang gagal: $GAGAL_TOTAL"
