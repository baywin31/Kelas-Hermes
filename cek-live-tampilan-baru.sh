#!/usr/bin/env bash
# cek-live-tampilan-baru.sh — buktikan halaman percobaan gaya baru benar-benar
# terlayani di hosting, dan aplikasi aslinya tetap sehat.
#
# Kenapa dipisah jadi berkas: perintah panjang satu baris sering ditolak alat.
set -u
cd "$(dirname "$0")"
T="$LOCALAPPDATA/Temp"
H=juraganprompt.biz.id
M=https://$H/member

echo "=== 1. HALAMAN PERCOBAAN ==="
KODE=$(curl -sS -k --max-time 30 -o "$T/ctb.html" -w "%{http_code}" "$M/tampilan-baru.html?x=$(date +%s)")
UKURAN=$(wc -c < "$T/ctb.html" | tr -d ' ')
echo "   HTTP $KODE    ukuran $UKURAN b"
echo "   judul : $(grep -oE '<title>[^<]*' "$T/ctb.html" | sed 's/<title>//' | head -1)"

echo
echo "=== 2. WARNA DARI FILE FIGMA BENAR-BENAR TERPASANG ==="
for W in '#00B8F8' '#0E86C4' '#66666E' '#B00020' '#E8E8E8' '#1870B8'; do
  J=$(grep -o "$W" "$T/ctb.html" | wc -l | tr -d ' ')
  printf '   %-10s %s kali\n' "$W" "$J"
done

echo
echo "=== 3. BAGIAN HALAMAN ==="
for B in "batang-isi:grafik batang" "cincin-gambar:cincin progres" "rentetan:rentetan 7 hari" "akt-item:aktivitas" "lanjut:kartu lanjutkan" "angka-kartu:kartu angka" "materi-no:daftar materi" "tombol-tema:penukar tema"; do
  K="${B%%:*}"; N="${B#*:}"
  J=$(grep -o "$K" "$T/ctb.html" | wc -l | tr -d ' ')
  if [ "$J" -gt 0 ]; then printf '   ADA    %-18s (%s kali)\n' "$N" "$J"
  else printf '   HILANG %-18s\n' "$N"; fi
done

echo
echo "=== 4. CSS TERTANAM (bisa dibuka tanpa berkas lain) ==="
C=$(grep -c '<style>' "$T/ctb.html" | head -1)
L=$(grep -c '<link' "$T/ctb.html" | head -1)
echo "   blok <style> : $C"
echo "   <link> luar  : $L  (harus 0)"

echo
echo "=== 5. APLIKASI ASLI TETAP SEHAT (tidak tersentuh) ==="
for P in index.php login.php redeem.php dashboard.php materi.php skill.php; do
  K=$(curl -sS -k --max-time 25 -o /dev/null -w "%{http_code}" "$M/$P")
  printf '   %-15s %s\n' "$P" "$K"
done
echo "   (302 = normal, halaman di balik login)"
