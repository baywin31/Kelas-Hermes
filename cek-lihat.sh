#!/usr/bin/env bash
# cek-lihat.sh — pastikan halaman pratinjau _lihat.php benar-benar merender
# komponen VVIP, bukan cuma balas 200.
#
# Kenapa perlu: halaman ini yang akan dilihat pemilik untuk menilai "sudah
# berubah atau belum". Kalau dia 200 tapi kartunya tidak terpasang, laporan
# "sudah live" jadi bohong.
set -u
cd "$(dirname "$0")"
T=C:/Users/user/AppData/Local/Temp
B=${1:-http://127.0.0.1:8813}
K=lihat-bd93f1a7

lulus=0; gagal=0
ok()  { echo "OK   $1"; lulus=$((lulus+1)); }
bad() { echo "GAGAL $1"; gagal=$((gagal+1)); }

C=$(curl -sS -k --max-time 30 -o "$T/cl.html" -w "%{http_code}" "$B/_lihat.php?k=$K&b=1")
[ "$C" = "200" ] && ok "halaman terbuka (200, $(wc -c < "$T/cl.html" | tr -d ' ') byte)" || bad "halaman -> $C"

# Komponen VVIP yang harus kelihatan di tangkapan layar.
for k in kd-kartu kd-sec-isi kd-callout-isi kd-ceklis kd-toc-gulir \
         kd-rel-item kd-rel-kini kd-meta kd-kode kd-salin kd-tabel; do
  N=$(grep -o "$k" "$T/cl.html" | wc -l | tr -d ' ')
  [ "$N" -gt 0 ] && ok "$k x$N" || bad "$k tidak ada"
done

# Kilau tepi atas kartu tidak punya nama kelas sendiri — dia rangkaian utility.
# Dicari lewat gradiennya, bukan lewat kelas yang tidak pernah ada.
NK=$(grep -o 'via-kd-accent/40' "$T/cl.html" | wc -l | tr -d ' ')
[ "$NK" -gt 0 ] && ok "kilau tepi atas x$NK" || bad "kilau tepi atas tidak ada"

# Kartu penenang gaptek: teal (aman) & lime (periksa) & kompas (opsional).
grep -q 'text-teal-300'  "$T/cl.html" && ok "kartu aman (teal) ada"    || bad "kartu aman hilang"
grep -q 'text-lime-300'  "$T/cl.html" && ok "kartu periksa (lime) ada" || bad "kartu periksa hilang"

# CSS harus versi terbaru, kalau tidak yang dilihat pemilik masih gaya lama.
grep -q 'style.css?v=10' "$T/cl.html" && ok "style.css?v=10 dipanggil" || bad "style.css bukan v=10"
grep -q 'tw.css?v=2'    "$T/cl.html" && ok "tw.css?v=2 dipanggil"    || bad "tw.css tidak dipanggil"

# Pratinjau tidak boleh menyentuh data member.
grep -q 'data-catatan-bagian' "$T/cl.html" && bad "catatan pribadi ikut muncul (harus tidak)" || ok "tanpa catatan pribadi"
grep -q 'Tandai Bagian ini selesai' "$T/cl.html" && bad "tombol progres ikut muncul" || ok "tanpa tombol progres"

# Pagar markdown tidak boleh bocor sebagai teks mentah.
SISA=$(grep -c '^:::' "$T/cl.html" || true)
[ "$SISA" = "0" ] && ok "tidak ada pagar ::: mentah" || bad "ada $SISA pagar ::: mentah"

# Kunci salah harus 404, bukan halaman materi.
C2=$(curl -sS -k --max-time 25 -o "$T/cl2.html" -w "%{http_code}" "$B/_lihat.php?k=salah")
[ "$C2" = "404" ] && ok "kunci salah -> 404" || bad "kunci salah -> $C2 (materi bisa dibaca tanpa kunci!)"

echo
echo "-----"
echo "LULUS=$lulus GAGAL=$gagal"
[ "$gagal" -eq 0 ] || exit 1
