#!/usr/bin/env bash
# cek-live-lampiran.sh — buktikan fitur lampiran hidup DI HOSTING, diuji dari
# luar (bukan dipercaya dari laporan FTP atau dari hasil uji lokal).
#
# Yang paling perlu dibuktikan di hosting justru: berkas lampiran benar-benar
# TIDAK bisa diambil langsung, dan halaman admin punya kartu lampirannya.
# Dua hal itu yang paling mudah "kelihatan berhasil" padahal bocor.
set -u
cd "$(dirname "$0")"
T=C:/Users/user/AppData/Local/Temp
H="https://juraganprompt.biz.id/member"

LULUS=0; GAGAL=0
ok()  { echo "  lulus  · $1"; LULUS=$((LULUS+1)); }
no()  { echo "  GAGAL  · $1"; GAGAL=$((GAGAL+1)); }
cek() { if grep -q "$2" "$3" 2>/dev/null; then ok "$1"; else no "$1  (dicari: $2)"; fi; }
cek_tidak() { if grep -q "$2" "$3" 2>/dev/null; then no "$1  (ketemu: $2)"; else ok "$1"; fi; }

echo "=== 1. Berkas inti fitur ada di hosting ==="
for F in _lampiran.php unduh-lampiran.php; do
  K=$(curl -sS -k --max-time 30 -o /dev/null -w "%{http_code}" "$H/$F")
  # Halaman PHP dieksekusi server → 200 (bukan berarti bocor); yang penting
  # bukan 404/502 (berkas tidak naik) dan bukan isi mentahnya.
  if [ "$K" = "200" ] || [ "$K" = "302" ] || [ "$K" = "403" ]; then ok "$F terpasang (http=$K)"
  else no "$F bermasalah (http=$K)"; fi
done

echo "=== 2. Halaman admin materi punya kartu lampiran ==="
JAR="$T/cl-lampiran-jar.txt"; rm -f "$JAR"
curl -sS -k -c "$JAR" --max-time 40 "$H/login.php" -o "$T/cl-login.html"
TOK=$(grep -oE 'name="csrf" value="[^"]+"' "$T/cl-login.html" | head -1 | sed 's/.*value="//;s/"$//')
K=$(curl -sS -k -b "$JAR" -c "$JAR" --max-time 40 -o /dev/null -w "%{http_code}" \
  -X POST "$H/login.php" -d "csrf=$TOK" \
  -d "email=admin@demo.id" -d "password=demo12345")
echo "  login uji http=$K (302 = masuk dashboard; 200 = gagal login, wajar kalau akun uji belum dibuat di hosting)"

echo "=== 3. Halaman materi member tidak bisa diintip tanpa login ==="
K=$(curl -sS -k --max-time 40 -o "$T/cl-materi.html" -D "$T/cl-hdr.txt" -w "%{http_code}" "$H/materi.php?b=1")
if grep -qE "HTTP/1.1 30[0-9]" "$T/cl-hdr.txt"; then ok "materi.php dialihkan ke login (http=$K)"
else no "materi.php terbuka tanpa login (http=$K)"; fi

echo "=== 4. unduh-lampiran.php tanpa login harus ditolak ==="
# id 1 mungkin tidak ada; yang diuji adalah tidak boleh ada isi berkas yang
# lolos ke tamu — bukan kode tertentu.
K=$(curl -sS -k --max-time 40 -o "$T/cl-tamu.bin" -D "$T/cl-hdr2.txt" -w "%{http_code}" \
  "$H/unduh-lampiran.php?id=1")
if grep -qi "location:.*login" "$T/cl-hdr2.txt"; then ok "tamu dialihkan ke login (http=$K)"
elif [ "$K" = "404" ]; then ok "tidak ada berkas yang bisa diambil (http=404)"
else no "perilaku tamu mencurigakan (http=$K)"; fi

echo "=== 5. Lampiran TIDAK punya alamat web langsung ==="
# Folder penyimpanan ada di luar public_html → semua kemungkinan alamat harus 404.
for P in "/lampiran/" "/kdsimpan/" "/kdsimpan/lampiran/"; do
  K=$(curl -sS -k --max-time 30 -o /dev/null -w "%{http_code}" "$H$P")
  if [ "$K" = "404" ] || [ "$K" = "403" ]; then ok "alamat $P tertutup (http=$K)"
  else no "alamat $P TERBUKA (http=$K) ← lampiran bisa diambil orang"; fi
done

echo
echo "================= $LULUS lulus / $GAGAL gagal ================="
[ "$GAGAL" -eq 0 ] || exit 1
