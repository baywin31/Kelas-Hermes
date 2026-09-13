#!/usr/bin/env bash
# cek-live-skill.sh — pastikan fitur unduhan skill benar-benar hidup di hosting.
#
# Kenapa diuji dari luar, bukan dipercaya dari laporan FTP: yang paling penting
# di fitur ini adalah PAKET TIDAK BISA DIAMBIL TANPA LOGIN. Kalau .htaccess
# gagal naik atau salah tulis, paket berbayar bocor dan tidak ada satu pun pesan
# error yang muncul. Hanya permintaan HTTP sungguhan yang bisa membuktikannya.
set -u
cd "$(dirname "$0")"
T=C:/Users/user/AppData/Local/Temp
H=https://juraganprompt.biz.id/member

lulus=0; gagal=0
ok() { echo "  LULUS  $1"; lulus=$((lulus+1)); }
no() { echo "  GAGAL  $1"; gagal=$((gagal+1)); }

echo "=== 1. Halaman member baru ada & dijaga login ==="
for P in skill.php unduh.php; do
  K=$(curl -sS -k --max-time 30 -o /dev/null -w "%{http_code}" "$H/$P")
  [ "$K" = "302" ] && ok "$P tanpa login → 302" || no "$P tanpa login → $K (harus 302)"
done

# Halaman admin harus menolak tamu juga (302 ke login), bukan menampilkan isi.
K=$(curl -sS -k --max-time 30 -o /dev/null -w "%{http_code}" "$H/admin_skill.php")
[ "$K" = "302" ] && ok "admin_skill.php tanpa login → 302" || no "admin_skill.php tanpa login → $K"

echo
echo "=== 2. Paket TIDAK bisa diambil langsung (ini yang paling penting) ==="
# Nama berkas dibaca dari DAFTAR LOKAL, bukan dari folder server — justru
# karena folder server tidak boleh bisa didaftar isinya oleh orang luar.
BOCOR=0; DIPERIKSA=0
for Z in unduhan/*.zip "$(cygpath -m "$HOME/kdsimpan" 2>/dev/null || echo "$HOME/kdsimpan")"/*.zip; do
  [ -f "$Z" ] || continue
  B=$(basename "$Z"); DIPERIKSA=$((DIPERIKSA+1))
  K=$(curl -sS -k --max-time 30 -o "$T/cl-$B" -w "%{http_code}" "$H/unduhan/$B")
  if [ "$K" = "403" ] || [ "$K" = "404" ]; then
    ok "unduhan/$B ditolak (HTTP $K)"
  else
    # Apache kadang menjawab 200 dengan halaman error HTML. Kebocoran
    # sungguhan hanya kalau isinya benar-benar arsip zip (diawali "PK").
    KEPALA=$(head -c 2 "$T/cl-$B" 2>/dev/null)
    if [ "$KEPALA" = "PK" ]; then
      no "unduhan/$B BISA DIAMBIL TANPA LOGIN (HTTP $K) — paket bocor!"; BOCOR=$((BOCOR+1))
    else
      ok "unduhan/$B tidak mengirim zip (HTTP $K, isi bukan arsip)"
    fi
  fi
done
[ "$DIPERIKSA" -gt 0 ] && ok "ada $DIPERIKSA paket yang diperiksa" || no "tidak ada paket untuk diperiksa"

# Folder penyimpanan yang sebenarnya dipakai ada DI LUAR public_html: tidak
# punya alamat web sama sekali. Diuji supaya kalau suatu saat folder itu pindah
# ke dalam public_html, kebocorannya langsung ketahuan.
K=$(curl -sS -k --max-time 30 -o /dev/null -w "%{http_code}" "https://juraganprompt.biz.id/kdsimpan/")
[ "$K" = "404" ] && ok "folder penyimpanan di luar public_html tidak beralamat web (404)" \
                 || no "kdsimpan/ terjawab HTTP $K — periksa apakah ada di dalam public_html"
[ "$BOCOR" -eq 0 ] || echo "     ⚠ $BOCOR paket bocor — perbaiki SEKARANG"

echo
echo "=== 3. Daftar folder dimatikan ==="
K=$(curl -sS -k --max-time 30 -o "$T/cl-dir.txt" -w "%{http_code}" "$H/unduhan/")
if grep -qE 'href="[^"]*\.zip"' "$T/cl-dir.txt" 2>/dev/null; then
  no "daftar isi folder unduhan/ terbuka — nama paket bisa dipanen"
else
  ok "daftar isi folder unduhan/ tidak membocorkan nama berkas (HTTP $K)"
fi

echo
echo "=== 4. Berkas pendukung terlayani ==="
for F in _skill.php skill.php unduh.php admin_skill.php; do
  K=$(curl -sS -k --max-time 30 -o /dev/null -w "%{http_code}" "$H/$F")
  # Berkas PHP yang benar terpasang menjawab 200 (izinkan 302 utk yang butuh login).
  [ "$K" = "200" ] || [ "$K" = "302" ] || [ "$K" = "403" ] && ok "$F terjawab (HTTP $K)" || no "$F → $K"
done
SIZE=$(curl -sS -k --max-time 40 -o "$T/cl-style.css" -w "%{size_download}" "$H/style.css?nocache=$(date +%s%N)")
LOKAL=$(wc -c < style.css | tr -d ' ')
[ "$SIZE" = "$LOKAL" ] && ok "style.css terbaru terlayani ($SIZE b)" || no "style.css beda: web=$SIZE lokal=$LOKAL"
grep -q "\.pill{" "$T/cl-style.css" && ok "gaya .pill sudah ikut terkirim" || no "gaya .pill belum ada di hosting"

echo
echo "=== 5. Berkas sekali-pakai sudah dicabut ==="
for F in _pasang-skill.php daftarkan-skill.php; do
  K=$(curl -sS -k --max-time 30 -o /dev/null -w "%{http_code}" "$H/$F")
  [ "$K" = "404" ] && ok "$F sudah tidak ada" || no "$F MASIH ada (HTTP $K) — cabut sekarang"
done

echo
echo "LULUS=$lulus GAGAL=$gagal"
[ "$gagal" -eq 0 ] || exit 1
