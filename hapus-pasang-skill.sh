#!/usr/bin/env bash
# hapus-pasang-skill.sh — cabut berkas sekali-pakai dari hosting.
#
# Kenapa wajib: _pasang-skill.php dan _sync-skill.php bisa mengubah daftar
# paket skill hanya dengan kunci di URL. Kunci di URL bukan pengamanan — cukup
# sekali bocor (riwayat peramban, tangkapan layar, log server) dan orang lain
# bisa mengacak daftar paket berbayar. Setelah dipakai, berkasnya harus hilang.
#
# Cara kerja: FTP DELE lewat -Q, satu perintah per berkas. Memakai -Q (bukan
# perintah FTP biasa) karena server ini menolak "DEL" tanpa jalur lengkap.
set -u
cd "$(dirname "$0")"
T=C:/Users/user/AppData/Local/Temp

FTP=$(tr -d '\r\n' < .ftp2)
FU=${FTP%%:*}
FP=${FTP#*:}
H=juraganprompt.biz.id
TUJUAN=/member

for F in _pasang-skill.php _sync-skill.php daftarkan-skill.php; do
  printf '   %-24s ' "$F"
  if curl -sS -k --ssl-reqd --max-time 60 -u "$FU:$FP" \
       -Q "DELE $TUJUAN/$F" "ftp://$H/" -o "$T/hp.txt" 2>"$T/hp-e.txt"; then
    echo "dicabut"
  else
    echo "FTP: $(head -1 "$T/hp-e.txt" | cut -c1-42)"
  fi
done

echo
echo "=== Cek hasil (harus 404 semua) ==="
gagal=0
for F in _pasang-skill.php _sync-skill.php daftarkan-skill.php; do
  KODE=$(curl -sS -k --max-time 30 -o /dev/null -w "%{http_code}" "https://$H$TUJUAN/$F")
  if [ "$KODE" = "404" ]; then
    echo "   $F → 404 (aman)"
  else
    echo "   $F → $KODE  ← MASIH ADA, cabut manual dari File Manager cPanel"; gagal=$((gagal+1))
  fi
done
[ "$gagal" -eq 0 ] || exit 1
