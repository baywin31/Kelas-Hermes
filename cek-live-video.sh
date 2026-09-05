#!/usr/bin/env bash
# cek-live-video.sh — buktikan embed video sudah aktif di hosting.
# Catatan penting: halaman materi butuh login, dan asisten tidak punya
# password akun live. Jadi yang dibuktikan di sini adalah semua bagian yang
# BISA dibuktikan dari luar: berkas penyaji sama persis dengan lokal, CSS
# video terkirim, dan halaman member tetap terlindungi.
# Bukti render sesungguhnya sudah didapat langsung DARI server saat
# _setvid.php dijalankan di sana ("render iframe : ADA").
set -u
cd "$(dirname "$0")"
T=C:/Users/user/AppData/Local/Temp
B=https://juraganprompt.biz.id/member
L=0; G=0
ok(){ echo "OK   $1"; L=$((L+1)); }
bad(){ echo "BAD  $1"; G=$((G+1)); }

echo "=== 1. style.css live memuat aturan video ==="
curl -sS -k --max-time 30 -o "$T/lv-style.css" "$B/style.css?v=7"
LOK=$(wc -c < style.css | tr -d ' ')
LIV=$(wc -c < "$T/lv-style.css" | tr -d ' ')
[ "$LOK" = "$LIV" ] && ok "ukuran sama lokal=$LOK live=$LIV" || bad "beda ukuran lokal=$LOK live=$LIV"
grep -q "video-embed" "$T/lv-style.css" && ok ".video-embed terkirim" || bad ".video-embed tidak ada"
grep -q "aspect-ratio:9/16" "$T/lv-style.css" && ok "rasio tegak 9:16 ada" || bad "rasio tegak hilang"
grep -q "video-embed" <(sed -n '/@media print/,$p' "$T/lv-style.css") \
  && ok "video disembunyikan saat cetak" || bad "video ikut kecetak"

echo
echo "=== 2. Halaman publik tetap sehat ==="
for p in index.php login.php redeem.php; do
  C=$(curl -sS -k --max-time 25 -o "$T/lv-$p.html" -w "%{http_code}" "$B/$p")
  [ "$C" = "200" ] && ok "$p -> 200" || bad "$p -> $C"
done
grep -q "style.css?v=7" "$T/lv-login.php.html" && ok "CSS versi baru dipanggil (?v=7)" || bad "masih memanggil CSS versi lama"

echo
echo "=== 1b. style.css live memuat aturan gambar ==="
grep -q "figure.gambar" "$T/lv-style.css" && ok "figure.gambar terkirim" || bad "aturan gambar tidak ada"
grep -q "height:auto" "$T/lv-style.css" && ok "gambar tidak gepeng (height:auto)" || bad "height:auto hilang"
sed -n '/@media print/,$p' "$T/lv-style.css" | grep -q "figure.gambar" \
  && ok "gambar diatur khusus saat cetak" || bad "gambar tidak diatur saat cetak"

echo
echo "=== 3. Halaman materi tetap wajib login ==="
C=$(curl -sS -k --max-time 25 -o "$T/lv-materi.html" -w "%{http_code}" "$B/materi.php?b=1")
[ "$C" = "302" ] && ok "materi.php -> 302 (tamu ditolak, benar)" || bad "materi.php -> $C (harusnya 302)"

echo
echo "=== 4. Skrip sekali-pakai tidak menginap ==="
for f in _setvid.php _setwa.php setup.php pasang.php _diag.php; do
  C=$(curl -sS -k --max-time 25 -o "$T/lv-x.html" -w "%{http_code}" "$B/$f")
  [ "$C" = "404" ] && ok "$f -> 404" || bad "$f -> $C MASIH ADA"
done

echo
echo "=== 5. Tombol WhatsApp masih hidup ==="
grep -q "wa.me/6282379813941" "$T/lv-login.php.html" && ok "nomor WA masih terpasang" || bad "nomor WA hilang"

echo
echo "-----"
echo "LULUS=$L GAGAL=$G"
[ "$G" = "0" ] || exit 1
