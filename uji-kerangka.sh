#!/usr/bin/env bash
# uji-kerangka.sh — uji tombol "Sisipkan kerangka modul" di panel admin,
# lewat HTTP nyata sebagai admin.
#
# Yang dipastikan:
#  - kerangkanya benar-benar terkirim ke halaman (bukan cuma ada di PHP)
#  - kerangka utuh: baris barunya tidak hilang, pagar ::: masih ada
#  - kerangka melewati md_to_html() menghasilkan semua kartu yang dijanjikan
#  - JS penyisip ada, dan tidak menimpa isi yang sudah ada
set -uo pipefail

B="http://127.0.0.1:8813"
T="$LOCALAPPDATA/Temp/kd-uji-kerangka"
rm -rf "$T"; mkdir -p "$T"
L=0; G=0
ok()  { L=$((L+1)); echo "OK   $1"; }
bad() { G=$((G+1)); echo "GAGAL $1"; }

curl -sS --max-time 20 -o "$T/rate.txt" "$B/_uji_ratereset.php" 2>/dev/null
# Akun admin uji dipastikan ada + password diketahui. Tanpa ini, uji gagal
# dengan pesan yang menyesatkan (semua "tidak ada") padahal cuma tidak masuk.
curl -sS --max-time 20 -o "$T/akun.txt" "$B/_uji_akun.php" 2>/dev/null

echo "### 1. Login admin"
CJ="$T/cookie.txt"
curl -sS --max-time 20 -c "$CJ" -o "$T/login.html" "$B/login.php"
CSRF=$(grep -o 'name="csrf" value="[^"]*"' "$T/login.html" | head -1 | sed 's/.*value="//;s/"//')
curl -sS --max-time 25 -b "$CJ" -c "$CJ" -o "$T/post.html" \
  -d "csrf=$CSRF" -d "email=admin@demo.id" -d "password=demo12345" "$B/login.php"
curl -sS --max-time 20 -b "$CJ" -c "$CJ" -o "$T/panel.html" "$B/admin.php"
grep -qi "Panel Admin\|panel admin" "$T/panel.html" && ok "login admin berhasil" || bad "login admin gagal"

echo
echo "### 2. Kerangka terkirim utuh ke editor"
curl -sS --max-time 25 -b "$CJ" -c "$CJ" -o "$T/edit.html" "$B/admin_materi.php?b=9"
grep -q 'id="kerangka-modul"' "$T/edit.html" && ok "wadah kerangka ada di halaman" || bad "wadah kerangka tidak ada"
grep -q 'data-kerangka="isi_md"' "$T/edit.html" && ok "tombol sisip kerangka ada" || bad "tombol sisip tidak ada"

# Pagar ::: di dalam textarea tersembunyi WAJIB masih ada — kalau hilang,
# berarti kerangkanya rusak sebelum sampai ke admin.
grep -q ':::cerita' "$T/edit.html" && ok "pagar :::cerita utuh" || bad "pagar :::cerita hilang"
grep -q ':::hasil'  "$T/edit.html" && ok "pagar :::hasil utuh"  || bad "pagar :::hasil hilang"
grep -q -- '- \[ \]' "$T/edit.html" && ok "checklist kerangka utuh" || bad "checklist kerangka hilang"
grep -q '@video' "$T/edit.html" && ok "contoh @video ada di kerangka" || bad "contoh @video hilang"

echo
echo "### 3. Petunjuk kartu warna tampil untuk admin"
for J in cerita hasil tips awas salah insight catat waktu; do
  grep -q ">$J<" "$T/edit.html" && ok "petunjuk jenis '$J' tampil" || bad "petunjuk jenis '$J' tidak ada"
done

echo
echo "### 4. JS penyisip kerangka ada dan tidak menimpa"
curl -sS --max-time 20 -o "$T/app.js" "$B/app.js"
grep -q 'data-kerangka' "$T/app.js" && ok "JS penyisip terkirim" || bad "JS penyisip tidak ada"
grep -q "kerangka-modul" "$T/app.js" && ok "JS membaca wadah kerangka" || bad "JS tidak membaca wadah"
# Bukti tidak menimpa: ada cabang yang menyambung isi lama dengan '\n\n'.
grep -q "ta.value.replace" "$T/app.js" && ok "isi lama disambung, bukan ditimpa" || bad "isi lama bisa tertimpa"

echo
echo "### 5. Kerangka melewati pratinjau menghasilkan semua kartu"
# Pratinjau memakai md_to_html() yang sama dengan halaman member, jadi ini
# menguji kerangkanya benar-benar merender — bukan sekadar teks yang rapi.
#
# PENTING: kerangkanya dikirim DARI BERKAS (isi_md@berkas), bukan dari variabel
# shell. Isi multi-baris yang dititipkan ke variabel lalu diserahkan ke curl
# (program Windows asli, bukan bawaan bash) sampai di server dalam keadaan
# KOSONG — dan halaman tetap balas 200 tanpa pesan error, jadi gejalanya
# menyesatkan: semua pemeriksaan gagal seolah fiturnya rusak.
C:/Users/user/tools/php83/php.exe -r 'require "_komponen.php"; file_put_contents($argv[1], komp_kerangka_modul());' "$T/ker.txt"
wc -c < "$T/ker.txt" | grep -qE '[0-9]{4}' && ok "kerangka tertulis ke berkas uji" || bad "kerangka gagal ditulis"

CSRF2=$(grep -o 'name="csrf" value="[^"]*"' "$T/edit.html" | head -1 | sed 's/.*value="//;s/"//')
curl -sS --max-time 25 -b "$CJ" -c "$CJ" -o "$T/prev.html" \
  --data-urlencode "csrf=$CSRF2" \
  --data-urlencode "aksi=pratinjau" \
  --data-urlencode "urutan=9" \
  --data-urlencode "judul=Uji kerangka" \
  --data-urlencode "ringkas=uji" \
  --data-urlencode "isi_md@$T/ker.txt" \
  "$B/admin_materi.php"

grep -q "Belum disimpan" "$T/prev.html" && ok "pratinjau terbuka" || bad "pratinjau tidak terbuka"
grep -q "kd-sec" "$T/prev.html" && ok "kartu section terbentuk dari kerangka" || bad "kartu section tidak terbentuk"
grep -q "kd-sub" "$T/prev.html" && ok "sub-kartu terbentuk dari kerangka" || bad "sub-kartu tidak terbentuk"
grep -q "kd-cek" "$T/prev.html" && ok "checklist jadi kotak centang" || bad "checklist tidak terbentuk"
grep -q "kd-tabel" "$T/prev.html" && ok "tabel terbentuk" || bad "tabel tidak terbentuk"
grep -q "kd-salin" "$T/prev.html" && ok "blok kode punya tombol Salin" || bad "tombol Salin tidak ada"
grep -q "youtube-nocookie" "$T/prev.html" && ok "contoh video ikut ter-render" || bad "video kerangka tidak ter-render"

# Delapan jenis callout harus semuanya muncul minimal sekali di kerangka.
for W in text-kd-accent text-amber-300 text-violet-300 text-emerald-300 text-rose-300; do
  grep -q "$W" "$T/prev.html" && ok "warna callout $W dipakai" || bad "warna callout $W tidak muncul"
done

# Dan tidak boleh ada pagar yang lolos jadi teks di hasil render.
# Dicari HANYA di dalam blok pratinjau: halaman ini juga memuat editor
# (textarea berisi markdown mentah) dan petunjuk yang memang menampilkan ":::"
# sebagai contoh — keduanya wajar dan bukan kebocoran.
sed -n '/Belum disimpan/,$p' "$T/prev.html" > "$T/prev-isi.html"
if grep -qE '(^|>)[[:space:]]*:::' "$T/prev-isi.html"; then bad "pagar ::: bocor di pratinjau"; else ok "tidak ada pagar ::: yang bocor"; fi

echo
echo "-----"
echo "LULUS=$L GAGAL=$G"
[ "$G" = "0" ] || exit 1
