#!/usr/bin/env bash
# cek-live-warna-wa.sh — buktikan di server SUNGGUHAN (bukan lokal) bahwa
# palet baru dan tombol WhatsApp benar-benar terkirim ke pengunjung.
set -u
cd "$(dirname "$0")"
T=C:/Users/user/AppData/Local/Temp
B=https://juraganprompt.biz.id/member
N=$(date +%s)
lulus=0; gagal=0
ok(){ echo "OK   $1"; lulus=$((lulus+1)); }
bad(){ echo "BAD  $1"; gagal=$((gagal+1)); }

curl -sS -k --max-time 30 -o "$T/lv-css.txt" "$B/style.css?n=$N" 2>/dev/null
curl -sS -k --max-time 30 -o "$T/lv-login.html" "$B/login.php?n=$N" 2>/dev/null
curl -sS -k --max-time 30 -o "$T/lv-redeem.html" "$B/redeem.php?n=$N" 2>/dev/null

echo "=== 1. Palet baru sampai ke pengunjung ==="
BG=$(grep -oE '\-\-bg:#[0-9a-fA-F]{6}' "$T/lv-css.txt" | head -1)
echo "   --bg terbaca: ${BG:-<tidak ada>}"
[ "$BG" = "--bg:#25282b" ] && ok "latar sudah abu arang (bukan #08090a lama)" \
  || bad "latar masih lama: $BG"
A=$(grep -c "A4D8FF" "$T/lv-css.txt")
echo "   rujukan #A4D8FF di CSS live: $A"
[ "$A" -ge 3 ] && ok "biru langit terpasang" || bad "biru langit belum ada"
grep -q "5e6ad2\|7170ff" "$T/lv-css.txt" && bad "masih ada sisa ungu lama" \
  || ok "tidak ada sisa warna ungu lama"

echo
echo "=== 2. CSS versi baru yang dipanggil halaman ==="
V=$(grep -oE 'style\.css\?v=[0-9]+' "$T/lv-login.html" | head -1)
# Versi yang diharapkan dibaca dari _theme.php di mesin ini, bukan ditulis
# tetap: setiap kali CSS berubah nomornya naik, dan uji yang menyimpan angka
# lama akan gagal padahal servernya benar. Pernah terjadi (uji ini menuntut
# v=5 saat live sudah v=7).
VH=$(grep -oE 'style\.css\?v=[0-9]+' _theme.php | head -1)
echo "   halaman memanggil: ${V:-<tidak ada>}   diharapkan: ${VH:-<tidak terbaca>}"
[ -n "$VH" ] && [ "$V" = "$VH" ] && ok "cache-buster sesuai _theme.php ($VH)" \
  || bad "versi CSS live ($V) tidak sama dengan _theme.php ($VH)"

echo
echo "=== 3. Aturan tombol WhatsApp ada di CSS live ==="
grep -q "wa-apung" "$T/lv-css.txt" && ok "kelas .wa-apung terkirim" || bad ".wa-apung tidak ada di CSS live"
grep -q "25D366" "$T/lv-css.txt" && ok "hijau WhatsApp ada" || bad "hijau WhatsApp tidak ada"

echo
echo "=== 4. Tombol WA di halaman (tergantung nomor sudah diisi/belum) ==="
if grep -q 'class="wa-apung"' "$T/lv-login.html"; then
  ok "tombol apung MUNCUL di login.php"
  grep -oE 'wa\.me/[0-9]+' "$T/lv-login.html" | head -1 | sed 's/^/   nomor aktif: /'
  grep -q "Chat WhatsApp" "$T/lv-login.html" && ok "tautan footer WA ada" || bad "footer WA tidak ada"
  grep -q "wa\.me" "$T/lv-redeem.html" && ok "redeem.php punya jalan keluar WA" || bad "redeem.php belum ada WA"
else
  echo "   tombol belum muncul — nomor WA masih kosong di Setelan."
  ok "kode WA terpasang tapi tombol sengaja disembunyikan (nomor kosong)"
fi

echo
echo "=== 5. Berkas berbahaya sudah hilang? ==="
for F in setup.php pasang.php _diag.php _config.contoh.php; do
  K=$(curl -sS -k --max-time 20 -o "$T/lv-x.txt" -w "%{http_code}" "$B/$F" 2>/dev/null)
  if [ "$F" = "setup.php" ]; then
    [ "$K" = "404" ] && ok "setup.php sudah dihapus (404)" || bad "setup.php masih kebuka ($K) — WAJIB dihapus"
  else
    [ "$K" = "404" ] && ok "$F tidak ada (404)" || bad "$F kebuka ($K)"
  fi
done

echo
echo "-----"
echo "LULUS=$lulus GAGAL=$gagal"
