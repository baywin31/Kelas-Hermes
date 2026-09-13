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
         uji-wa.sh uji-warna.sh uji-ratelimit.sh uji-pasang.sh uji-tinymce.sh \
         uji-edit-langsung.sh uji-skill.sh uji-lampiran.sh uji-gembok-lampiran.sh cek-editor-lokal.sh cek-lihat.sh \
         uji-dashboard-lazy.sh; do
  printf "%-18s " "$s"
  if bash "$s" > "$T/r-$s.txt" 2>&1; then
    tail -1 "$T/r-$s.txt"
  else
    echo "GAGAL:"
    grep -E "^GAGAL|^BAD" "$T/r-$s.txt" | head -6
    GAGAL_TOTAL=$((GAGAL_TOTAL+1))
  fi
done

printf "%-18s " "uji-portable.sh"; bash uji-portable.sh 2>&1 | tail -1
printf "%-18s " "cek-kelas.js";    node cek-kelas.js 2>&1 | tail -1
printf "%-18s " "kontras-kartu.js"; node kontras-kartu.js 2>&1 | tail -1
# Uji editor butuh jsdom. NODE_PATH menunjuk ke node_modules app lain di mesin
# ini — tidak disalin ke folder app supaya paket uji tidak ikut ke hosting.
export NODE_PATH="${NODE_PATH:-C:\\Users\\user\\apps\\dompetku\\.test\\node_modules}"
printf "%-20s " "uji-blok.php"
C:/Users/user/tools/php83/php.exe -c C:/Users/user/tools/php83/php.ini uji-blok.php 2>&1 | tail -1
printf "%-20s " "uji-editor.js";     node uji-editor.js 2>&1 | tail -1
printf "%-20s " "uji-editor-dom.js"; node uji-editor-dom.js 2>&1 | tail -1
# Uji tampilan: menghitung gaya yang BENAR-BENAR dihitung browser atas halaman
# pratinjau (latar berlapis, tepi kartu, ruang, gerak, dan yang terpenting:
# ukuran huruf isi materi TIDAK berubah). Lewat sendiri kalau Chromium tidak ada.
printf "%-20s " "ukur-tampilan.js";  node ukur-tampilan.js 2>&1 | tail -1
# Audit tata letak: cari cacat yang bisa DIUKUR (luber mendatar, teks tertimpa,
# kontras rendah, gambar rusak, tombol kekecilan) di laptop dan layar HP,
# memakai HTML + CSS yang benar-benar dikirim. Lewat sendiri kalau Chrome tidak ada.
printf "%-20s " "audit-tata-letak.js"; node audit-tata-letak.js > "$T/r-audit.txt" 2>&1
tail -1 "$T/r-audit.txt"
# Audit tata letak ikut menentukan lulus/gagal: cacat tampilan yang lolos diam
# akan sampai ke pembeli tanpa ada yang tahu.
grep -q "^total cacat tata letak: 0" "$T/r-audit.txt" || GAGAL_TOTAL=$((GAGAL_TOTAL+1))

# Label grafik batang di dashboard: dengan 9 Bagian (jumlah nyata di hosting),
# tulisan "Bagian 1".."Bagian 9" saling menabrak di layar sempit. Uji ini
# menambah batang sampai 9 lalu mengukur tabrakannya.
printf "%-20s " "uji-label-batang.js"; NODE_PATH='C:\Users\user\apps\dompetku\.test\node_modules' \
  node uji-label-batang.js > "$T/r-lb.txt" 2>&1
tail -1 "$T/r-lb.txt"
grep -q "GAGAL: 0" "$T/r-lb.txt" || GAGAL_TOTAL=$((GAGAL_TOTAL+1))

# Kontras lapisan gaya baru: warna yang menimpa variabel lama bisa membuat
# huruf tak terbaca tanpa terlihat. Diperiksa di tema terang DAN gelap.
printf "%-20s " "kontras-lazy.js"; node kontras-lazy.js > "$T/r-kl.txt" 2>&1
tail -1 "$T/r-kl.txt"
grep -q "GAGAL: 0" "$T/r-kl.txt" || GAGAL_TOTAL=$((GAGAL_TOTAL+1))

# Warna yang ditulis LANGSUNG di berkas PHP (bukan lewat variabel) tidak ikut
# ditangani gaya-lazy.css. Dilaporkan supaya tidak ada yang lolos diam.
printf "%-20s " "tampal-warna.sh"; bash tampal-warna-theme.sh > "$T/r-tw.txt" 2>&1
J=$(grep -A100 "DI BERKAS PHP" "$T/r-tw.txt" | grep -oE '^--- [^ ]+' | wc -l | tr -d ' ')
echo "$J berkas PHP masih memakai warna langsung"

echo
echo "berkas uji yang gagal: $GAGAL_TOTAL"
# Rangkaian ini membuktikan DUA hal sekaligus: fitur masih jalan, DAN polesan
# tampilan tidak merusak apa pun. Kode keluar dipakai supaya kegagalan apa pun
# bisa ditangkap skrip lain — "cetak 0 gagal tapi keluar 0" itu menyesatkan.
[ "$GAGAL_TOTAL" -eq 0 ] || exit 1
