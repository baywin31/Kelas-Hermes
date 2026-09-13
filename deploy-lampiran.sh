#!/usr/bin/env bash
# deploy-lampiran.sh — naikkan fitur lampiran per Bagian ke hosting.
#
# Kenapa skrip terpisah, tidak cukup deploy2.sh:
#   1. berkas lampiran disimpan DI LUAR public_html (/home/<akun>/kdsimpan/lampiran).
#      FTP tidak bisa membuat folder → folder itu dibuat lewat PHP sekali-pakai.
#   2. tabel `lampiran` perlu dibuat di database hosting.
#   3. perlu dites dari luar (bukan dipercaya dari laporan FTP): apakah berkas
#      lampiran benar-benar TIDAK bisa diambil langsung tanpa login.
set -u
cd "$(dirname "$0")"

php_file() { # php_file <berkas.php> <kunci> <label>
  printf "%-24s " "$3"
  curl -sS -k --max-time 120 "https://juraganprompt.biz.id/member/$1?k=$2" 2>&1 | tail -4
}

echo "=== 1. Naikkan berkas aplikasi ==="
bash deploy2.sh _lampiran.php unduh-lampiran.php admin_materi.php materi.php \
  _boot.php setup.php _siap-lampiran.php 2>&1 | grep -E "terkirim|naik|gagal" | head -10

echo
echo "=== 2. Siapkan tabel + folder lampiran di hosting ==="
php_file "_siap-lampiran.php" "siap-lampiran-7f31bd" "siapkan"

echo
echo "=== 3. Cabut berkas sekali-pakai ==="
bash hapus-siap-lampiran.sh 2>&1 | tail -6

echo
echo "Selesai. Buka: https://juraganprompt.biz.id/member/admin_materi.php?b=1"
echo "  → gulir ke bawah, ada kartu '📎 Lampiran Bagian 1' untuk menempel berkas .md"
