#!/usr/bin/env bash
# uji-kartu.sh — uji tampilan kartu (Tailwind) di mode PHP lewat HTTP nyata.
#
# Yang dipastikan:
#  - tw.css benar-benar dilayani server dan dipanggil halaman
#  - setiap "##" jadi kartu section bernomor, "###" jadi sub-kartu
#  - penanda :::tips ... ::: jadi kartu callout, dan pagarnya TIDAK terbaca
#    sebagai teks oleh pembaca
#  - tabel markdown jadi <table>, bukan paragraf penuh tanda pipa
#  - checklist "- [ ]" jadi kotak centang
#  - blok kode dapat tombol Salin
#  - versi cetak TIDAK memakai kartu (di kertas kartu cuma buang tempat)
#  - HTML mentah dari admin tetap tidak dieksekusi
set -u
cd "$(dirname "$0")"
T=C:/Users/user/AppData/Local/Temp
B=http://127.0.0.1:8813
J="$T/uk-cookie.txt"
lulus=0; gagal=0
ok(){ echo "OK   $1"; lulus=$((lulus+1)); }
bad(){ echo "BAD  $1"; gagal=$((gagal+1)); }

echo "### 1. tw.css dilayani dan berisi kelas yang dipakai"
curl -sS --max-time 20 -o "$T/uk-tw.css" "$B/tw.css" 2>/dev/null
UK=$(wc -c < "$T/uk-tw.css" | tr -d ' ')
[ "$UK" -gt 8000 ] && ok "tw.css terkirim ($UK byte)" || bad "tw.css kosong/kecil ($UK byte)"
for k in "kd-sec-isi" "kd-callout-isi" "kd-ceklis" "shadow-kd"; do
  grep -qF "$k" "$T/uk-tw.css" && ok "kelas $k ada di tw.css" || bad "kelas $k HILANG dari tw.css"
done
# Kalau preflight ikut terkompilasi, reset globalnya akan menimpa style.css.
grep -q '\*,::before,::after{box-sizing:border-box' "$T/uk-tw.css" \
  && bad "preflight Tailwind ikut terbawa (akan menimpa style.css)" \
  || ok "preflight tidak ikut (style.css aman)"

echo
echo "### 2. Login member lalu pasang materi contoh"
curl -sS --max-time 20 -o /dev/null "$B/_uji_ratereset.php" 2>/dev/null
curl -sS --max-time 20 -o "$T/uk-akun.txt" "$B/_uji_akun.php" 2>/dev/null
curl -sS --max-time 25 -o "$T/uk-set.txt" "$B/_uji_setkartu.php?b=2" 2>/dev/null
grep -q "OK" "$T/uk-set.txt" && ok "materi contoh dipasang ke Bagian 2" \
  || { bad "gagal memasang materi contoh"; sed 's/^/     /' "$T/uk-set.txt" | head -5; }

rm -f "$J"
curl -sS --max-time 20 -c "$J" -o "$T/uk-login.html" "$B/login.php" >/dev/null 2>&1
TOK=$(grep -oE 'name="csrf" value="[^"]+' "$T/uk-login.html" | head -1 | sed 's/.*value="//')
curl -sS --max-time 20 -b "$J" -c "$J" -o "$T/uk-post.html" \
  --data-urlencode "csrf=$TOK" --data-urlencode "email=budi@demo.id" \
  --data-urlencode "password=demo12345" "$B/login.php" >/dev/null 2>&1
curl -sS --max-time 20 -b "$J" -o "$T/uk-materi.html" "$B/materi.php?b=2" 2>/dev/null
grep -q 'class="isi-materi"' "$T/uk-materi.html" \
  && ok "halaman materi terbuka" || { bad "gagal buka materi (login gagal?)"; }

echo
echo "### 3. Halaman memuat tw.css"
grep -q 'href="tw.css' "$T/uk-materi.html" && ok "tw.css dipanggil halaman" || bad "tw.css tidak dipanggil"
# Urutan penting: style.css dulu, tw.css sesudahnya.
POS_S=$(grep -bo 'style.css' "$T/uk-materi.html" | head -1 | cut -d: -f1)
POS_T=$(grep -bo 'tw.css' "$T/uk-materi.html" | head -1 | cut -d: -f1)
if [ -n "$POS_S" ] && [ -n "$POS_T" ] && [ "$POS_T" -gt "$POS_S" ]; then
  ok "tw.css dimuat setelah style.css (urutan menimpa benar)"
else
  bad "urutan CSS salah (style=$POS_S tw=$POS_T)"
fi

echo
echo "### 4. Kartu section & sub-kartu terbentuk"
N_SEC=$(grep -o 'class="[^"]*kd-sec ' "$T/uk-materi.html" | wc -l | tr -d ' ')
[ "$N_SEC" -ge 2 ] && ok "ada $N_SEC kartu section" || bad "kartu section kurang (dapat $N_SEC)"
grep -q 'kd-sub ' "$T/uk-materi.html" && ok "sub-kartu (###) terbentuk" || bad "sub-kartu tidak ada"
grep -q '>01<' "$T/uk-materi.html" && ok "nomor urut section tampil" || bad "nomor urut tidak tampil"
grep -q 'kd-sec-judul' "$T/uk-materi.html" && ok "judul section pakai kelas kartu" || bad "judul section polos"
# Anchor daftar isi harus tetap jalan meski heading pindah ke dalam kartu.
grep -q 'id="apa-yang-kita-kerjakan\|id="langkah' "$T/uk-materi.html" \
  && ok "id anchor heading tetap ada (daftar isi jalan)" || bad "id anchor hilang"

echo
echo "### 5. Callout ::: jadi kartu, pagarnya tidak terbaca"
grep -q 'kd-callout' "$T/uk-materi.html" && ok "kartu callout terbentuk" || bad "callout tidak terbentuk"
grep -qE '^[^<]*:::' "$T/uk-materi.html" \
  && bad "pagar ::: masih terbaca pembaca" || ok "pagar ::: sudah jadi kartu"
grep -q 'HATI-HATI\|Hati-hati' "$T/uk-materi.html" \
  && ok "judul bawaan callout terisi" || bad "judul callout kosong"

echo
echo "### 6. Tabel, checklist, tombol salin"
grep -q '<table' "$T/uk-materi.html" && ok "tabel jadi <table>" || bad "tabel tidak dirender"
grep -q 'kd-tabel' "$T/uk-materi.html" && ok "tabel dapat kelas kartu" || bad "tabel polos"
grep -q 'overflow-x-auto' "$T/uk-materi.html" && ok "tabel bisa digeser di ponsel" || bad "tabel bisa merusak lebar halaman"
grep -q 'kd-cek' "$T/uk-materi.html" && ok "checklist jadi kotak centang" || bad "checklist tidak dirender"
grep -qE '<li[^>]*>\[[ x]\]' "$T/uk-materi.html" \
  && bad "penanda [ ] masih mentah" || ok "penanda [ ] sudah jadi ikon"
grep -q 'kd-salin' "$T/uk-materi.html" && ok "tombol Salin ada di blok kode" || bad "tombol Salin tidak ada"
grep -q 'BLOCK0' "$T/uk-materi.html" && bad "penanda blok bocor sebagai teks" || ok "tidak ada kebocoran BLOCK0"

echo
echo "### 7. Bilah kepala Bagian"
grep -q 'menit baca' "$T/uk-materi.html" && ok "perkiraan waktu baca tampil" || bad "waktu baca tidak tampil"
grep -qE 'Bagian 2 dari [0-9]' "$T/uk-materi.html" && ok "posisi 'Bagian x dari y' tampil" || bad "posisi Bagian tidak tampil"

echo
echo "### 8. HTML mentah dari admin tetap mati"
grep -q '<script>alert' "$T/uk-materi.html" \
  && bad "HTML mentah dari materi DIEKSEKUSI (bahaya)" || ok "HTML mentah tetap tidak dieksekusi"
grep -q '&lt;script&gt;alert' "$T/uk-materi.html" \
  && ok "tag script tampil sebagai teks (ter-escape)" || bad "teks script tidak ditemukan — cek materi contoh"

echo
echo "### 9. Versi cetak TIDAK memakai kartu"
curl -sS --max-time 20 -b "$J" -o "$T/uk-cetak.html" "$B/cetak.php?b=2" 2>/dev/null
grep -q 'kd-sec ' "$T/uk-cetak.html" \
  && bad "kartu ikut ke versi cetak (buang tempat di kertas)" || ok "versi cetak datar (tanpa kartu)"
grep -q 'kd-salin' "$T/uk-cetak.html" \
  && bad "tombol Salin ikut tercetak" || ok "tombol Salin tidak ikut tercetak"
grep -q '<table' "$T/uk-cetak.html" && ok "tabel tetap tercetak" || bad "tabel hilang di versi cetak"
grep -q '&#9744;\|☐\|&#9745;\|☑' "$T/uk-cetak.html" \
  && ok "checklist tercetak sebagai kotak" || bad "checklist tidak terbaca di kertas"

echo
echo "### 10. Pencarian tidak menampilkan pagar :::"
curl -sS --max-time 20 -b "$J" -o "$T/uk-cari.html" "$B/cari.php?q=Hermes" 2>/dev/null
grep -qE '>[^<]*:::' "$T/uk-cari.html" \
  && bad "pagar ::: bocor ke kutipan pencarian" || ok "kutipan pencarian bersih"

echo
echo "-----"
echo "LULUS=$lulus GAGAL=$gagal"
[ "$gagal" -eq 0 ] || exit 1
