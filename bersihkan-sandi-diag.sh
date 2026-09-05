#!/usr/bin/env bash
# bersihkan-sandi-diag.sh — buang sandi FTP yang ditulis langsung di dalam
# skrip diagnosa lama (diag1/2/4/5/9.sh), ganti dengan membaca berkas .ftp.
#
# Kenapa lewat skrip, bukan alat sunting biasa: menyunting baris itu dengan alat
# yang butuh teks lama secara harfiah berarti menuliskan sandinya ke dalam
# riwayat percakapan. Di sini nilainya dibaca dari .ftp dan tidak pernah
# dicetak — yang tampil hanya nama berkas dan jumlah baris yang berubah.
set -uo pipefail
cd "$(dirname "$0")"

[ -f .ftp ] || { echo "Tidak ada .ftp — tidak ada yang perlu dicocokkan."; exit 0; }
SANDI=$(tr -d '\r\n' < .ftp | cut -d: -f2-)
[ ${#SANDI} -ge 6 ] || { echo "Nilai sandi di .ftp terlalu pendek, dibatalkan."; exit 1; }

UBAH=0
for f in diag1.sh diag2.sh diag4.sh diag5.sh diag9.sh; do
  [ -f "$f" ] || continue
  grep -q -F "$SANDI" "$f" || continue

  # Sandi diganti pembacaan dari berkas. Skrip tetap bisa jalan bagi siapa pun
  # yang punya .ftp, tapi tidak lagi MEMBAWA sandinya.
  sed -i "s|^U='[^']*'|U=\"\$(tr -d '\\\\r\\\\n' < .ftp)\"   # dibaca dari berkas, bukan ditulis di sini|" "$f"

  if grep -q -F "$SANDI" "$f"; then
    echo "GAGAL: $f masih memuat sandi (pola barisnya beda dari yang diduga)"
  else
    echo "bersih: $f"
    UBAH=$((UBAH+1))
  fi
done

echo "berkas dibersihkan: $UBAH"
