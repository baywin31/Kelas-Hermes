#!/usr/bin/env bash
# cek-live-kartu.sh — bukti dari server hosting bahwa tampilan kartu benar-benar
# hidup di https://juraganprompt.biz.id/member/
#
# Asisten tidak punya password akun member di hosting, jadi halaman materi tidak
# bisa dibuka langsung. Yang bisa dibuktikan dari luar:
#  - tw.css dilayani, isinya memuat aturan kartu
#  - halaman publik memanggil tw.css SETELAH style.css (urutan menentukan)
#  - app.js live memuat fungsi baru (salin kode, kerangka modul)
#  - halaman yang harus terkunci tetap terkunci
#  - skrip sekali-pakai tidak menginap
set -uo pipefail
B="https://juraganprompt.biz.id/member"
T="$LOCALAPPDATA/Temp/kd-live-kartu"
rm -rf "$T"; mkdir -p "$T"
L=0; G=0
ok(){ echo "   OK   $1"; L=$((L+1)); }
bad(){ echo "GAGAL: $1"; G=$((G+1)); }
get(){ curl -sS -k --max-time 40 -o "$2" -w "%{http_code}" "$1"; }

echo "=== 1. tw.css dilayani & isinya benar ==="
C=$(get "$B/tw.css" "$T/tw.css")
[ "$C" = "200" ] && ok "tw.css -> 200 ($(wc -c < "$T/tw.css" | tr -d ' ') byte)" || bad "tw.css -> $C"
for k in kd-sec-isi kd-callout-isi kd-ceklis kd-tabel kd-kode kd-rel-item kd-toc-gulir; do
  grep -q "$k" "$T/tw.css" && ok "aturan .$k ada di tw.css live" || bad "aturan .$k TIDAK ada di tw.css live"
done
# Sorot sudut kartu & rel langkah: dua detail yang paling menentukan kesan
# "mahal" di tangkapan layar. Dicek dari isi berkasnya, bukan dari mata.
grep -q "mask-image" "$T/tw.css" && ok "sorot sudut & tepi memudar (mask-image) terkirim" || bad "mask-image hilang dari tw.css live"

echo
echo "=== 2. Halaman memanggil tw.css setelah style.css ==="
C=$(get "$B/login.php" "$T/login.html")
[ "$C" = "200" ] && ok "login.php -> 200" || bad "login.php -> $C"
POS_S=$(grep -bo 'style.css' "$T/login.html" | head -1 | cut -d: -f1)
POS_T=$(grep -bo 'tw.css' "$T/login.html" | head -1 | cut -d: -f1)
if [ -n "${POS_S:-}" ] && [ -n "${POS_T:-}" ] && [ "$POS_T" -gt "$POS_S" ]; then
  ok "urutan benar: style.css ($POS_S) lalu tw.css ($POS_T)"
else
  bad "urutan CSS salah / tw.css tidak dipanggil (style=$POS_S tw=$POS_T)"
fi

echo
echo "=== 3. app.js live memuat fungsi baru ==="
C=$(get "$B/app.js" "$T/app.js")
[ "$C" = "200" ] && ok "app.js -> 200" || bad "app.js -> $C"
grep -q "data-salin" "$T/app.js" && ok "tombol salin kode ada" || bad "tombol salin kode hilang"
grep -q "data-kerangka" "$T/app.js" && ok "penyisip kerangka modul ada" || bad "penyisip kerangka hilang"
grep -q "data-baca-maju" "$T/app.js" && ok "bilah kemajuan baca ada" || bad "bilah kemajuan hilang"

echo
echo "=== 4. style.css live tetap versi terbaru ==="
# Versi dibaca dari _theme.php di mesin ini, bukan ditulis tetap: tiap kali
# CSS berubah nomornya naik, dan uji yang menyimpan angka lama akan gagal
# palsu.
V_S=$(grep -oE 'style\.css\?v=[0-9]+' _theme.php | head -1)
V_T=$(grep -oE 'tw\.css\?v=[0-9]+' _theme.php | head -1)
grep -q "$V_S" "$T/login.html" && ok "$V_S dipanggil" || bad "versi style.css bukan ${V_S#*=}"
grep -q "$V_T" "$T/login.html" && ok "$V_T dipanggil" || bad "versi tw.css bukan ${V_T#*=}"
C=$(get "$B/style.css" "$T/style.css")
[ "$C" = "200" ] && ok "style.css -> 200" || bad "style.css -> $C"
grep -q 'figure' "$T/style.css" && ok "aturan gambar masih ada" || bad "aturan gambar hilang"

echo
echo "=== 5. Yang harus terkunci tetap terkunci ==="
for p in dashboard.php admin.php faq.php; do
  C=$(get "$B/$p" "$T/$p.html")
  [ "$C" = "302" ] && ok "$p -> 302 (butuh login, benar)" || bad "$p -> $C (seharusnya 302)"
done

echo
echo "=== 6. Skrip sekali-pakai tidak menginap ==="
for p in _setmateri.php _setvid.php _setwa.php pasang.php _diag.php setup.php; do
  C=$(get "$B/$p" "$T/x.html")
  [ "$C" = "404" ] && ok "$p -> 404" || bad "$p -> $C (harus 404!)"
done

echo
echo "LULUS=$L GAGAL=$G"
[ "$G" -eq 0 ] || exit 1
