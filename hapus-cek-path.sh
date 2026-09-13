#!/usr/bin/env bash
# hapus-cek-path.sh — cabut SEMUA berkas sekali-pakai dari hosting.
#
# Kenapa wajib: setiap berkas di daftar ini bisa mengubah isi tabel skills
# (daftar paket berbayar) atau membocorkan peta folder hosting — semuanya
# hanya dijaga kunci yang tertulis di URL. Kunci di URL bukan pengamanan.
# Sesudah dipakai, berkasnya harus hilang; skrip ini memverifikasi hasilnya
# lewat HTTP, bukan cuma percaya balasan FTP.
set -u
cd "$(dirname "$0")"
T=C:/Users/user/AppData/Local/Temp

FTP=$(tr -d '\r\n' < .ftp2)
FU=${FTP%%:*}
FP=${FTP#*:}
H=juraganprompt.biz.id
TUJUAN=/member

DAFTAR="_pasang-skill.php _sync-skill.php _cek-path.php _pindah-skill.php daftarkan-skill.php"

echo "=== Cabut dari hosting ==="
for F in $DAFTAR; do
  printf '   %-24s ' "$F"
  # Server ini menolak "DEL"; "DELE <jalur lengkap>" yang diterima.
  if curl -sS -k --ssl-reqd --max-time 60 -u "$FU:$FP" \
       -Q "DELE $TUJUAN/$F" "ftp://$H/" -o "$T/hcp.txt" 2>"$T/hcp-e.txt"; then
    echo "dicabut"
  else
    echo "FTP: $(head -1 "$T/hcp-e.txt" | cut -c1-40)"
  fi
done

echo
echo "=== Verifikasi lewat HTTP (harus 404) ==="
gagal=0
for F in $DAFTAR; do
  KODE=$(curl -sS -k --max-time 30 -o /dev/null -w "%{http_code}" "https://$H$TUJUAN/$F")
  if [ "$KODE" = "404" ]; then
    echo "   $F → 404 (aman)"
  else
    echo "   $F → $KODE  ← MASIH ADA, cabut manual dari File Manager cPanel"; gagal=$((gagal+1))
  fi
done
[ "$gagal" -eq 0 ] || exit 1
