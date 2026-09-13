#!/usr/bin/env bash
# cek-live-tampilan.sh — buktikan lapisan tampilan-v2 benar-benar HIDUP di
# hosting, diuji dari luar (bukan dari mesin sendiri).
#
# Kenapa perlu: berkas yang terkirim belum tentu terpakai. Kalau _theme.php
# yang naik tidak memuat lapisannya, atau berkasnya tidak bisa diambil publik,
# halaman tetap 200 dan tetap "terlihat lama" — laporan "sudah live" jadi
# bohong tanpa ada satu pun error.
set -u
cd "$(dirname "$0")"
T=C:/Users/user/AppData/Local/Temp
B=https://juraganprompt.biz.id/member

lulus=0; gagal=0
ok()  { echo "OK   $1"; lulus=$((lulus+1)); }
bad() { echo "GAGAL $1"; gagal=$((gagal+1)); }

echo "=== Lapisan tampilan di hosting ==="

# 1. Berkas lapisannya bisa diambil publik dan panjangnya sama dengan lokal.
C=$(curl -sS -k --max-time 30 -o "$T/tv2.css" -w "%{http_code}" "$B/tampilan-v2.css")
LOK=$(wc -c < tampilan-v2.css | tr -d ' ')
LIV=$(wc -c < "$T/tv2.css" | tr -d ' ')
if [ "$C" = "200" ] && [ "$LOK" = "$LIV" ]; then
  ok "tampilan-v2.css terkirim utuh ($LIV byte)"
elif [ "$C" = "200" ]; then
  bad "tampilan-v2.css beda: lokal=$LOK live=$LIV"
else
  bad "tampilan-v2.css -> $C"
fi

# 2. Halaman depan benar-benar memanggil lapisannya.
C1=$(curl -sS -k --max-time 30 -o "$T/tv2-depan.html" -w "%{http_code}" "$B/index.php")
if [ "$C1" = "200" ]; then
  ok "halaman depan 200 ($(wc -c < "$T/tv2-depan.html" | tr -d ' ') byte)"
else
  bad "halaman depan -> $C1"
fi

# 3. Tautan lapisan ada di HTML, dan dimuat SETELAH style.css & tw.css.
if grep -q 'tampilan-v2.css' "$T/tv2-depan.html"; then
  ok "lapisan tampilan-v2 dipanggil halaman"
else
  bad "lapisan tampilan-v2 TIDAK dipanggil (halaman masih gaya lama)"
fi

if grep -q 'tampilan-v2.css?v=' "$T/tv2-depan.html"; then
  ok "lapisan diberi nomor versi (cache tidak nyangkut)"
else
  bad "lapisan tanpa nomor versi — perubahan bisa tidak terlihat pembeli"
fi

URUT=$(grep -oE 'style\.css\?v=[0-9]+|tw\.css\?v=[0-9]+|tampilan-v2\.css\?v=[0-9]+' "$T/tv2-depan.html" | tr '\n' ' ')
case "$URUT" in
  *style.css*v=*tw.css*v=*tampilan-v2.css*) ok "urutan benar: $URUT" ;;
  *) bad "urutan salah: $URUT" ;;
esac

# 4. Palet inti tidak boleh berubah: aksen #A4D8FF harus tetap ada.
if grep -qi 'A4D8FF' "$T/tv2.css"; then
  ok "aksen #A4D8FF masih dipakai (palet dijaga)"
else
  bad "aksen #A4D8FF hilang dari lapisan"
fi

# 5. Ukuran huruf isi materi TIDAK boleh diubah lapisan baru.
if grep -qE '\.isi-materi[^{]*\{[^}]*font-size' "$T/tv2.css"; then
  bad "lapisan menyentuh ukuran huruf isi materi (harus tidak)"
else
  ok "lapisan tidak menyentuh ukuran huruf isi materi"
fi

# 6. Halaman lain tetap hidup.
for P in login.php redeem.php; do
  C2=$(curl -sS -k --max-time 25 -o /dev/null -w "%{http_code}" "$B/$P")
  [ "$C2" = "200" ] && ok "$P tetap hidup" || bad "$P -> $C2"
done

# 7. Halaman di balik login harus tetap menolak tamu (302), bukan terbuka.
for P in dashboard.php materi.php; do
  C3=$(curl -sS -k --max-time 25 -o /dev/null -w "%{http_code}" "$B/$P")
  [ "$C3" = "302" ] && ok "$P tetap dijaga login (302)" || bad "$P -> $C3 (harus 302)"
done

echo
echo "-----"
echo "LULUS=$lulus GAGAL=$gagal"
[ "$gagal" -eq 0 ] || exit 1
